/**
 * Live events from University Life (universitylife.columbia.edu/events).
 * The Drupal listing embeds `var events_data = [...]`. When that page is
 * blocked, fall back to the same Bedework calendar the listing imports from.
 */

const ULIFE_PAGE = "https://universitylife.columbia.edu/events";
const BEDEWORK_FEED =
  "https://events.columbia.edu/feeder/main/eventsFeed.do?f=y&sort=dtstart.utc:asc&skinName=list-json&count=100";
const CACHE_MS = 2 * 60 * 1000;
const BROWSER_HEADERS = {
  Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
};

/** Official map labels plus nearby campus buildings used only for pin placement. */
const CAMPUS_PLACES = [
  { match: ["grant's tomb", "grants tomb"], name: "Grant’s Tomb", x: 6.2, y: 4.2 },
  { match: ["riverside church"], name: "Riverside Church", x: 6.4, y: 10.8 },
  { match: ["union theological"], name: "Union Theological", x: 30.1, y: 8.8 },
  { match: ["horace mann"], name: "Horace Mann", x: 48.2, y: 8.9 },
  { match: ["grace dodge"], name: "Grace Dodge", x: 58.4, y: 8.9 },
  { match: ["school of social work"], name: "School of Social Work", x: 79.6, y: 8.9 },
  { match: ["interchurch"], name: "Interchurch Center", x: 18, y: 16.1 },
  { match: ["knox hall"], name: "Knox Hall", x: 30.1, y: 16.1 },
  { match: ["zankel"], name: "Zankel Hall", x: 53, y: 16.2 },
  { match: ["altschul"], name: "Altschul Hall", x: 18, y: 23.8 },
  { match: ["northwest corner", "northwest building"], name: "Northwest Corner", x: 43.2, y: 23.6 },
  { match: ["schapiro cepsr", "cepsr"], name: "Schapiro CEPSR", x: 53.2, y: 23.5 },
  { match: ["mudd"], name: "Mudd Building", x: 63.8, y: 23.6 },
  { match: ["pupin"], name: "Pupin Hall", x: 42.2, y: 22.4 },
  { match: ["dodge fitness", "dodge physical"], name: "Dodge Fitness Center", x: 40.2, y: 21.2 },
  { match: ["milbank"], name: "Milbank Hall", x: 30.1, y: 28.4 },
  { match: ["fairchild"], name: "Fairchild Hall", x: 61.2, y: 28.4 },
  { match: ["chandler"], name: "Chandler Hall", x: 42.4, y: 31.6 },
  { match: ["havemeyer"], name: "Havemeyer Hall", x: 48.6, y: 31.5 },
  { match: ["uris"], name: "Uris Hall", x: 54.8, y: 31.4 },
  { match: ["schermerhorn"], name: "Schermerhorn Hall", x: 64.2, y: 31.6 },
  { match: ["casa italiana"], name: "Casa Italiana", x: 79.6, y: 31.4 },
  { match: ["casa hispanica", "casa hispánica"], name: "Casa Hispánica", x: 38.2, y: 50.6 },
  { match: ["diana center"], name: "The Diana Center", x: 30.1, y: 38.2 },
  { match: ["mathematics"], name: "Mathematics", x: 42.2, y: 40.2 },
  { match: ["earl hall"], name: "Earl Hall", x: 47.6, y: 41.4 },
  { match: ["low library", "low rotunda"], name: "Low Library", x: 53, y: 41.6 },
  { match: ["college walk"], name: "College Walk", x: 52.4, y: 48.8 },
  { match: ["st. paul", "st paul"], name: "St. Paul’s Chapel", x: 64.4, y: 41.2 },
  { match: ["international affairs", "sipa", "iab"], name: "International Affairs", x: 77.2, y: 40.8 },
  { match: ["fayerweather"], name: "Fayerweather Hall", x: 72.4, y: 38.2 },
  { match: ["avery"], name: "Avery Hall", x: 71.6, y: 36.8 },
  { match: ["faculty house"], name: "Faculty House", x: 84.2, y: 41.6 },
  { match: ["barnard hall"], name: "Barnard Hall", x: 27.2, y: 46.4 },
  { match: ["hewitt", "brooks"], name: "Hewitt & Brooks", x: 33.8, y: 47.8 },
  { match: ["dodge hall"], name: "Dodge Hall", x: 42.4, y: 47.2 },
  { match: ["philosophy"], name: "Philosophy Hall", x: 64.2, y: 47.4 },
  { match: ["kent hall"], name: "Kent Hall", x: 64.8, y: 50.2 },
  { match: ["jerome greene", "columbia law", "law school"], name: "Jerome Greene Hall", x: 78.4, y: 47.6 },
  { match: ["warren hall", "william and june warren"], name: "Warren Hall", x: 71.2, y: 57.4 },
  { match: ["schapiro hall"], name: "Schapiro Hall", x: 30.1, y: 55.4 },
  { match: ["pulitzer"], name: "Pulitzer Hall", x: 41.6, y: 55.4 },
  { match: ["hamilton"], name: "Hamilton Hall", x: 46.2, y: 55.4 },
  { match: ["south field"], name: "South Field", x: 56.8, y: 55.6 },
  { match: ["hartley", "wallach"], name: "Hartley & Wallach", x: 64.6, y: 55.4 },
  { match: ["east campus"], name: "East Campus", x: 79.6, y: 55.5 },
  { match: ["wien"], name: "Wien Hall", x: 79.6, y: 62.4 },
  { match: ["lerner"], name: "Lerner Hall", x: 41.8, y: 63.1 },
  { match: ["butler"], name: "Butler Library", x: 53.2, y: 63.1 },
  { match: ["john jay"], name: "John Jay Hall", x: 64.4, y: 63.1 },
  { match: ["alumni center"], name: "Alumni Center", x: 30.1, y: 70.6 },
  { match: ["hogan"], name: "Hogan Hall", x: 53, y: 70.6 },
  { match: ["mcbain"], name: "McBain Hall", x: 53, y: 78.2 },
];

