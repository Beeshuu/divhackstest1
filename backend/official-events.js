/**
 * Official public calendars for every college on the campus picker.
 * Columbia/Barnard keep University Life. Other schools use each college's
 * events tab (LiveWhale, Coursedog, Drupal listings, CUNY RSS).
 */

import vm from "node:vm";

import { summarizeListings } from "./gemini-summarize.js";
import { loadUniversityLifeEvents } from "./university-life.js";

const CACHE_MS = 2 * 60 * 1000;
const BROWSER_HEADERS = {
  Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
};

const CATEGORY_RULES = [
  { category: "Free Food", re: /\b(pizza|lunch provided|free food|dining|sushi|food pantry|snap|sukkah)\b/i },
  { category: "Career", re: /\b(career|internship|interview|employer|job|recruit|resume|externship|info session|information session|fair)\b/i },
  { category: "Sports", re: /\b(yoga|fitness|hiit|recreation|intramural|athletics|wellness|game)\b/i },
  { category: "Academic", re: /\b(seminar|lecture|colloquium|workshop|grand rounds|library|study|teaching|research|symposium|class|bootcamp)\b/i },
  { category: "Entertainment", re: /\b(film|concert|music|cinema|screening|performance|exhibition|theatre|theater)\b/i },
];

const STYLE = {
  "Free Food": { markerColor: "coral", iconType: "pizza" },
  Social: { markerColor: "pink", iconType: "users" },
  Academic: { markerColor: "blue", iconType: "book" },
  Career: { markerColor: "orange", iconType: "briefcase" },
  Sports: { markerColor: "green", iconType: "run" },
  Entertainment: { markerColor: "purple", iconType: "music" },
};

const COURSEDOG_JUNK =
  /offline|ungerboeck|grades assigned|reserved by|requesting room|space request|academic calendar|setup and teardown|private event|banner-ethos/i;

