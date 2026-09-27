/**
 * Campus Connect's Photon Spectrum agent.
 * Sends login / reset codes over iMessage and can confirm a code if the student replies.
 *
 * Credentials (from the Photon dashboard):
 *   SPECTRUM_PROJECT_ID
 *   SPECTRUM_PROJECT_SECRET
 *   SPECTRUM_WEBHOOK_SECRET (optional, for inbound webhooks)
 */

import { loadEnvFiles } from "./load-env.js";

loadEnvFiles();

function phoneDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function toE164(phone) {
  const digits = phoneDigits(phone);
  if (!digits) return '';
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (String(phone).trim().startsWith('+')) return `+${digits}`;
  return `+${digits}`;
}

export function spectrumConfigured() {
  return Boolean(process.env.SPECTRUM_PROJECT_ID && process.env.SPECTRUM_PROJECT_SECRET);
}

function spectrumAuthHeader() {
  const id = process.env.SPECTRUM_PROJECT_ID;
  const secret = process.env.SPECTRUM_PROJECT_SECRET;
  if (!id || !secret) return '';
  return `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;
}

let appPromise = null;
let inboundHandler = null;
let pendingCodeLookup = null;
let listening = false;

export function setInboundHandler(handler) {
  inboundHandler = handler;
}

export function setPendingCodeLookup(handler) {
  pendingCodeLookup = handler;
}

export async function getSpectrumApp() {
  if (!spectrumConfigured()) return null;
  if (appPromise) return appPromise;
  appPromise = (async () => {
    const { Spectrum } = await import('spectrum-ts');
    const { imessage } = await import('spectrum-ts/providers/imessage');
    const app = await Spectrum({
      projectId: process.env.SPECTRUM_PROJECT_ID,
      projectSecret: process.env.SPECTRUM_PROJECT_SECRET,
      webhookSecret: process.env.SPECTRUM_WEBHOOK_SECRET,
      providers: [imessage.config()],
    });
    console.log('Photon Spectrum iMessage agent is connected.');
    return app;
  })().catch((error) => {
    appPromise = null;
    console.error('Photon Spectrum failed to start:', error.message);
    return null;
  });
  return appPromise;
}

function purposeCopy(purpose) {
  return purpose === 'login_2fa' ? 'sign-in' : 'password reset';
}

function samePhone(left, right) {
  const a = phoneDigits(left);
  const b = phoneDigits(right);
  if (!a || !b) return false;
  return a === b || a.slice(-10) === b.slice(-10);
}

export async function lookupPhotonUser(phone) {
  if (!spectrumConfigured()) return null;
  const address = toE164(phone);
  if (!address) return null;
  const projectId = process.env.SPECTRUM_PROJECT_ID;
  const response = await fetch(
    `https://spectrum.photon.codes/projects/${projectId}/users/?search=${encodeURIComponent(address)}`,
    { headers: { Authorization: spectrumAuthHeader() } },
  );
  if (!response.ok) {
    console.error('Photon users lookup failed:', response.status, await response.text());
    return null;
  }
  const body = await response.json();
  const users = body?.data?.users ?? [];
  return users.find((user) => samePhone(user.phoneNumber, address)) ?? null;
}

export async function ensurePhotonUser(phone, name) {
  const existing = await lookupPhotonUser(phone);
  if (existing) return existing;
  const address = toE164(phone);
  if (!address || !spectrumConfigured()) return null;
  const firstName = name ? String(name).split(' ')[0] : undefined;
  const projectId = process.env.SPECTRUM_PROJECT_ID;
  const response = await fetch(`https://spectrum.photon.codes/projects/${projectId}/users/`, {
    method: 'POST',
    headers: {
      Authorization: spectrumAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'shared', phoneNumber: address, firstName: firstName || null }),
  });
  if (!response.ok) {
    console.error('Photon user create failed:', response.status, await response.text());
    return null;
  }
  const body = await response.json();
  return body?.data ?? null;
}

function lineLinkFor(user, message = 'Send me my Campus Connect code') {
  if (user?.id) {
    return `https://spectrum.photon.codes/users/${user.id}/redirect?msg=${encodeURIComponent(message)}`;
  }
  if (user?.assignedPhoneNumber) {
    return `sms:${user.assignedPhoneNumber}&body=${encodeURIComponent(message)}`;
  }
  return undefined;
}

