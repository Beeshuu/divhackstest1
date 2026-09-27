import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION = `You are the Campus Connect guide for Columbia University.
Use only the provided event list and selected event. Keep replies short.
If the user wants food, mention Free Food events and the Free Food filter in the sidebar.
If they want to host, tell them to tap Post Event, then Choose on map.
If an event is selected, prefer answering about that one.
When you mention events, end with a JSON line:
MATCHES: ["event-id-1"]
If nothing matches, MATCHES: []`;

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

/** Live Gemini answers for the Ask Gemini panel. Not under /api — that prefix is proxied to Express. */
export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 503 });
  }

  const body: unknown = await req.json().catch(() => null);
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

  try {
    const result = await model.generateContent(prompt);
    const parsed = parseMatches(result.response.text());
    return NextResponse.json(parsed);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Gemini request failed.";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
