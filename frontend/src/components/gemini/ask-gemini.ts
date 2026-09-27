import { isEventToday } from "@/lib/utils";
import type { CampusEvent, EventCategory } from "@/types/event";

export interface GeminiReply {
  text: string;
  matches: CampusEvent[];
}

function compactEvent(event: CampusEvent) {
  return {
    id: event.id,
    title: event.title,
    category: event.category,
    locationName: event.locationName,
    address: event.address,
    description: event.description,
    dateLabel: event.dateLabel,
    startTime: event.startTime,
    endTime: event.endTime,
    timeStatus: event.timeStatus,
    host: event.host,
    source: event.source ?? "map",
    locationKind: event.locationKind ?? "mapped",
    goingCount: event.goingCount,
  };
}

/** Calls the Next.js /gemini route. Throws when the live model is unavailable. */
export async function fetchGeminiReply(
  message: string,
  events: CampusEvent[],
  selectedEvent: CampusEvent | null,
): Promise<GeminiReply> {
  const response = await fetch("/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      currentEvents: events.map(compactEvent),
      selectedEvent: selectedEvent ? compactEvent(selectedEvent) : null,
    }),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "Gemini request failed.";
    throw new Error(error);
  }
  const text =
    data && typeof data === "object" && "text" in data && typeof data.text === "string" ? data.text : "";
  const eventIds =
    data && typeof data === "object" && "eventIds" in data && Array.isArray(data.eventIds)
      ? data.eventIds.filter((id): id is string => typeof id === "string")
      : [];
  const matches = events.filter(
    (event) =>
      eventIds.includes(event.id) ||
      (eventIds.length === 0 && text.toLowerCase().includes(event.title.toLowerCase())),
  );
  return { text, matches };
}