const CATEGORY_RULES = [
  { category: "Free Food", re: /\b(pizza|lunch provided|free food|dining|sushi|food pantry|snap)\b/i },
  { category: "Career", re: /\b(career|internship|interview|employer|job|recruit|resume|externship|info session|information session)\b/i },
  { category: "Sports", re: /\b(yoga|fitness|hiit|recreation|intramural|athletics|wellness seminar)\b/i },
  { category: "Academic", re: /\b(seminar|lecture|colloquium|workshop|grand rounds|library|study|teaching|research|symposium|class)\b/i },
  { category: "Entertainment", re: /\b(film|concert|music|cinema|screening|performance|yoga class)\b/i },
];

let cache = { at: 0, payload: null };

function decode(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\\u00a0/g, " ")
    .replace(/\t+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value) {
  return decode(String(value ?? "").replace(/<[^>]+>/g, " "));
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
  const iso = String(value).replace("Z", "+00:00");
  const date = new Date(iso);
  return Number.isNaN(date.valueOf()) ? null : date;
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

function classifyLocation(raw) {
  const text = decode(raw);
  const compact = text.toLowerCase();
  if (!text || /^(tbd|tba|n\/?a|none|location (tbd|tba))$/i.test(text) || /to be (announced|determined)/i.test(text)) {
    return { kind: "tbd", name: "Location TBD", address: "Location to be announced" };
  }
  if (
    /^(online|online event|virtual|remote|zoom)\b/i.test(text) ||
    (/\b(online event|virtual event|zoom)\b/i.test(text) && !/\d{2,}\s+(w\.|west|broadway|amsterdam)/i.test(text))
  ) {
    return { kind: "remote", name: "Remote", address: text || "Online event" };
  }

  for (const place of CAMPUS_PLACES) {
    if (place.match.some((needle) => compact.includes(needle))) {
      return { kind: "mapped", name: place.name, address: text, x: place.x, y: place.y };
    }
  }
  return { kind: "offCampus", name: text.split(",")[0].trim() || text, address: text };
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

const STYLE = {
  "Free Food": { markerColor: "coral", iconType: "pizza" },
  Social: { markerColor: "pink", iconType: "users" },
  Academic: { markerColor: "blue", iconType: "book" },
  Career: { markerColor: "orange", iconType: "briefcase" },
  Sports: { markerColor: "green", iconType: "run" },
  Entertainment: { markerColor: "purple", iconType: "music" },
};

function toCampusEvent({ id, title, description, location, start, end, url, host }) {
  const whenStart = parseDate(start);
  const whenEnd = parseDate(end);
  if (!whenStart || !whenEnd || whenEnd <= new Date()) return null;
  if (whenEnd - whenStart > 5 * 24 * 60 * 60 * 1000) return null;
  if (/guest access|bedework application/i.test(title)) return null;

  const place = classifyLocation(location);
  if (place.kind === "offCampus") return null;

  const category = categoryFor(title, description);
  const style = STYLE[category];
  return {
    id,
    title: decode(title),
    category,
    locationName: place.name,
    address: place.address,
    description: stripHtml(description) || "Listed on University Life.",
    mapX: place.x ?? 50,
    mapY: place.y ?? 50,
    distance: place.kind === "remote" ? "Remote" : place.kind === "tbd" ? "Location TBD" : "On campus",
    timeStatus: timeStatusOf(whenStart, whenEnd),
    startTime: clockOf(whenStart),
    endTime: clockOf(whenEnd),
    dateLabel: dateLabelOf(whenStart),
    startsAt: whenStart.toISOString(),
    goingCount: 0,
    interestedCount: 0,
    host: decode(host) || "University Life",
    markerColor: style.markerColor,
    iconType: style.iconType,
    locationKind: place.kind,
    sourceUrl: url || ULIFE_PAGE,
    source: "university-life",
  };
}

function parseEventsData(html) {
  const match = html.match(/var events_data = (\[[\s\S]*?\]);/);
  if (!match) return [];
  const rows = JSON.parse(match[1]);
  return rows
    .map((row) =>
      toCampusEvent({
        id: `ulife-${row.nid || row.event_id || row.path}`,
        title: row.title,
        description: row.views_conditional_field,
        location: row.location,
        start: row.from_timestamp_local || row.from_timestamp,
        end: row.to_timestamp_local || row.to_timestamp,
        url: row.path ? `https://universitylife.columbia.edu${row.path}` : ULIFE_PAGE,
        host: row.field_cu_event_contact_name,
      }),
    )
    .filter(Boolean);
}

function parseBedework(body) {
  const rows = body?.bwEventList?.events ?? [];
  return rows
    .map((row) => {
      const location = row.location && typeof row.location === "object" ? row.location.address : row.location;
      return toCampusEvent({
        id: `ulife-${row.guid || row.summary}`,
        title: row.summary,
        description: row.description,
        location,
        start: row.startDate,
        end: row.endDate,
        url: row.eventlink || row.link,
        host: row.contact?.name,
      });
    })
    .filter(Boolean);
}

async function fetchText(url) {
  const response = await fetch(url, { headers: BROWSER_HEADERS, redirect: "follow" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

export async function loadUniversityLifeEvents() {
  const now = Date.now();
  if (cache.payload && now - cache.at < CACHE_MS) return cache.payload;

  let events = [];
  let source = "columbia-calendar";

  try {
    const html = await fetchText(ULIFE_PAGE);
    if (!html.includes("Just a moment") && !html.includes("cf-mitigated")) {
      events = parseEventsData(html);
      if (events.length) source = "university-life";
    }
  } catch {
    // Bedework is the same calendar the University Life listing imports.
  }

  if (events.length === 0) {
    const json = JSON.parse(await fetchText(BEDEWORK_FEED));
    events = parseBedework(json);
    source = "columbia-calendar";
  }

  const seen = new Set();
  events = events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });

  const payload = { events, fetchedAt: new Date().toISOString(), source, page: ULIFE_PAGE };
  cache = { at: now, payload };
  return payload;
}