/** Featured map labels plus extra official-building aliases used only for pins. */
const CAMPUS_PLACES = {
  nyu: [
    { match: ["washington square park", "washington square"], name: "Washington Square Park", x: 32, y: 37 },
    { match: ["silver center", "silver"], name: "Silver Center", x: 56, y: 37 },
    { match: ["bobst"], name: "Bobst Library", x: 40, y: 57 },
    { match: ["vanderbilt"], name: "Vanderbilt Hall", x: 24, y: 57 },
    { match: ["kimmel"], name: "Kimmel Center", x: 24, y: 74 },
    { match: ["tisch", "stern"], name: "Tisch / Stern", x: 62, y: 57 },
    { match: ["meyer hall"], name: "Meyer Hall", x: 62, y: 74 },
    { match: ["goddard"], name: "Goddard Hall", x: 80, y: 37 },
    { match: ["weinstein"], name: "Weinstein", x: 56, y: 18 },
    { match: ["80wse", "80 washington square", "80 wse"], name: "Silver Center", x: 56, y: 37 },
    { match: ["kimmel center"], name: "Kimmel Center", x: 24, y: 74 },
  ],
  newschool: [
    { match: ["university center"], name: "University Center", x: 48, y: 50 },
    { match: ["parsons"], name: "Parsons", x: 32, y: 50 },
    { match: ["alvin johnson", "johnson hall"], name: "Alvin Johnson Hall", x: 48, y: 70 },
    { match: ["66 w 12", "66 west 12"], name: "66 W 12th", x: 32, y: 70 },
    { match: ["sheila johnson"], name: "Sheila Johnson Design", x: 64, y: 50 },
    { match: ["eugene lang", "lang"], name: "Eugene Lang", x: 48, y: 30 },
    { match: ["union square"], name: "Union Square", x: 82, y: 20 },
  ],
  fordham: [
    { match: ["edwards parade"], name: "Edwards Parade", x: 45, y: 50 },
    { match: ["keating"], name: "Keating Hall", x: 45, y: 22 },
    { match: ["cunniffe"], name: "Cunniffe House", x: 24, y: 40 },
    { match: ["duane"], name: "Duane Library", x: 68, y: 40 },
    { match: ["walsh"], name: "Walsh Library", x: 68, y: 60 },
    { match: ["queens court"], name: "Queens Court", x: 24, y: 60 },
    { match: ["hughes"], name: "Hughes Hall", x: 45, y: 80 },
    { match: ["thebaud"], name: "Thebaud Hall", x: 68, y: 80 },
    { match: ["rose hill"], name: "Edwards Parade", x: 45, y: 50 },
  ],
  pace: [
    { match: ["one pace plaza", "1 pace plaza", "pace plaza"], name: "One Pace Plaza", x: 50, y: 42 },
    { match: ["41 park row", "park row"], name: "41 Park Row", x: 28, y: 42 },
    { match: ["city hall"], name: "City Hall Park", x: 26, y: 62 },
    { match: ["163 william"], name: "163 William", x: 74, y: 42 },
    { match: ["maria"], name: "Maria's Tower", x: 50, y: 64 },
    { match: ["student union"], name: "Student Union", x: 74, y: 64 },
    { match: ["civic center", "downtown"], name: "One Pace Plaza", x: 50, y: 42 },
  ],
  cooper: [
    { match: ["foundation building", "great hall"], name: "Foundation Building", x: 40, y: 52 },
    { match: ["41 cooper"], name: "41 Cooper Square", x: 40, y: 32 },
    { match: ["cooper triangle", "cooper square"], name: "Cooper Triangle", x: 52, y: 42 },
    { match: ["30 cooper"], name: "30 Cooper Square", x: 64, y: 52 },
    { match: ["stuyvesant"], name: "Stuyvesant-Cooper", x: 64, y: 72 },
  ],
  baruch: [
    { match: ["newman vertical", "vertical campus", "nvc"], name: "Newman Vertical Campus", x: 58, y: 52 },
    { match: ["newman library", "library & technology", "library and technology"], name: "Newman Library", x: 58, y: 32 },
    { match: ["field building", "lawrence & eris", "lawrence and eris"], name: "Field Building", x: 46, y: 72 },
    { match: ["17 lexington"], name: "17 Lexington", x: 58, y: 72 },
    { match: ["information bldg", "information building", "newman hall"], name: "Information Bldg", x: 72, y: 52 },
    { match: ["admin", "administrative"], name: "Admin Center", x: 34, y: 52 },
  ],
  ccny: [
    { match: ["shepard"], name: "Shepard Hall", x: 48, y: 18 },
    { match: ["great lawn"], name: "The Great Lawn", x: 40, y: 36 },
    { match: ["nac", "north academic"], name: "NAC", x: 32, y: 56 },
    { match: ["marshak"], name: "Marshak Science", x: 66, y: 56 },
    { match: ["harris"], name: "Harris Hall", x: 32, y: 76 },
    { match: ["baskerville"], name: "Baskerville", x: 66, y: 76 },
    { match: ["wingate"], name: "Wingate Hall", x: 48, y: 76 },
    { match: ["convent"], name: "The Great Lawn", x: 40, y: 36 },
  ],
  hunter: [
    { match: ["west building"], name: "West Building", x: 32, y: 54 },
    { match: ["east building"], name: "East Building", x: 64, y: 54 },
    { match: ["thomas hunter"], name: "Thomas Hunter Hall", x: 48, y: 32 },
    { match: ["skywalk"], name: "Skywalk", x: 48, y: 52 },
    { match: ["assembly hall"], name: "Assembly Hall", x: 32, y: 74 },
    { match: ["68th", "lexington"], name: "68th Street campus", x: 64, y: 74 },
    { match: ["north building"], name: "Thomas Hunter Hall", x: 48, y: 32 },
    { match: ["roosevelt house"], name: "68th Street campus", x: 64, y: 74 },
  ],
  brooklyn: [
    { match: ["the quad", "quad", "student center"], name: "The Quad", x: 50, y: 42 },
    { match: ["laguardia library", "library"], name: "LaGuardia Library", x: 50, y: 22 },
    { match: ["boylan"], name: "Boylan Hall", x: 21, y: 42 },
    { match: ["ingersoll"], name: "Ingersoll Hall", x: 65, y: 22 },
    { match: ["whitehead"], name: "Whitehead Hall", x: 21, y: 62 },
    { match: ["james hall"], name: "James Hall", x: 65, y: 62 },
    { match: ["whitman"], name: "Whitman Hall", x: 50, y: 82 },
    { match: ["roosevelt hall"], name: "Roosevelt Hall", x: 85, y: 62 },
  ],
  queens: [
    { match: ["the quad", "quad"], name: "The Quad", x: 56, y: 42 },
    { match: ["rosenthal"], name: "Rosenthal Library", x: 28, y: 32 },
    { match: ["powdermaker"], name: "Powdermaker Hall", x: 56, y: 22 },
    { match: ["kiely"], name: "Kiely Hall", x: 28, y: 52 },
    { match: ["remsen"], name: "Remsen Hall", x: 72, y: 32 },
    { match: ["science building"], name: "Science Building", x: 72, y: 62 },
    { match: ["student union"], name: "Student Union", x: 56, y: 72 },
  ],
  stjohns: [
    { match: ["great lawn"], name: "Great Lawn", x: 56, y: 42 },
    { match: ["st. augustine", "st augustine", "augustine"], name: "St. Augustine Hall", x: 28, y: 32 },
    { match: ["st. thomas more", "st thomas more", "thomas more"], name: "St. Thomas More", x: 56, y: 22 },
    { match: ["d'angelo", "dangelo"], name: "D'Angelo Center", x: 56, y: 62 },
    { match: ["carnesecca"], name: "Carnesecca Arena", x: 78, y: 32 },
    { match: ["st. albert", "st albert", "albert"], name: "St. Albert Hall", x: 28, y: 62 },
    { match: ["st. john hall", "st john hall"], name: "St. John Hall", x: 78, y: 62 },
  ],
  stevens: [
    { match: ["howe", "wesley j. howe"], name: "Howe Center", x: 48, y: 24 },
    { match: ["babbio"], name: "Babbio Center", x: 33, y: 46 },
    { match: ["kidde"], name: "Kidde Hall", x: 63, y: 46 },
    { match: ["edwin a. stevens", "eas hall", "eas)"], name: "Edwin A. Stevens", x: 48, y: 66 },
    { match: ["burchard"], name: "Burchard", x: 33, y: 66 },
    { match: ["gatehouse"], name: "Gatehouse", x: 33, y: 24 },
    { match: ["castle point"], name: "Castle Point", x: 86, y: 28 },
  ],
};