const CATEGORY_HINTS: Array<{ keys: string[]; category: EventCategory }> = [
  { keys: ["free food", "food", "pizza", "eat", "snack", "lunch", "dinner", "donut", "coffee"], category: "Free Food" },
  { keys: ["social", "party", "meetup", "hang", "mixer"], category: "Social" },
  { keys: ["academic", "study", "class", "lecture", "library", "seminar", "workshop", "colloquium"], category: "Academic" },
  { keys: ["career", "job", "recruit", "internship", "resume", "interview"], category: "Career" },
  { keys: ["sport", "game", "basketball", "soccer", "workout", "yoga", "fitness"], category: "Sports" },
  { keys: ["entertainment", "music", "concert", "show", "movie", "film"], category: "Entertainment" },
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

function found(label: string, matches: CampusEvent[]): GeminiReply {
  if (matches.length === 0) {
    return { text: `I don't see any ${label} right now. Check back later or post one with Post Event.`, matches: [] };
  }
  return {
    text: `I found ${matches.length} ${label}:\n${listEvents(matches)}`,
    matches,
  };
}

/**
 * Local campus answers so Ask Gemini works without an API key.
 * Covers the current map features, not just food and posting.
 */
export function answerCampusQuestion(
  question: string,
  events: CampusEvent[],
  selectedEvent: CampusEvent | null,
): GeminiReply {
  const query = question.trim().toLowerCase();
  const userLed = events.filter((event) => event.source === "user");
  const remote = events.filter((event) => event.locationKind === "remote");
  const tbd = events.filter((event) => event.locationKind === "tbd");
  const today = events.filter((event) => isEventToday(event) && event.locationKind !== "tbd" && event.locationKind !== "remote");

  if (!query) {
    return {
      text: "Ask me what's happening today, which events are student-posted, what's remote, or how to reject a listing.",
      matches: [],
    };
  }

  if (includesAny(query, ["reject", "hide event", "not interested", "don't show", "dont show"])) {
    return {
      text: "Open an event and tap Reject event, or tap the X on a User Led Events row. That pin stays off your map until you search the title. From search you can tap Show on map again.",
      matches: [],
    };
  }

  if (includesAny(query, ["accept event", "check mark", "checkmark", "user led", "user-led", "student posted", "student-posted", "other students"])) {
    if (includesAny(query, ["how", "what is", "what's", "whats", "accept", "check"])) {
      return {
        text: `User Led Events is the sidebar button above Post Event. It lists student-posted events. Tap the check to accept (I'm Going) or the X to reject. ${userLed.length ? `There ${userLed.length === 1 ? "is" : "are"} ${userLed.length} right now:\n${listEvents(userLed)}` : "None are posted right now."}`,
        matches: userLed,
      };
    }
    return found("student-posted events", userLed);
  }

  if (includesAny(query, ["notification", "remind", "reminder", "bell", "30 min", "30-minute", "thirty"])) {
    return {
      text: "When you tap I'm Going or the User Led check, a notice lands on the header bell. Another one fires 30 minutes before that event starts.",
      matches: selectedEvent ? [selectedEvent] : [],
    };
  }

  if (includesAny(query, ["forgot password", "reset password", "reset my password", "two-step", "2fa", "verification", "imessage", "photon"])) {
    return {
      text: "Campus Connect uses Photon Spectrum for codes. Forgot password? and every sign-in send a 6-digit code over iMessage. Enter it in the app, or reply to the iMessage.",
      matches: [],
    };
  }

  if (includesAny(query, ["profile", "password", "privacy", "settings", "hosted", "attended", "account"])) {
    return {
      text: "Tap your avatar for Profile (Going, Hosted, Attended) and Settings (account info, change password, profile privacy). On Sign In, Forgot password? resets with a code to your phone.",
      matches: [],
    };
  }

  if (includesAny(query, ["post", "create", "host", "publish", "list an event"])) {
    return {
      text: "Tap Post Event in the sidebar, add a title and time, then Choose on map. Other students will see it under User Led Events.",
      matches: [],
    };
  }

  if (includesAny(query, ["direction", "walk", "how do i get", "navigate", "apple maps", "google maps"])) {
    if (selectedEvent) {
      return {
        text: `Open ${selectedEvent.title} and tap Directions — that is the only way the maps prompt opens. You can walk there in Apple Maps or Google Maps (${selectedEvent.locationName}).`,
        matches: [selectedEvent],
      };
    }
    return {
      text: "Select an event, then tap Directions. Opening an event or tapping I'm Going will not open maps.",
      matches: [],
    };
  }

  if (includesAny(query, ["save", "bookmark"])) {
    return {
      text: "Open an event and tap the bookmark. Saved listings collect under Saved in the sidebar.",
      matches: [],
    };
  }

  if (includesAny(query, ["i'm going", "im going", "going to"])) {
    return {
      text: "Tap I'm Going on an event, or the check on a User Led Events row. You'll get a bell notice now and another 30 minutes before it starts.",
      matches: selectedEvent ? [selectedEvent] : [],
    };
  }

  if (includesAny(query, ["tbd", "no location", "location missing", "without a location"])) {
    return {
      text: `TBD locations is in the sidebar Location list — tap it again to close. ${tbd.length ? `There ${tbd.length === 1 ? "is" : "are"} ${tbd.length} right now:\n${listEvents(tbd)}` : "University Life has no TBD listings right now."}`,
      matches: tbd,
    };
  }

  if (includesAny(query, ["remote", "online", "zoom", "virtual"])) {
    return {
      text: `Remote in the sidebar lists online events. Tap Remote again to close the list. ${remote.length ? `There ${remote.length === 1 ? "is" : "are"} ${remote.length} right now:\n${listEvents(remote)}` : "No remote events are listed right now."}`,
      matches: remote,
    };
  }

  if (includesAny(query, ["happening now", "today", "what's on", "whats on", "what's happening", "whats happening"])) {
    return {
      text: `Happening Now is today's mapped campus events. ${today.length ? `There ${today.length === 1 ? "is" : "are"} ${today.length} today:\n${listEvents(today)}` : "Nothing mapped is happening today — try Any day on the map, or check Remote and TBD."}`,
      matches: today,
    };
  }

  if (includesAny(query, ["university life", "official", "columbia calendar"])) {
    const official = events.filter((event) => event.source === "university-life");
    return found("University Life events", official);
  }

  if (includesAny(query, ["search", "find a hidden", "find rejected"])) {
    return {
      text: "Type the event title in the header search. That finds listings you rejected, and you can open them or tap Show on map again.",
      matches: [],
    };
  }

  if (includesAny(query, ["how does", "how do i", "what can you", "help", "what do you"])) {
    return {
      text: "I can find today's events, student-posted User Led Events, remote or TBD listings, free food, and walk you through posting, rejecting, directions, and reminders. Try naming a building or asking what's happening now.",
      matches: [],
    };
  }

  if (selectedEvent && includesAny(query, ["this event", "this one", "selected", "tell me about", "what is this"])) {
    const kind =
      selectedEvent.source === "user"
        ? "student-posted"
        : selectedEvent.locationKind === "remote"
          ? "remote"
          : selectedEvent.locationKind === "tbd"
            ? "TBD-location"
            : selectedEvent.category.toLowerCase();
    return {
      text: `${selectedEvent.title} is a ${kind} event at ${selectedEvent.locationName}, hosted by ${selectedEvent.host}. ${selectedEvent.timeStatus}. ${selectedEvent.description}`,
      matches: [selectedEvent],
    };
  }

  const hinted = CATEGORY_HINTS.find(({ keys }) => includesAny(query, keys));
  if (hinted) {
    const matches = events.filter((event) => event.category === hinted.category);
    if (matches.length === 0) {
      return {
        text: `No ${hinted.category.toLowerCase()} events are on the map right now. Use All Categories on the map after someone posts one, or post it yourself.`,
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

  if (includesAny(query, ["happen", "now", "events", "going on"])) {
    if (events.length === 0) {
      return {
        text: "The campus map is quiet right now. Use Post Event to add a student listing, or check TBD and Remote in the sidebar.",
        matches: [],
      };
    }
    return {
      text: `There ${events.length === 1 ? "is" : "are"} ${events.length} event${events.length === 1 ? "" : "s"} I can see:\n${listEvents(events)}`,
      matches: events,
    };
  }

  if (events.length === 0) {
    return {
      text: "I can help with campus events, User Led Events, remote/TBD lists, rejecting pins, directions, and reminders. Nothing is loaded right now.",
      matches: [],
    };
  }

  return {
    text: "I can look up today, student-posted events, remote or TBD listings, free food, directions, rejecting a pin, or reminders. Try “what's happening now?” or name a place.",
    matches: [],
  };
}
