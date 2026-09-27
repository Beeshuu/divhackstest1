/**
 * Turns University Life listing copy into a short campus-map blurb.
 * Uses the built-in Next.js /gemini route when GEMINI_API_KEY is set.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendPort = Number(process.env.FRONTEND_PORT) || 3001;
const cacheFile = join(dirname(fileURLToPath(import.meta.url)), "data", "ulife-summaries.json");
const GEMINI_TIMEOUT_MS = 12_000;
const CHUNK = 16;
const SUMMARY_VERSION = "5";
const MAX_SUMMARY = 520;
const MIN_SENTENCES = 2;
const MAX_SENTENCES = 3;

function fingerprint(id, text) {
  return `${SUMMARY_VERSION}:${id}:${createHash("sha1").update(text).digest("hex").slice(0, 12)}`;
}

function loadCache() {
  try {
    const parsed = JSON.parse(readFileSync(cacheFile, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveCache(cache) {
  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, `${JSON.stringify(cache, null, 2)}\n`);
}

export function cleanListing(raw) {
  let text = String(raw ?? "");
  for (let i = 0; i < 2; i += 1) {
    text = text
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&rsquo;/gi, "'")
      .replace(/&lsquo;/gi, "'")
      .replace(/&rdquo;/gi, '"')
      .replace(/&ldquo;/gi, '"')
      .replace(/&ndash;/gi, "–")
      .replace(/&mdash;/gi, "—")
      .replace(/&hellip;/gi, "...")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
  }
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function clip(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  return `${(at > 80 ? cut.slice(0, at) : cut).trim()}…`;
}

function sentencesOf(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const parts = cleaned.match(/[^.!?]+[.!?]+(?:\s|$)/g);
  return (parts ?? [cleaned]).map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function fitSentences(...parts) {
  const sentences = parts.filter(Boolean).slice(0, MAX_SENTENCES);
  let out = "";
  let count = 0;
  for (const part of sentences) {
    const next = out ? `${out} ${part}` : part;
    if (next.length > MAX_SUMMARY) {
      if (count >= MIN_SENTENCES) return out;
      return out || clip(part, MAX_SUMMARY);
    }
    out = next;
    count += 1;
  }
  return out;
}

/** Keep Gemini blurbs that are 2-3 sentences; otherwise fall back. */
export function normalizeGeminiSummary(text) {
  const parts = sentencesOf(text).slice(0, MAX_SENTENCES);
  if (parts.length < MIN_SENTENCES) return "";
  return fitSentences(...parts);
}

/** Short readable blurb when Gemini is unavailable. */
export function fallbackSummary(raw) {
  let text = cleanListing(raw);
  text = text.replace(/\bRegister here:?\s*/gi, "").trim();
  const abstract = text.match(/Abstract:\s*([\s\S]+)/i);
  const talkTitle = text.match(/Title:\s*([\s\S]+?)(?:Abstract:|$)/i);
  if (abstract) {
    const heading = talkTitle?.[1]?.replace(/\s+/g, " ").trim();
    const title = heading && heading.length < 140 ? `${heading.replace(/[.]$/, "")}.` : "";
    return fitSentences(title, ...sentencesOf(abstract[1])) || "Listed on University Life.";
  }
  return fitSentences(...sentencesOf(text)) || "Listed on University Life.";
}

async function askGemini(items) {
  const summaries = {};
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
      const response = await fetch(`http://127.0.0.1:${frontendPort}/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "summarize", items: chunk }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) continue;
      const body = await response.json();
      if (body?.summaries && typeof body.summaries === "object") {
        for (const [id, text] of Object.entries(body.summaries)) {
          if (typeof text !== "string") continue;
          const summary = normalizeGeminiSummary(text);
          if (summary) summaries[id] = summary;
        }
      }
    } catch {
      // Local fallback covers a missing key, timeout, or Gemini error.
    }
  }
  return summaries;
}

/** Replaces each event.description with a Gemini (or local) summary. Mutates in place. */
export async function summarizeListings(events) {
  const cache = loadCache();
  const pending = [];

  for (const event of events) {
    const original = event.description || "";
    const key = fingerprint(event.id, original);
    if (cache[key]) {
      event.description = cache[key];
      continue;
    }
    pending.push({ event, key, cleaned: cleanListing(original) });
  }

  if (pending.length === 0) return events;

  const fromGemini = await askGemini(
    pending.map(({ event, cleaned }) => ({
      id: event.id,
      title: event.title,
      description: cleaned,
    })),
  );

  let wrote = false;
  for (const item of pending) {
    const summary = (fromGemini[item.event.id] || fallbackSummary(item.cleaned)).trim();
    cache[item.key] = summary;
    item.event.description = summary;
    wrote = true;
  }
  if (wrote) saveCache(cache);
  return events;
}