const CAMPUS_BOUNDS = {
  nyu: { south: 40.724, west: -74.004, north: 40.7353, east: -73.9904 },
  newschool: { south: 40.732, west: -74.0, north: 40.74, east: -73.9874 },
  fordham: { south: 40.8562, west: -73.8942, north: 40.865, east: -73.8802 },
  pace: { south: 40.7064, west: -74.0104, north: 40.715, east: -74.0 },
  cooper: { south: 40.7238, west: -73.9958, north: 40.7322, east: -73.987 },
  baruch: { south: 40.7366, west: -73.9916, north: 40.7446, east: -73.9788 },
  ccny: { south: 40.8154, west: -73.9566, north: 40.824, east: -73.944 },
  hunter: { south: 40.7642, west: -73.9702, north: 40.7724, east: -73.959 },
  brooklyn: { south: 40.6266, west: -73.9586, north: 40.6346, east: -73.9462 },
  queens: { south: 40.733, west: -73.8252, north: 40.7406, east: -73.815 },
  stjohns: { south: 40.7176, west: -73.8014, north: 40.7264, east: -73.7896 },
  stevens: { south: 40.7406, west: -74.0306, north: 40.7484, east: -74.021 },
};

const CAMPUS_META = {
  columbia: { name: "Columbia University", page: "https://universitylife.columbia.edu/events", host: "University Life" },
  barnard: { name: "Barnard College", page: "https://universitylife.columbia.edu/events", host: "University Life" },
  nyu: { name: "New York University", page: "https://events.nyu.edu/", host: "NYU Events" },
  newschool: { name: "The New School", page: "https://events.newschool.edu/", host: "The New School Events" },
  fordham: { name: "Fordham University", page: "https://www.fordham.edu/calendar", host: "Fordham Calendar" },
  pace: { name: "Pace University", page: "https://www.pace.edu/events", host: "Pace Events" },
  cooper: { name: "Cooper Union", page: "https://cooper.edu/events-and-exhibitions", host: "Cooper Union Events" },
  baruch: { name: "Baruch College", page: "https://baruch.event.cuny.edu/upcoming", host: "Baruch Events Calendar" },
  ccny: { name: "City College of New York", page: "https://ccny.event.cuny.edu/upcoming", host: "City College Events" },
  hunter: { name: "Hunter College", page: "https://hunter.event.cuny.edu/upcoming", host: "Hunter Events Calendar" },
  brooklyn: { name: "Brooklyn College", page: "https://brooklyn.event.cuny.edu/upcoming", host: "Brooklyn College Events" },
  queens: { name: "Queens College", page: "https://qc.event.cuny.edu/upcoming", host: "Queens College Events" },
  stjohns: { name: "St. John's University", page: "https://eventscheduling.stjohns.edu/", host: "St. John's Events" },
  stevens: { name: "Stevens Institute of Technology", page: "https://events.stevens.edu/", host: "Stevens Events" },
};

const COURSEDOG_PAGES = {
  baruch: "https://baruch.event.cuny.edu/upcoming",
  hunter: "https://hunter.event.cuny.edu/upcoming",
  queens: "https://qc.event.cuny.edu/upcoming",
  ccny: "https://ccny.event.cuny.edu/upcoming",
  brooklyn: "https://brooklyn.event.cuny.edu/upcoming",
  stevens: "https://events.stevens.edu/",
  stjohns: "https://eventscheduling.stjohns.edu/",
};

const CUNY_COLLEGE_NAMES = {
  baruch: ["baruch"],
  hunter: ["hunter"],
  queens: ["queens college"],
  ccny: ["city college", "ccny"],
  brooklyn: ["brooklyn college"],
};

const caches = new Map();
const inflight = new Map();

function decode(value) {
  let text = String(value ?? "");
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
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
      .replace(/\\u00a0/g, " ");
  }
  return text.replace(/\t+/g, " ").replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  return decode(String(value ?? "").replace(/<[^>]+>/g, " "));
}

