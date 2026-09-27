import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION = `You are the Campus Connect guide for Columbia University.
Use only the provided event list and selected event. Keep replies short.
If the user wants food, mention Free Food events and the Free Food option in the category filter.
If they want to host, tell them to tap Post Event, then Choose on map.
If an event is selected, prefer answering about that one.
When you mention events, end with a JSON line:
MATCHES: ["event-id-1"]
If nothing matches, MATCHES: []`;

const SUMMARIZE_INSTRUCTION = `You write short campus-map blurbs for Columbia University Life events.
Each summary is 1-2 plain sentences. No HTML, markdown, bullet points, or URLs.
Keep what the event is and who it is for. Do not invent details.`;

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
    "Summarize each University Life event listing.",
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
