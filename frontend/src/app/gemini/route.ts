import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION = `You are Gemini, the Campus Connect assistant for Columbia University
(Morningside Heights: Columbia, Barnard, and Teachers College).

Answer campus-event questions and how-to questions about this app. Keep replies
to a few short sentences unless you are listing events. Do not invent listings,
buildings, or times that are not in the provided event list.

App guide (use this when they ask how something works):
- Live official events come from each college's public events calendar
  (University Life at Columbia). Drawer descriptions are 2–3 sentence
  summaries of those listings.
- Happening Now is today's mapped campus events.
- Sidebar TBD locations, Remote, Saved, and User Led Events open a list.
  Close it with the X on the popup, Escape, or by tapping the same item again.
- User Led Events (button above Post Event) shows student-posted listings
  from the viewer's campus only. An NYU post is hidden from Columbia, and
  the reverse. Each row has a check to accept (I'm Going) and an X to reject.
- Post Event: add title/time, photos (host only), Choose on map. Other
  students at the same campus see it under User Led Events. The first
  photo becomes that listing's map pin. Official calendar events never
  get host photos or photo pins.
- I'm Going or the User Led check: a bell notification now, and another 30 minutes
  before the event starts.
- Reject event (drawer button or the User Led X) hides that pin until they search
  for it. Search can find rejected events. "Show on map again" restores the pin.
- Directions only appear after they tap Directions (Apple Maps or Google Maps).
  Opening an event or tapping I'm Going does not open directions.
- Saved is the sidebar bookmark list. Profile (avatar) has Going, Hosted, Attended.
  Settings: account info, change password, two-step verification toggle, profile privacy.
- Forgot password always iMessages a Photon code. Two-step sign-in is optional in Settings.
- Categories live in the map All Categories dropdown. Date filter is Today or Any day.
- The header search finds events, including rejected ones.

Event fields:
- source "university-life" = official campus-calendar listing
- source "user" = student-posted / User Led
- locationKind mapped | tbd | remote
- host is the organizer

If an event is selected, prefer that one for "this event" questions.
Food → Free Food events and the All Categories filter.
Student-run / user led → source "user".
Online / Zoom / virtual → locationKind "remote".
No location / TBD → locationKind "tbd".
When you mention events, end with a JSON line:
MATCHES: ["event-id-1"]
If nothing matches, MATCHES: []`;

const SUMMARIZE_INSTRUCTION = `You write campus-map blurbs for Columbia University Life events.
Each summary MUST be 2 or 3 complete sentences — never 1, never more than 3.
Cover what the event is, who it is for, and one useful detail from the listing (topic, drop-in, time window, or how to join).
No HTML, markdown, bullet points, or URLs. Do not invent details.`;

type SummarizeItem = { id: string; title: string; description: string };

function parseMatches(raw: string): { text: string; eventIds: string[] } {
  const match = raw.match(/MATCHES:\s*(\[[\s\S]*?\])/);
  let eventIds: string[] = [];
  if (match) {
    try {
      const parsed: unknown = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        eventIds = parsed.filter((id): id is string => typeof id === "string");
      }
    } catch {
      eventIds = [];
    }
  }
  return { text: raw.replace(/MATCHES:\s*\[[\s\S]*?\]/, "").trim(), eventIds };
}

function asItems(value: unknown): SummarizeItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row): row is SummarizeItem => {
      if (!row || typeof row !== "object") return false;
      const item = row as Record<string, unknown>;
      return (
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.description === "string"
      );
    })
    .slice(0, 60);
}

function parseSummaries(raw: string): Record<string, string> {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = (fenced?.[1] ?? raw).trim();
  try {
    const parsed: unknown = JSON.parse(text);
    const out: Record<string, string> = {};
    if (Array.isArray(parsed)) {
      for (const row of parsed) {
        if (
          row &&
          typeof row === "object" &&
          "id" in row &&
          "summary" in row &&
          typeof row.id === "string" &&
          typeof row.summary === "string"
        ) {
          out[row.id] = row.summary.trim();
        }
      }
      return out;
    }
    if (parsed && typeof parsed === "object") {
      for (const [id, summary] of Object.entries(parsed)) {
        if (typeof summary === "string" && summary.trim()) out[id] = summary.trim();
      }
    }
    return out;
  } catch {
    return {};
  }
}

async function summarizeEvents(key: string, items: SummarizeItem[]) {
  if (items.length === 0) {
    return NextResponse.json({ summaries: {} });
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
    systemInstruction: SUMMARIZE_INSTRUCTION,
  });

  const prompt = [
    "Summarize each University Life event listing in 2-3 sentences.",
    "Every summary must contain 2 or 3 sentences. Do not return a single sentence.",
    "Return JSON only, either {\"id\":\"summary\"} or [{\"id\":\"...\",\"summary\":\"...\"}].",
    JSON.stringify(items),
  ].join("\n");

  const result = await model.generateContent(prompt);
  return NextResponse.json({ summaries: parseSummaries(result.response.text()) });
}

/** Live Gemini answers for Ask Gemini, plus University Life description summaries. */
export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 503 });
  }

  const body: unknown = await req.json().catch(() => null);
  const mode =
    body && typeof body === "object" && "mode" in body && body.mode === "summarize"
      ? "summarize"
      : "chat";

  try {
    if (mode === "summarize") {
      const items =
        body && typeof body === "object" && "items" in body ? asItems(body.items) : [];
      return await summarizeEvents(key, items);
    }

    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message.trim()
        : "";
    const currentEvents =
      body && typeof body === "object" && "currentEvents" in body ? body.currentEvents : [];
    const selectedEvent =
      body && typeof body === "object" && "selectedEvent" in body ? body.selectedEvent : null;

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const prompt = [
      `Current events: ${JSON.stringify(currentEvents ?? [])}`,
      `Selected event: ${JSON.stringify(selectedEvent ?? null)}`,
      `User: ${message}`,
    ].join("\n");

    const result = await model.generateContent(prompt);
    return NextResponse.json(parseMatches(result.response.text()));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Gemini request failed.";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