function tag(xml, name) {
  const match = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  if (!match) return "";
  return decode(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"));
}

const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function parseHumanNy(raw) {
  const match = String(raw).match(
    /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*([ap]m)?)?/i,
  );
  if (!match) return null;
  const month = MONTHS[match[1].toLowerCase()];
  if (!month) return null;
  const dateStr = `${match[3]}-${pad(month)}-${pad(match[2])}`;
  if (match[4]) {
    let hours = Number(match[4]);
    const minutes = Number(match[5] || 0);
    const ap = (match[6] || "").toLowerCase();
    if (ap === "pm" && hours < 12) hours += 12;
    if (ap === "am" && hours === 12) hours = 0;
    return fromNyLocal(dateStr, hours * 100 + minutes);
  }
  return fromNyLocal(dateStr, 1200);
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.valueOf()) ? null : value;
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const n = Number(value);
    const ms = n < 1e12 ? n * 1000 : n;
    const date = new Date(ms);
    return Number.isNaN(date.valueOf()) ? null : date;
  }
  const raw = String(value).trim();
  const human = parseHumanNy(raw);
  if (human) return human;
  const iso = raw.replace("Z", "+00:00");
  const date = new Date(iso);
  if (!Number.isNaN(date.valueOf())) return date;
  const spaced = raw.replace(/(\d)([ap]m)\b/gi, "$1 $2");
  const fallback = new Date(spaced);
  return Number.isNaN(fallback.valueOf()) ? null : fallback;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function nyOffset(dateStr) {
  const probe = new Date(`${dateStr}T16:00:00Z`);
  const label = probe.toLocaleString("en-US", { timeZone: "America/New_York", timeZoneName: "short" });
  return /EDT/.test(label) ? "-04:00" : "-05:00";
}

function fromNyLocal(dateStr, timeIntOrClock) {
  if (!dateStr) return null;
  let hours = 0;
  let minutes = 0;
  if (typeof timeIntOrClock === "number" || /^\d{3,4}$/.test(String(timeIntOrClock ?? ""))) {
    const n = Number(timeIntOrClock);
    hours = Math.floor(n / 100);
    minutes = n % 100;
  } else if (timeIntOrClock) {
    const clock = String(timeIntOrClock).trim();
    const match = clock.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!match) return parseDate(`${dateStr}T12:00:00${nyOffset(dateStr)}`);
    hours = Number(match[1]);
    minutes = Number(match[2] || 0);
    const ap = (match[3] || "").toLowerCase();
    if (ap === "pm" && hours < 12) hours += 12;
    if (ap === "am" && hours === 12) hours = 0;
  }
  return parseDate(`${dateStr}T${pad(hours)}:${pad(minutes)}:00${nyOffset(dateStr)}`);
}

function parseUsDate(dateStr) {
  const match = String(dateStr ?? "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${pad(match[1])}-${pad(match[2])}`;
}

function clockOf(date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

function dateLabelOf(date, now = new Date()) {
  const ny = (d) => d.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });
  const weekday = date.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "short" });
  if (ny(date) === ny(now)) return `Today, ${ny(date)}`;
  return `${weekday}, ${ny(date)}`;
}

function timeStatusOf(start, end, now = new Date()) {
  if (now < start) {
    const minutes = Math.round((start - now) / 60000);
    if (minutes < 60) return `Starts in ${minutes} min`;
    if (minutes < 24 * 60) return `Starts in ${Math.round(minutes / 60)} hr`;
    return `Starts ${dateLabelOf(start, now)}`;
  }
  if (now < end) {
    const minutes = Math.round((end - now) / 60000);
    if (minutes < 60) return `Ends in ${minutes} min`;
    return `Ends in ${Math.round(minutes / 60)} hr`;
  }
  return "Ended";
}

function categoryFor(title, description, types = []) {
  const blob = `${title} ${description} ${types.join(" ")}`;
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(blob)) return rule.category;
  }
  if (types.some((type) => /seminar|lecture|workshop/i.test(type))) return "Academic";
  if (types.some((type) => /wellness|recreation/i.test(type))) return "Sports";
  return "Social";
}

function projectBounds(lat, lng, bounds) {
  const x = ((lng - bounds.west) / (bounds.east - bounds.west)) * 100;
  const y = ((bounds.north - lat) / (bounds.north - bounds.south)) * 100;
  return {
    x: Math.min(94, Math.max(6, x)),
    y: Math.min(94, Math.max(6, y)),
  };
}

function inBounds(lat, lng, bounds) {
  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}

function classifyLocation(raw, campusId, point, { unknown = "offCampus" } = {}) {
  const text = decode(raw);
  const compact = text.toLowerCase();
  const bounds = CAMPUS_BOUNDS[campusId];
  if (!text || /^(tbd|tba|n\/?a|none|location (tbd|tba))$/i.test(text) || /to be (announced|determined)/i.test(text)) {
    return { kind: "tbd", name: "Location TBD", address: "Location to be announced" };
  }
  if (
    /^(online|online event|virtual|remote|zoom|online courses)\b/i.test(text) ||
    (/\b(online event|virtual event|zoom|via zoom|online courses)\b/i.test(text) && !/\d{2,}\s+(w\.|west|broadway|amsterdam|lexington)/i.test(text))
  ) {
    return { kind: "remote", name: "Remote", address: text || "Online event" };
  }
  if (/\b(off campus|off-campus)\b/i.test(text)) {
    return { kind: "offCampus", name: text.split(",")[0].trim() || text, address: text };
  }

  for (const place of CAMPUS_PLACES[campusId] ?? []) {
    if (place.match.some((needle) => compact.includes(needle))) {
      return { kind: "mapped", name: place.name, address: text, x: place.x, y: place.y };
    }
  }

  if (point && bounds && inBounds(point.lat, point.lng, bounds)) {
    const xy = projectBounds(point.lat, point.lng, bounds);
    return { kind: "mapped", name: text.split(",")[0].trim() || "On campus", address: text, x: xy.x, y: xy.y };
  }

  if (unknown === "tbd") {
    return { kind: "tbd", name: "Location TBD", address: text || "Location to be announced" };
  }
  return { kind: "offCampus", name: text.split(",")[0].trim() || text, address: text };
}