export async function sendSpectrumCode(phone, code, purpose, name) {
  const app = await getSpectrumApp();
  if (!app) return { delivered: false, channel: 'demo' };

  const photonUser = await ensurePhotonUser(phone, name).catch((error) => {
    console.error('Photon user ensure failed:', error.message);
    return null;
  });
  const assignedLine = photonUser?.assignedPhoneNumber;
  const extras = {
    assignedLine,
    photonUserId: photonUser?.id,
    lineLink: lineLinkFor(photonUser),
  };

  try {
    const { imessage } = await import('spectrum-ts/providers/imessage');
    const im = imessage(app);
    const address = toE164(phone);
    const user = await im.user(address);
    const space = await im.space.create(user);
    const first = name ? `${String(name).split(' ')[0]}, ` : '';
    const kind = purposeCopy(purpose);
    await space.send(
      `${first}it's Campus Connect. Your ${kind} code is ${code}. It expires in 10 minutes — reply with the code here or enter it in the app.`,
    );
    return { delivered: true, channel: 'imessage', ...extras };
  } catch (error) {
    console.error('Photon Spectrum could not send a code:', error.message);
    return { delivered: false, channel: 'demo', sendError: error.message, ...extras };
  }
}

export async function sendSpectrumWelcome(phone, name) {
  const app = await getSpectrumApp();
  if (!app) return false;
  await ensurePhotonUser(phone, name).catch(() => null);
  try {
    const { imessage } = await import('spectrum-ts/providers/imessage');
    const im = imessage(app);
    const user = await im.user(toE164(phone));
    const space = await im.space.create(user);
    const first = name ? `${String(name).split(' ')[0]}` : 'there';
    await space.send(
      `Hey ${first} — Campus Connect here. I'll iMessage you a code whenever you sign in or reset your password. Reply anytime if you need a hand.`,
    );
    return true;
  } catch (error) {
    console.error('Photon welcome iMessage failed:', error.message);
    return false;
  }
}

export async function handleSpectrumMessage(space, message) {
  if (message.direction !== 'inbound') return;
  if (message.content?.type !== 'text') return;
  const text = String(message.content.text ?? '').trim();
  const from = message.sender?.id ?? message.sender?.address ?? '';
  const codeMatch = text.match(/\b(\d{6})\b/);

  if (codeMatch && inboundHandler) {
    const result = inboundHandler({ phone: from, code: codeMatch[1], text });
    if (result === 'verified') {
      await space.send("Got it — you're verified. Finish up in Campus Connect.");
      return;
    }
    if (result === 'unknown' && !pendingCodeLookup) {
      await space.send("I couldn't match that code. Request a new one in Campus Connect and try again.");
      return;
    }
  }

  const pending = pendingCodeLookup?.({ phone: from });
  if (pending?.code) {
    const kind = pending.kind || 'Campus Connect';
    await space.send(
      `It's Campus Connect. Your ${kind} code is ${pending.code}. It expires in 10 minutes — enter it in the app, or reply with it here.`,
    );
    return;
  }

  if (/\b(reset|password|code|sign ?in|login|verify|2fa|help)\b/i.test(text)) {
    await space.send(
      "I send Campus Connect sign-in and password-reset codes over iMessage. Open the app, then reply here and I'll text you the code.",
    );
    return;
  }

  await space.send(
    "Campus Connect here. I live in this chat for sign-in and password-reset codes. Open the app, then reply here for a code.",
  );
}

export async function listenSpectrumMessages() {
  if (listening) return;
  const app = await getSpectrumApp();
  if (!app?.messages) return;
  listening = true;
  (async () => {
    try {
      for await (const [space, message] of app.messages) {
        try {
          await handleSpectrumMessage(space, message);
        } catch (error) {
          console.error('Photon inbound handler failed:', error.message);
        }
      }
    } catch (error) {
      listening = false;
      console.error('Photon inbound stream closed:', error.message);
    }
  })();
}

export async function handleSpectrumWebhook(body, headers) {
  const app = await getSpectrumApp();
  if (!app) return { status: 503, headers: {}, body: Buffer.from('Spectrum is not configured') };
  return app.webhook({ body, headers }, handleSpectrumMessage);
}
