import type { CampusEvent, EventCategory } from "@/types/event";

export interface GeminiReply {
  text: string;
  matches: CampusEvent[];
}

const CATEGORY_HINTS: Array<{ keys: string[]; category: EventCategory }> = [
  { keys: ["free food", "food", "pizza", "eat", "snack", "lunch", "dinner"], category: "Free Food" },
  { keys: ["social", "party", "meetup", "hang"], category: "Social" },
  { keys: ["academic", "study", "class", "lecture", "library"], category: "Academic" },
  { keys: ["career", "job", "recruit", "internship", "resume"], category: "Career" },
  { keys: ["sport", "game", "basketball", "soccer", "workout"], category: "Sports" },
  { keys: ["entertainment", "music", "concert", "show", "movie"], category: "Entertainment" },
];

function includesAny(text: string, keys: string[]): boolean {
  return keys.some((key) => text.includes(key));
}

function scoreEvent(event: CampusEvent, query: string): number {
  const haystack = [event.title, event.category, event.locationName, event.host, event.description]
    .join(" ")
    .toLowerCase();
  if (haystack.includes(query)) return 3;
  return query
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0);
}

function listEvents(events: CampusEvent[]): string {
  return events
    .slice(0, 5)
    .map((event) => `${event.title} — ${event.locationName} (${event.timeStatus})`)
    .join("\n");
}

/**
 * Local campus answers so Ask Gemini works without an API key.
 * Replies stay grounded in events currently on the map.
 */
export function answerCampusQuestion(
  question: string,
  events: CampusEvent[],
  selectedEvent: CampusEvent | null,
): GeminiReply {
  const query = question.trim().toLowerCase();

  if (!query) {
    return { text: "Ask me what's happening on campus, where the free food is, or how to post an event.", matches: [] };
  }

  if (includesAny(query, ["post", "create", "host", "publish", "list an event"])) {
    return {
      text: "Tap Post Event in the sidebar, add a title and time, then choose a spot on the Columbia map. The listing stays in this browser session and disappears when you refresh.",
      matches: [],
    };
  }

  if (includesAny(query, ["direction", "walk", "how do i get", "navigate"])) {
    if (selectedEvent) {
      return {
        text: `Open ${selectedEvent.title} and tap Directions — Campus Connect will offer walking directions in Apple Maps or Google Maps to ${selectedEvent.locationName}.`,
        matches: [selectedEvent],
      };
    }
    return {
      text: "Select an event on the map, then tap Directions in the detail panel for a walking route.",
      matches: [],
    };
  }

  if (includesAny(query, ["save", "bookmark", "going"])) {
    return {
      text: "Open any event to bookmark it or tap I'm Going. Saved events show up under Saved in the sidebar, and both toggles stay in this session only.",
      matches: [],
    };
  }

  if (selectedEvent && includesAny(query, ["this event", "this one", "selected", "tell me about"])) {
    return {
      text: `${selectedEvent.title} is a ${selectedEvent.category.toLowerCase()} event at ${selectedEvent.locationName}. ${selectedEvent.timeStatus}. Hosted by ${selectedEvent.host}.`,
      matches: [selectedEvent],
    };
  }

  const hinted = CATEGORY_HINTS.find(({ keys }) => includesAny(query, keys));
  if (hinted) {
    const matches = events.filter((event) => event.category === hinted.category);
    if (matches.length === 0) {
      return {
        text: `No ${hinted.category.toLowerCase()} events are on the map right now. Post one if you're hosting, or check back later.`,
        matches: [],
      };
    }
    return {
      text: `I found ${matches.length} ${hinted.category.toLowerCase()} event${matches.length === 1 ? "" : "s"}:\n${listEvents(matches)}`,
      matches,
    };
  }

  const scored = events
    .map((event) => ({ event, score: scoreEvent(event, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.event);

  if (scored.length > 0) {
    return {
      text: `Here's what matches “${question.trim()}”:\n${listEvents(scored)}`,
      matches: scored,
    };
  }

  if (includesAny(query, ["happen", "now", "today", "what's on", "whats on", "events", "going on"])) {
    if (events.length === 0) {
      return {
        text: "The campus map is quiet right now — nothing is posted yet. Use Post Event to add something for this session, or check back later.",
        matches: [],
      };
    }
    return {
      text: `There ${events.length === 1 ? "is" : "are"} ${events.length} event${events.length === 1 ? "" : "s"} on the map:\n${listEvents(events)}`,
      matches: events,
    };
  }

  if (events.length === 0) {
    return {
      text: "I can help you find campus events, free food, or walk you through posting. The map is empty at the moment, so there isn't a listing to open yet.",
      matches: [],
    };
  }

  return {
    text: "I can look up campus events, free food, directions, or how to post. Try “what's happening now?” or name a place or category.",
    matches: [],
  };
}