function toCampusEvent(
  { id, title, description, location, start, end, url, host, types },
  campusId,
  { keepTbd = true, unknownLocation = "offCampus" } = {},
) {
  const whenStart = parseDate(start);
  const whenEnd = parseDate(end);
  if (!whenStart || !whenEnd || whenEnd <= new Date()) return null;
  if (whenEnd - whenStart > 5 * 24 * 60 * 60 * 1000) return null;
  if (/guest access|bedework application/i.test(title)) return null;

  const point =
    location && typeof location === "object" && location.lat != null
      ? { lat: Number(location.lat), lng: Number(location.lng) }
      : null;
  const rawLocation = location && typeof location === "object" ? location.name || location.address || "" : location;
  const place = classifyLocation(rawLocation, campusId, point, { unknown: unknownLocation });
  if (place.kind === "offCampus") return null;
  if (place.kind === "tbd" && !keepTbd) return null;

  const category = categoryFor(title, description, types);
  const style = STYLE[category];
  const meta = CAMPUS_META[campusId] ?? CAMPUS_META.columbia;
  return {
    id,
    title: decode(title),
    category,
    locationName: place.name,
    address: place.address,
    description: stripHtml(description) || `Listed on ${meta.host}.`,
    mapX: place.x ?? 50,
    mapY: place.y ?? 50,
    distance: place.kind === "remote" ? "Remote" : place.kind === "tbd" ? "Location TBD" : "On campus",
    timeStatus: timeStatusOf(whenStart, whenEnd),
    startTime: clockOf(whenStart),
    endTime: clockOf(whenEnd),
    dateLabel: dateLabelOf(whenStart),
    startsAt: whenStart.toISOString(),
    endsAt: whenEnd.toISOString(),
    goingCount: 0,
    interestedCount: 0,
    host: decode(host) || meta.host,
    markerColor: style.markerColor,
    iconType: style.iconType,
    locationKind: place.kind,
    sourceUrl: url || meta.page,
    source: "university-life",
    campusId,
  };
}

