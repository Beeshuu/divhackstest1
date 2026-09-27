/**
 * Campus Connect's Photon Spectrum agent.
 * Sends login / reset codes over iMessage and can confirm a code if the student replies.
 *
 * Credentials (from the Photon dashboard):
 *   SPECTRUM_PROJECT_ID
 *   SPECTRUM_PROJECT_SECRET
 *   SPECTRUM_WEBHOOK_SECRET (optional, for inbound webhooks)
 */

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

let appPromise = null;
let inboundHandler = null;

export function setInboundHandler(handler) {
  inboundHandler = handler;
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

export async function sendSpectrumCode(phone, code, purpose, name) {
  const app = await getSpectrumApp();
  if (!app) return { delivered: false, channel: 'demo' };

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
  return { delivered: true, channel: 'imessage' };
}

export async function sendSpectrumWelcome(phone, name) {
  const app = await getSpectrumApp();
  if (!app) return false;
  const { imessage } = await import('spectrum-ts/providers/imessage');
  const im = imessage(app);
  const user = await im.user(toE164(phone));
  const space = await im.space.create(user);
  const first = name ? `${String(name).split(' ')[0]}` : 'there';
  await space.send(
    `Hey ${first} — Campus Connect here. I'll iMessage you a code whenever you sign in or reset your password. Reply anytime if you need a hand.`,
  );
  return true;
}

export async function handleSpectrumMessage(space, message) {
  if (!inboundHandler || message.direction !== 'inbound') return;
  if (message.content?.type !== 'text') return;
  const text = String(message.content.text ?? '').trim();
  const from = message.sender?.id ?? message.sender?.address ?? '';
  const codeMatch = text.match(/\b(\d{6})\b/);

  if (codeMatch) {
    const result = inboundHandler({ phone: from, code: codeMatch[1], text });
    if (result === 'verified') {
      await space.send("Got it — you're verified. Finish up in Campus Connect.");
      return;
    }
    if (result === 'unknown') {
      await space.send("I couldn't match that code. Request a new one in Campus Connect and try again.");
      return;
    }
  }

  if (/\b(reset|password|code|sign ?in|login|verify|2fa|help)\b/i.test(text)) {
    await space.send(
      "I send Campus Connect sign-in and password-reset codes over iMessage. Open the app, then reply with the 6-digit code I text you.",
    );
    return;
  }

  await space.send(
    "Campus Connect here. I live in this chat for sign-in and password-reset codes. Reply with a 6-digit code, or open the campus map.",
  );
}

export async function handleSpectrumWebhook(body, headers) {
  const app = await getSpectrumApp();
  if (!app) return { status: 503, headers: {}, body: Buffer.from('Spectrum is not configured') };
  return app.webhook({ body, headers }, handleSpectrumMessage);
}