function dedupe(events) {
  const seen = new Set();
  return events.filter((event) => {
    if (!event || seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

async function fetchText(url) {
  const response = await fetch(url, { headers: BROWSER_HEADERS, redirect: "follow" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

async function fetchTextSafe(url) {
  try {
    return await fetchText(url);
  } catch {
    return "";
  }
}

function extractNuxt(html) {
  const start = html.indexOf("window.__NUXT__");
  if (start < 0) return null;
  const after = html.slice(start);
  const expr = after.slice(after.indexOf("=") + 1, after.indexOf("</script>")).trim().replace(/;+$/, "");
  return vm.runInNewContext(expr, Object.create(null), { timeout: 4000 });
}

function flattenCoursedogMeetings(calendar) {
  const out = [];
  if (!calendar || typeof calendar !== "object") return out;
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const row of node) walk(row);
      return;
    }
    if (node.startDate && (node.eventData || node.startTime != null)) {
      out.push(node);
      return;
    }
    for (const value of Object.values(node)) walk(value);
  };
  walk(calendar);
  return out;
}

function coursedogEvents(html, campusId) {
  const nuxt = extractNuxt(html);
  const meetings = flattenCoursedogMeetings(nuxt?.state?.meetings?.calendar);
  return meetings
    .map((meeting) => {
      const data = meeting.eventData ?? {};
      const title = data.name || meeting.name || "";
      const status = String(data.status || "");
      if (!title || COURSEDOG_JUNK.test(title) || COURSEDOG_JUNK.test(data.type || "")) return null;
      if (/canceled|cancelled|denied|draft/i.test(status)) return null;
      const description = stripHtml(data.description || "");
      const blob = `${title} ${description} ${data.type || ""}`;
      const start = fromNyLocal(meeting.startDate, meeting.startTime ?? 1200);
      const end = fromNyLocal(meeting.endDate || meeting.startDate, meeting.endTime ?? (Number(meeting.startTime ?? 1200) + 100));
      const keepTbd = meeting.featured || description.length > 40 || !/request form|import|reservation/i.test(data.type || "");
      return toCampusEvent(
        {
          id: `official-${campusId}-${meeting.id || data.id || title}`,
          title,
          description: description || `${title} is on the official ${CAMPUS_META[campusId]?.name ?? "campus"} calendar.`,
          location: blob,
          start,
          end,
          url: CAMPUS_META[campusId]?.page,
          host: data.contacts?.[0]?.name || CAMPUS_META[campusId]?.host,
          types: [data.type].filter(Boolean),
        },
        campusId,
        { keepTbd, unknownLocation: "tbd" },
      );
    })
    .filter(Boolean);
}

function nyuEvents(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
  return items
    .map((item) => {
      const title = tag(item, "title");
      const link = tag(item, "link");
      const locationName = tag(item, "georss:featurename");
      const pointRaw = tag(item, "georss:point");
      const [lat, lng] = pointRaw.split(/\s+/).map(Number);
      const start = parseDate(tag(item, "pubDate"));
      const ends = parseDate(tag(item, "livewhale:ends")) || (start ? new Date(start.getTime() + 90 * 60 * 1000) : null);
      const categories = tag(item, "livewhale:categories");
      const briefing = tag(item, "nyu:briefing") || stripHtml(tag(item, "description"));
      if (/shanghai|abu dhabi|florence|madrid|paris|london|accra|sydney|washington,?\s*dc|binghamton/i.test(`${title} ${link} ${locationName}`)) {
        return null;
      }
      return toCampusEvent(
        {
          id: `official-nyu-${tag(item, "livewhale:id") || title}`,
          title,
          description: briefing && !/lw_image|srcset/.test(briefing) ? briefing : `${title} is listed on the NYU Events calendar.`,
          location: Number.isFinite(lat) && Number.isFinite(lng) ? { name: locationName, lat, lng } : locationName,
          start,
          end: ends,
          url: link || CAMPUS_META.nyu.page,
          host: "NYU Events",
          types: categories ? categories.split(/,|\|/).map((part) => part.trim()) : [],
        },
        "nyu",
      );
    })
    .filter(Boolean)
    .slice(0, 80);
}

function cunyRssEvents(xml, campusId) {
  const needles = CUNY_COLLEGE_NAMES[campusId] ?? [];
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
  return items
    .map((item) => {
      const college = tag(item, "cec:collegename");
      if (needles.length && !needles.some((needle) => college.toLowerCase().includes(needle))) return null;
      const title = tag(item, "cec:name") || tag(item, "title");
      const date = parseUsDate(tag(item, "cec:startdate"));
      const endDate = parseUsDate(tag(item, "cec:enddate")) || date;
      const start = fromNyLocal(date, tag(item, "cec:starttime") || "12:00 PM");
      const end = fromNyLocal(endDate, tag(item, "cec:endtime") || tag(item, "cec:starttime") || "1:00 PM");
      const location = [tag(item, "cec:building"), tag(item, "cec:room"), tag(item, "cec:eventaddress1")].filter(Boolean).join(", ");
      return toCampusEvent(
        {
          id: `official-${campusId}-cuny-${tag(item, "cec:eventid") || title}`,
          title,
          description: stripHtml(tag(item, "description") || tag(item, "cec:descsummary")) || `${title} is listed on the CUNY Events Calendar.`,
          location,
          start,
          end,
          url: tag(item, "link") || "https://events.cuny.edu/",
          host: college || CAMPUS_META[campusId]?.host,
          types: [tag(item, "cec:categoryname")],
        },
        campusId,
      );
    })
    .filter(Boolean);
}

function fieldText(block, name) {
  return stripHtml((block.match(new RegExp(`f--field f--${name}[\\s\\S]*?>([\\s\\S]*?)</`)) || [])[1] || "");
}

function withYear(monthDay) {
  const now = new Date();
  const year = now.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric" });
  const parsed = parseDate(`${monthDay}, ${year} 12:00 pm`);
  if (parsed && parsed.getTime() + 12 * 60 * 60 * 1000 < now.getTime()) {
    return `${monthDay}, ${Number(year) + 1}`;
  }
  return `${monthDay}, ${year}`;
}

function paceEvents(html) {
  const seen = new Set();
  const blocks = [...html.matchAll(/<div class="c--component c--events-listing-component"[\s\S]*?<\/section>/g)].map((m) => m[0]);

  return blocks
    .map((block) => {
      const href = (block.match(/href="(\/event\/[^"]+)"/) || [])[1];
      if (!href || seen.has(href)) return null;
      seen.add(href);
      const title = fieldText(block, "cta-title") || stripHtml((block.match(/href="\/event\/[^"]+"[^>]*>([\s\S]*?)<\/a>/) || [])[1] || "");
      if (!title) return null;
      const timeText = fieldText(block, "date-string");
      const body = fieldText(block, "text");
      const monthDay = fieldText(block, "category");
      if (/pleasantville/i.test(body)) return null;
      const clocks = [...timeText.matchAll(/(\d{1,2}:\d{2}\s*[ap]m)/gi)].map((m) => m[1]);
      const dateStr = /[A-Za-z]+ \d{1,2}/.test(monthDay) ? withYear(monthDay) : "";
      const start = dateStr ? parseDate(`${dateStr} ${clocks[0] || "12:00 pm"}`) : null;
      const end = dateStr ? parseDate(`${dateStr} ${clocks[1] || clocks[0] || "1:00 pm"}`) : null;
      return toCampusEvent(
        {
          id: `official-pace-${href}`,
          title,
          description: body && body !== "Image …" ? body : `${title} is listed on the Pace University events calendar.`,
          location: `${title} ${body}`,
          start,
          end: end && start && end <= start ? new Date(start.getTime() + 90 * 60 * 1000) : end,
          url: `https://www.pace.edu${href}`,
          host: "Pace Events",
        },
        "pace",
        { unknownLocation: "tbd" },
      );
    })
    .filter(Boolean);
}

function cooperEvents(html) {
  const items = [...html.matchAll(/<h3>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>[\s\S]*?<time>([\s\S]*?)<\/time>/g)];
  return items
    .map((item) => {
      const href = item[1];
      const title = stripHtml(item[2] || "");
      const time = stripHtml(item[3] || "");
      const after = item[0];
      const description = stripHtml((after.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || "");
      if (!title || !time) return null;
      const datePart = (time.match(/[A-Za-z]+ \d{1,2},?\s+\d{4}/) || [])[0];
      const clock = (time.match(/\d{1,2}:\d{2}\s*[ap]m/i) || [])[0] || "6:00pm";
      const start = datePart ? parseDate(`${datePart} ${clock}`) : null;
      const end = start ? new Date(start.getTime() + 90 * 60 * 1000) : null;
      const location = /online|zoom|virtual/i.test(`${title} ${description}`) ? "Online" : "Foundation Building";
      return toCampusEvent(
        {
          id: `official-cooper-${href || title}`,
          title,
          description: description || `${title} is listed on Cooper Union Events & Exhibitions.`,
          location,
          start,
          end,
          url: href ? (href.startsWith("http") ? href : `https://cooper.edu${href}`) : CAMPUS_META.cooper.page,
          host: "Cooper Union Events",
        },
        "cooper",
      );
    })
    .filter(Boolean);
}

function tribeEvents(payload, campusId) {
  const rows = payload?.events ?? [];
  return rows
    .map((row) => {
      const venue = row.venue && typeof row.venue === "object" ? row.venue : {};
      const locationName = venue.venue || venue.address || "";
      const start = fromNyLocal(String(row.start_date || "").slice(0, 10), String(row.start_date || "").slice(11, 16).replace(":", "") || 1200);
      const end = fromNyLocal(String(row.end_date || row.start_date || "").slice(0, 10), String(row.end_date || "").slice(11, 16).replace(":", "") || 1300);
      return toCampusEvent(
        {
          id: `official-${campusId}-tribe-${row.id || row.title}`,
          title: stripHtml(row.title),
          description: stripHtml(row.excerpt || row.description) || `${stripHtml(row.title)} is listed on the official campus calendar.`,
          location:
            venue.geo_lat != null
              ? { name: locationName, lat: Number(venue.geo_lat), lng: Number(venue.geo_lng) }
              : locationName,
          start,
          end,
          url: row.url,
          host: CAMPUS_META[campusId]?.host,
          types: (row.categories ?? []).map((category) => category.name).filter(Boolean),
        },
        campusId,
        { unknownLocation: "tbd" },
      );
    })
    .filter(Boolean);
}

function campusLabsEvents(payload, campusId, page) {
  const rows = payload?.value ?? payload?.results ?? [];
  return rows
    .map((row) => {
      const start = parseDate(row.startsOn);
      const end = parseDate(row.endsOn) || (start ? new Date(start.getTime() + 90 * 60 * 1000) : null);
      const location = row.location || "";
      const point = Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude))
        ? { name: location, lat: Number(row.latitude), lng: Number(row.longitude) }
        : location;
      return toCampusEvent(
        {
          id: `official-${campusId}-engage-${row.id || row.name}`,
          title: row.name,
          description: stripHtml(row.description) || `${row.name} is listed on the official campus calendar.`,
          location: point,
          start,
          end,
          url: row.id ? `${page.replace(/\/$/, "")}/event/${row.id}` : page,
          host: row.organizationName || CAMPUS_META[campusId]?.host,
          types: row.categoryNames ?? [row.theme].filter(Boolean),
        },
        campusId,
        { unknownLocation: "tbd" },
      );
    })
    .filter(Boolean);
}

function htmlListEvents(html, campusId, page) {
  const items = [...html.matchAll(/<(?:article|li|div)[^>]{0,200}(?:event|teaser|calendar-item)[^>]*>[\s\S]{0,1800}?<\/(?:article|li|div)>/gi)]
    .map((m) => m[0])
    .slice(0, 80);
  return items
    .map((item, index) => {
      const title = stripHtml((item.match(/<h[123][^>]*>([\s\S]*?)<\/h[123]>/) || [])[1] || "");
      const href = (item.match(/href="([^"]+)"/) || [])[1];
      const time = stripHtml((item.match(/<time[^>]*>([\s\S]*?)<\/time>/) || item.match(/datetime="([^"]+)"/) || [])[1] || "");
      const description = stripHtml((item.match(/<p[^>]*>([\s\S]*?)<\/p>/) || [])[1] || "");
      if (!title) return null;
      const start = parseDate(time) || parseDate((item.match(/[A-Za-z]+ \d{1,2},?\s+\d{4}(?:\s+\d{1,2}:\d{2}\s*[ap]m)?/i) || [])[0]);
      const end = start ? new Date(start.getTime() + 90 * 60 * 1000) : null;
      return toCampusEvent(
        {
          id: `official-${campusId}-html-${href || index}`,
          title,
          description: description || `${title} is listed on the official campus calendar.`,
          location: `${title} ${description}`,
          start,
          end,
          url: href ? (href.startsWith("http") ? href : new URL(href, page).toString()) : page,
          host: CAMPUS_META[campusId]?.host,
        },
        campusId,
        { unknownLocation: "tbd" },
      );
    })
    .filter(Boolean);
}

function withCampusId(events, campusId) {
  return events.map((event) => ({ ...event, campusId: event.campusId || campusId, source: event.source || "university-life" }));
}

async function refreshCampus(campusId) {
  const meta = CAMPUS_META[campusId] ?? CAMPUS_META.columbia;

  if (campusId === "columbia" || campusId === "barnard") {
    const payload = await loadUniversityLifeEvents();
    return {
      ...payload,
      events: withCampusId(payload.events ?? [], "columbia"),
    };
  }

  let events = [];
  let source = "official-calendar";
  let page = meta.page;

  try {
    if (campusId === "nyu") {
      const xml = await fetchText("https://events.nyu.edu/live/rss/events/max/100").catch(() =>
        fetchText("https://events.nyu.edu/live/rss/events"),
      );
      events = nyuEvents(xml);
      source = "nyu-events";
    } else if (COURSEDOG_PAGES[campusId]) {
      const html = await fetchText(COURSEDOG_PAGES[campusId]);
      events = coursedogEvents(html, campusId);
      source = "coursedog";
      page = COURSEDOG_PAGES[campusId];
      if (CUNY_COLLEGE_NAMES[campusId]) {
        const rss = await fetchTextSafe("https://events.cuny.edu/feed");
        if (rss) events = [...events, ...cunyRssEvents(rss, campusId)];
      }
      if (campusId === "brooklyn") {
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
        const tribeJson = await fetchTextSafe(
          `https://www.brooklyn.edu/wp-json/tribe/events/v1/events?per_page=50&start_date=${today}`,
        );
        if (tribeJson) {
          const tribe = tribeEvents(JSON.parse(tribeJson), campusId);
          events = [...events, ...tribe];
          if (tribe.length) {
            source = "brooklyn-events";
            page = "https://www.brooklyn.edu/events/";
          }
        }
      }
    } else if (campusId === "pace") {
      events = paceEvents(await fetchText(meta.page));
      source = "pace-events";
    } else if (campusId === "cooper") {
      events = cooperEvents(await fetchText(meta.page));
      source = "cooper-events";
    } else if (campusId === "newschool") {
      const json = JSON.parse(
        await fetchText(
          `https://newschool.campuslabs.com/engage/api/discovery/event/search?take=80&endsAfter=${encodeURIComponent(new Date().toISOString())}`,
        ),
      );
      events = campusLabsEvents(json, campusId, "https://newschool.campuslabs.com/engage");
      source = "newschool-engage";
      page = "https://newschool.campuslabs.com/engage/events";
    } else if (campusId === "fordham") {
      const html = await fetchTextSafe("https://www.fordham.edu/calendar");
      events = htmlListEvents(html, campusId, meta.page);
      source = events.length ? "fordham-calendar" : "fordham-calendar-blocked";
    }
  } catch (error) {
    if (!events.length) throw error;
  }

  events = dedupe(events);
  const pinned = events.filter((event) => event.locationKind !== "tbd");
  const tbd = events.filter((event) => event.locationKind === "tbd").slice(0, 20);
  events = [...pinned, ...tbd].slice(0, 80);
  events = await summarizeListings(events);
  return { events, fetchedAt: new Date().toISOString(), source, page };
}

export function normalizeCampusId(value) {
  const id = String(value ?? "columbia").toLowerCase().replace(/[^a-z]/g, "");
  if (id === "barnard") return "barnard";
  if (CAMPUS_META[id]) return id;
  return "columbia";
}

export async function loadOfficialEvents(campusId = "columbia") {
  const id = normalizeCampusId(campusId);
  const now = Date.now();
  const cached = caches.get(id);
  if (cached && now - cached.at < CACHE_MS) return cached.payload;
  if (inflight.has(id)) return inflight.get(id);
  const pending = refreshCampus(id)
    .then((payload) => {
      caches.set(id, { at: Date.now(), payload });
      return payload;
    })
    .finally(() => {
      inflight.delete(id);
    });
  inflight.set(id, pending);
  return pending;
}
