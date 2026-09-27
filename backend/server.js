import express from 'express';
import http from 'node:http';
import net from 'node:net';
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, writeFileSync, unlinkSync, readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadOfficialEvents } from './official-events.js';
import { loadUniversityLifeEvents } from './university-life.js';
import {
  getSpectrumApp,
  handleSpectrumWebhook,
  listenSpectrumMessages,
  sendSpectrumCode,
  sendSpectrumNotice,
  sendSpectrumWelcome,
  setInboundHandler,
  setPendingCodeLookup,
  spectrumConfigured,
  toE164,
} from './spectrum-agent.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const dataDirectory = join(root, 'data');
mkdirSync(dataDirectory, { recursive: true });

// better-sqlite3 needs a compiled native binding; node:sqlite (Node 22.5+) is the fallback.
async function openDatabase(file) {
  try {
    const { default: Database } = await import('better-sqlite3');
    return new Database(file);
  } catch {
    const { DatabaseSync } = await import('node:sqlite');
    return new DatabaseSync(file);
  }
}

const db = await openDatabase(join(dataDirectory, 'events.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    players_needed INTEGER,
    joined_count INTEGER NOT NULL DEFAULT 0,
    closes_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT NOT NULL UNIQUE,
    college TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS event_attendees (
    event_id INTEGER NOT NULL REFERENCES events(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id)
  )
`);

const existingUserColumns = new Set(db.prepare('PRAGMA table_info(users)').all().map((column) => column.name));
if (!existingUserColumns.has('profile_private')) {
  db.exec('ALTER TABLE users ADD COLUMN profile_private INTEGER NOT NULL DEFAULT 0');
}
if (!existingUserColumns.has('two_factor_enabled')) {
  db.exec('ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER NOT NULL DEFAULT 1');
}
if (!existingUserColumns.has('photon_notifications_enabled')) {
  db.exec('ALTER TABLE users ADD COLUMN photon_notifications_enabled INTEGER NOT NULL DEFAULT 1');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    phone TEXT NOT NULL,
    code_salt TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);
const existingResetColumns = new Set(
  db.prepare('PRAGMA table_info(password_resets)').all().map((column) => column.name),
);
if (!existingResetColumns.has('token')) {
  db.exec('ALTER TABLE password_resets ADD COLUMN token TEXT');
}
if (!existingResetColumns.has('purpose')) {
  db.exec("ALTER TABLE password_resets ADD COLUMN purpose TEXT NOT NULL DEFAULT 'password_reset'");
}
if (!existingResetColumns.has('inbound_verified')) {
  db.exec('ALTER TABLE password_resets ADD COLUMN inbound_verified INTEGER NOT NULL DEFAULT 0');
}
if (!existingResetColumns.has('code_plain')) {
  db.exec('ALTER TABLE password_resets ADD COLUMN code_plain TEXT');
}

// The first release stored only coordinates and a title; the map needs more.
const EVENT_COLUMN_ADDITIONS = {
  description: "TEXT NOT NULL DEFAULT ''",
  location_name: "TEXT NOT NULL DEFAULT ''",
  address: "TEXT NOT NULL DEFAULT ''",
  host: "TEXT NOT NULL DEFAULT ''",
  starts_at: 'TEXT',
  created_by: 'INTEGER',
  location_kind: "TEXT NOT NULL DEFAULT 'mapped'",
};
const existingEventColumns = new Set(db.prepare('PRAGMA table_info(events)').all().map((column) => column.name));
for (const [column, definition] of Object.entries(EVENT_COLUMN_ADDITIONS)) {
  if (!existingEventColumns.has(column)) db.exec(`ALTER TABLE events ADD COLUMN ${column} ${definition}`);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS event_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id),
    filename TEXT NOT NULL,
    mime TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);
const eventImageDirectory = join(dataDirectory, 'event-images');
mkdirSync(eventImageDirectory, { recursive: true });
const MAX_EVENT_IMAGES = 4;
const MAX_EVENT_IMAGE_BYTES = 1_500_000;

const app = express();
const port = Number(process.env.PORT) || 3000;
const frontendPort = Number(process.env.FRONTEND_PORT) || 3001;
const CAMPUSES = [
  { id: 'columbia', south: 40.8007, west: -73.97235, north: 40.81395, east: -73.95255 },
  { id: 'nyu', south: 40.724, west: -74.004, north: 40.7353, east: -73.9904 },
  { id: 'newschool', south: 40.732, west: -74.0, north: 40.74, east: -73.9874 },
  { id: 'fordham', south: 40.8562, west: -73.8942, north: 40.865, east: -73.8802 },
  { id: 'pace', south: 40.7064, west: -74.0104, north: 40.715, east: -74.0 },
  { id: 'cooper', south: 40.7238, west: -73.9958, north: 40.7322, east: -73.987 },
  { id: 'baruch', south: 40.7366, west: -73.9916, north: 40.7446, east: -73.9788 },
  { id: 'ccny', south: 40.8154, west: -73.9566, north: 40.824, east: -73.944 },
  { id: 'hunter', south: 40.7642, west: -73.9702, north: 40.7724, east: -73.959 },
  { id: 'brooklyn', south: 40.6266, west: -73.9586, north: 40.6346, east: -73.9462 },
  { id: 'queens', south: 40.733, west: -73.8252, north: 40.7406, east: -73.815 },
  { id: 'stjohns', south: 40.7176, west: -73.8014, north: 40.7264, east: -73.7896 },
  { id: 'stevens', south: 40.7406, west: -74.0306, north: 40.7484, east: -74.021 },
];

function campusBounds(campusId) {
  const id = String(campusId ?? '').toLowerCase();
  if (id === 'barnard') return CAMPUSES.find((campus) => campus.id === 'columbia');
  return CAMPUSES.find((campus) => campus.id === id) ?? null;
}

function inBounds(bounds, latitude, longitude) {
  return (
    latitude >= bounds.south &&
    latitude <= bounds.north &&
    longitude >= bounds.west &&
    longitude <= bounds.east
  );
}

function isOnCampus(latitude, longitude) {
  return CAMPUSES.some((campus) => inBounds(campus, latitude, longitude));
}

const EVENT_CATEGORIES = new Set(['Free Food', 'Social', 'Academic', 'Career', 'Sports', 'Entertainment']);

/**
 * Mirrors mapToGeo() in the frontend's lib/geo.ts so seed positions line up
 * with the hand-drawn campus map. The real street grid runs ~29° east of north.
 */
const MAP_ORIGIN_GEO = { lat: 40.80797, lng: -73.96391 };
const MAP_ORIGIN_POINT = { x: 12.2, y: 11.2 };
const GRID_BEARING = (29 * Math.PI) / 180;
const METERS_PER_DEG_LAT = 111_320;
const METERS_PER_DEG_LNG = METERS_PER_DEG_LAT * Math.cos((MAP_ORIGIN_GEO.lat * Math.PI) / 180);
const CROSSTOWN_METERS_PER_PCT = 290 / 80;
const UPTOWN_METERS_PER_PCT = 80 / 24.9;

function mapPointToGeo(x, y) {
  const crosstown = (x - MAP_ORIGIN_POINT.x) * CROSSTOWN_METERS_PER_PCT;
  const uptown = (MAP_ORIGIN_POINT.y - y) * UPTOWN_METERS_PER_PCT;
  const north = uptown * Math.cos(GRID_BEARING) - crosstown * Math.sin(GRID_BEARING);
  const east = uptown * Math.sin(GRID_BEARING) + crosstown * Math.cos(GRID_BEARING);
  return {
    latitude: MAP_ORIGIN_GEO.lat + north / METERS_PER_DEG_LAT,
    longitude: MAP_ORIGIN_GEO.lng + east / METERS_PER_DEG_LNG,
  };
}

function todayAt(clock) {
  const [hours, minutes] = clock.split(':').map(Number);
  const when = new Date();
  when.setHours(hours, minutes, 0, 0);
  return when.toISOString();
}

const DEMO_EVENT_TITLES = [
  'Free Pizza',
  'Live Music',
  'AI Study Session',
  'Startup Networking',
  'Study Session',
  'Pickup Basketball',
  'Campus Meetup',
  'Smoke Test Soccer',
];
const demoTitleList = DEMO_EVENT_TITLES.map((title) => `'${title.replaceAll("'", "''")}'`).join(', ');
db.exec(`DELETE FROM event_attendees WHERE event_id IN (SELECT id FROM events WHERE title IN (${demoTitleList}))`);
db.exec(`DELETE FROM events WHERE title IN (${demoTitleList})`);

app.post('/api/spectrum/webhook', express.raw({ type: '*/*' }), async (request, response) => {
  const result = await handleSpectrumWebhook(request.body, request.headers);
  response.status(result.status).set(result.headers).send(Buffer.from(result.body));
});

app.use(express.json({ limit: '3mb' }));
app.use(express.static(join(root, 'dist')));

const USER_COLUMNS =
  'id, name, email, phone, college, profile_private, two_factor_enabled, photon_notifications_enabled';

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? null,
    phone: row.phone,
    college: row.college,
    profilePrivate: Boolean(row.profile_private),
    twoFactorEnabled: row.two_factor_enabled !== 0,
    photonNotificationsEnabled: row.photon_notifications_enabled !== 0,
  };
}

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') };
}

function passwordMatches(password, salt, expectedHash) {
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function phoneDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function findUserByPhone(phone) {
  const clean = typeof phone === 'string' ? phone.trim() : '';
  if (!clean) return null;
  const exact = db.prepare('SELECT * FROM users WHERE phone = ?').get(clean);
  if (exact) return exact;
  const digits = phoneDigits(clean);
  if (digits.length < 7) return null;
  return (
    db.prepare('SELECT * FROM users').all().find((row) => phoneDigits(row.phone) === digits) ?? null
  );
}

function maskPhone(phone) {
  const digits = phoneDigits(phone);
  if (digits.length < 4) return 'your phone';
  return `•••• ${digits.slice(-4)}`;
}

function findAccountByIdentifier(identifier) {
  const clean = typeof identifier === 'string' ? identifier.trim() : '';
  if (!clean) return null;
  return db.prepare('SELECT * FROM users WHERE email = ?').get(clean.toLowerCase()) ?? findUserByPhone(clean);
}

function latestChallenge(userId, purpose) {
  if (!userId) return null;
  return db
    .prepare(
      `SELECT * FROM password_resets WHERE user_id = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(userId, purpose);
}

async function issueChallenge(account, purpose) {
  const latest = latestChallenge(account.id, purpose);
  if (latest && Date.now() - new Date(latest.created_at).getTime() < 45_000) {
    const error = new Error('Wait a moment before requesting another code.');
    error.status = 429;
    throw error;
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const { salt, hash } = hashPassword(code);
  const now = new Date();
  const token = randomBytes(16).toString('hex');
  db.prepare('DELETE FROM password_resets WHERE user_id = ? AND purpose = ?').run(account.id, purpose);
  db.prepare(
    `INSERT INTO password_resets
      (user_id, phone, code_salt, code_hash, expires_at, created_at, token, purpose, inbound_verified, code_plain)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
  ).run(
    account.id,
    account.phone,
    salt,
    hash,
    new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    now.toISOString(),
    token,
    purpose,
    code,
  );

  let channel = 'demo';
  let sendError;
  let assignedLine;
  let lineLink;
  try {
    const sent = await sendSpectrumCode(account.phone, code, purpose, account.name);
    if (sent.delivered) channel = sent.channel;
    sendError = sent.sendError;
    assignedLine = sent.assignedLine;
    lineLink = sent.lineLink;
  } catch (error) {
    sendError = error.message;
    console.error('Photon Spectrum could not send a code:', error.message);
  }

  if (channel === 'demo') {
    console.log(`${purpose} code for ${maskPhone(account.phone)}: ${code}`);
  }

  return {
    challengeId: token,
    phoneHint: maskPhone(account.phone),
    e164: toE164(account.phone) || undefined,
    expiresInMinutes: 10,
    channel,
    connected: spectrumConfigured(),
    sendError,
    assignedLine,
    lineLink,
    demoCode: channel === 'demo' ? code : undefined,
  };
}

function readChallenge(token, purpose) {
  if (!token) return null;
  return db.prepare('SELECT * FROM password_resets WHERE token = ? AND purpose = ?').get(token, purpose);
}

function assertChallenge(row, { code = '', inbound = false } = {}) {
  if (!row) {
    const error = new Error('Request a new code, then try again.');
    error.status = 400;
    throw error;
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM password_resets WHERE id = ?').run(row.id);
    const error = new Error('That code expired. Request a new one.');
    error.status = 400;
    throw error;
  }
  if (row.attempts >= 5) {
    db.prepare('DELETE FROM password_resets WHERE id = ?').run(row.id);
    const error = new Error('Too many tries. Request a new code.');
    error.status = 401;
    throw error;
  }
  if (inbound) {
    if (!row.inbound_verified) {
      const error = new Error('Reply to the iMessage with your code, or enter it here.');
      error.status = 401;
      throw error;
    }
    return row;
  }
  if (String(code).replace(/\D/g, '').length !== 6) {
    const error = new Error('Enter the 6-digit code we sent.');
    error.status = 400;
    throw error;
  }
  if (!passwordMatches(code.replace(/\D/g, ''), row.code_salt, row.code_hash)) {
    db.prepare('UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?').run(row.id);
    const error = new Error('That code is incorrect.');
    error.status = 401;
    throw error;
  }
  return row;
}

function finishLogin(account) {
  const user = publicUser(db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(account.id));
  return { token: startSession(user.id), user };
}

setInboundHandler(({ phone, code }) => {
  const account = findUserByPhone(phone);
  if (!account) return 'unknown';
  const row = db
    .prepare(
      `SELECT * FROM password_resets WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(account.id);
  if (!row) return 'unknown';
  try {
    assertChallenge(row, { code });
    db.prepare('UPDATE password_resets SET inbound_verified = 1 WHERE id = ?').run(row.id);
    return 'verified';
  } catch {
    return 'unknown';
  }
});

setPendingCodeLookup(({ phone }) => {
  const account = findUserByPhone(phone);
  if (!account) return null;
  const row = db
    .prepare(
      `SELECT * FROM password_resets WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(account.id);
  if (!row || !row.code_plain) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;
  return {
    code: row.code_plain,
    kind: row.purpose === 'login_2fa' ? 'sign-in' : 'password reset',
  };
});

function startSession(userId) {
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);
  return token;
}

function bearerToken(request) {
  const header = request.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function currentUser(request) {
  const token = bearerToken(request);
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT users.id, users.name, users.email, users.phone, users.college, users.profile_private, users.two_factor_enabled, users.photon_notifications_enabled
       FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ?`,
    )
    .get(token);
  return publicUser(row);
}

function requireUser(request, response, next) {
  const user = currentUser(request);
  if (!user) return response.status(401).json({ error: 'Sign in to continue.' });
  request.user = user;
  next();
}

app.post('/api/auth/signup', (request, response) => {
  const { name, email, phone, password, college } = request.body ?? {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
  const cleanCollege = typeof college === 'string' ? college.trim() : '';
  const cleanEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;

  if (!cleanName) return response.status(400).json({ error: 'Enter your full name.' });
  if (!cleanPhone) return response.status(400).json({ error: 'Enter your phone number.' });
  if (!cleanCollege) return response.status(400).json({ error: 'Choose your college or university.' });
  if (typeof password !== 'string' || password.length < 8) {
    return response.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return response.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (db.prepare('SELECT id FROM users WHERE phone = ?').get(cleanPhone)) {
    return response.status(409).json({ error: 'An account already uses that phone number.' });
  }
  if (cleanEmail && db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail)) {
    return response.status(409).json({ error: 'An account already uses that email address.' });
  }

  const { salt, hash } = hashPassword(password);
  const result = db
    .prepare(
      'INSERT INTO users (name, email, phone, college, password_salt, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(cleanName, cleanEmail, cleanPhone, cleanCollege, salt, hash);
  const user = publicUser(db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(result.lastInsertRowid));
  void sendSpectrumWelcome(cleanPhone, cleanName).catch((error) => {
    console.error('Photon welcome iMessage failed:', error.message);
  });
  response.status(201).json({ token: startSession(user.id), user, spectrum: spectrumConfigured() });
});

app.post('/api/auth/login', async (request, response) => {
  const { identifier, password } = request.body ?? {};
  const cleanIdentifier = typeof identifier === 'string' ? identifier.trim() : '';
  if (!cleanIdentifier || typeof password !== 'string' || !password) {
    return response.status(400).json({ error: 'Enter your email or phone and your password.' });
  }
  const account = findAccountByIdentifier(cleanIdentifier);
  if (!account || !passwordMatches(password, account.password_salt, account.password_hash)) {
    return response.status(401).json({ error: 'Those credentials do not match an account.' });
  }
  if (!account.two_factor_enabled) {
    return response.json(finishLogin(account));
  }
  try {
    const challenge = await issueChallenge(account, 'login_2fa');
    response.json({
      requiresSecondFactor: true,
      ...challenge,
    });
  } catch (error) {
    response.status(error.status ?? 500).json({ error: error.message });
  }
});

app.post('/api/auth/verify-login', (request, response) => {
  const challengeId = typeof request.body?.challengeId === 'string' ? request.body.challengeId : '';
  const code = typeof request.body?.code === 'string' ? request.body.code : '';
  const inbound = Boolean(request.body?.inbound);
  const row = readChallenge(challengeId, 'login_2fa');
  try {
    assertChallenge(row, { code, inbound });
    const account = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
    db.prepare('DELETE FROM password_resets WHERE id = ?').run(row.id);
    response.json(finishLogin(account));
  } catch (error) {
    response.status(error.status ?? 500).json({ error: error.message });
  }
});

app.get('/api/auth/challenge/:id', (request, response) => {
  const row =
    readChallenge(request.params.id, 'login_2fa') ?? readChallenge(request.params.id, 'password_reset');
  if (!row) return response.status(404).json({ error: 'That code is no longer active.' });
  response.json({
    challengeId: row.token,
    purpose: row.purpose,
    inboundVerified: Boolean(row.inbound_verified),
    phoneHint: maskPhone(row.phone),
    channel: spectrumConfigured() ? 'imessage' : 'demo',
  });
});

app.get('/api/spectrum/status', (_request, response) => {
  response.json({ connected: spectrumConfigured() });
});

app.post('/api/notices/photon', requireUser, async (request, response) => {
  const account = db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(request.user.id);
  if (!account) return response.status(404).json({ error: 'That account no longer exists.' });
  if (account.photon_notifications_enabled === 0) {
    return response.json({ sent: false, reason: 'disabled' });
  }

  const title = typeof request.body?.title === 'string' ? request.body.title.trim() : '';
  const body = typeof request.body?.body === 'string' ? request.body.body.trim() : '';
  if (!title || !body) return response.status(400).json({ error: 'Need a title and a message.' });

  try {
    const result = await sendSpectrumNotice(account.phone, account.name, title, body);
    response.json({ sent: Boolean(result.delivered), sendError: result.sendError });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', requireUser, (request, response) => {
  response.json({ user: request.user });
});

app.patch('/api/auth/me', requireUser, (request, response) => {
  const { name, email, phone, college, profilePrivate, twoFactorEnabled, photonNotificationsEnabled } =
    request.body ?? {};
  const current = db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(request.user.id);
  if (!current) return response.status(404).json({ error: 'That account no longer exists.' });

  const nextName = typeof name === 'string' ? name.trim() : current.name;
  const nextPhone = typeof phone === 'string' ? phone.trim() : current.phone;
  const nextCollege = typeof college === 'string' ? college.trim() : current.college;
  const nextEmail =
    email === undefined
      ? current.email
      : typeof email === 'string' && email.trim()
        ? email.trim().toLowerCase()
        : null;
  const nextPrivate =
    typeof profilePrivate === 'boolean' ? (profilePrivate ? 1 : 0) : current.profile_private;
  const nextTwoFactor =
    typeof twoFactorEnabled === 'boolean' ? (twoFactorEnabled ? 1 : 0) : current.two_factor_enabled;
  const nextPhotonNotices =
    typeof photonNotificationsEnabled === 'boolean'
      ? photonNotificationsEnabled
        ? 1
        : 0
      : current.photon_notifications_enabled;

  if (!nextName) return response.status(400).json({ error: 'Enter your full name.' });
  if (!nextPhone) return response.status(400).json({ error: 'Enter your phone number.' });
  if (!nextCollege) return response.status(400).json({ error: 'Choose your college or university.' });
  if (nextEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
    return response.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (db.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').get(nextPhone, current.id)) {
    return response.status(409).json({ error: 'An account already uses that phone number.' });
  }
  if (nextEmail && db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(nextEmail, current.id)) {
    return response.status(409).json({ error: 'An account already uses that email address.' });
  }

  db.prepare(
    'UPDATE users SET name = ?, email = ?, phone = ?, college = ?, profile_private = ?, two_factor_enabled = ?, photon_notifications_enabled = ? WHERE id = ?',
  ).run(
    nextName,
    nextEmail,
    nextPhone,
    nextCollege,
    nextPrivate,
    nextTwoFactor,
    nextPhotonNotices,
    current.id,
  );

  response.json({ user: publicUser(db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(current.id)) });
});

app.post('/api/auth/password', requireUser, (request, response) => {
  const { currentPassword, newPassword } = request.body ?? {};
  if (typeof currentPassword !== 'string' || !currentPassword) {
    return response.status(400).json({ error: 'Enter your current password.' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return response.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  const account = db.prepare('SELECT password_salt, password_hash FROM users WHERE id = ?').get(request.user.id);
  if (!account || !passwordMatches(currentPassword, account.password_salt, account.password_hash)) {
    return response.status(401).json({ error: 'Current password is incorrect.' });
  }

  const { salt, hash } = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?').run(salt, hash, request.user.id);
  response.status(204).end();
});

app.post('/api/auth/logout', (request, response) => {
  const token = bearerToken(request);
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  response.status(204).end();
});

app.post('/api/auth/forgot-password', async (request, response) => {
  const phone = typeof request.body?.phone === 'string' ? request.body.phone.trim() : '';
  if (!phone) return response.status(400).json({ error: 'Enter the phone number on your account.' });

  const account = findUserByPhone(phone);
  if (!account) {
    return response.status(404).json({ error: 'No account uses that phone number.' });
  }

  try {
    const challenge = await issueChallenge(account, 'password_reset');
    response.json({ sent: true, ...challenge });
  } catch (error) {
    response.status(error.status ?? 500).json({ error: error.message });
  }
});

app.post('/api/auth/reset-password', (request, response) => {
  const phone = typeof request.body?.phone === 'string' ? request.body.phone.trim() : '';
  const challengeId = typeof request.body?.challengeId === 'string' ? request.body.challengeId : '';
  const code = typeof request.body?.code === 'string' ? request.body.code : '';
  const inbound = Boolean(request.body?.inbound);
  const newPassword = request.body?.newPassword;

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return response.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  const row = challengeId
    ? readChallenge(challengeId, 'password_reset')
    : latestChallenge(findUserByPhone(phone)?.id, 'password_reset');
  const account = row
    ? db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id)
    : findUserByPhone(phone);
  if (!account) return response.status(404).json({ error: 'No account uses that phone number.' });
  try {
    assertChallenge(row, { code, inbound });
    const { salt, hash } = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?').run(salt, hash, account.id);
    db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(account.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(account.id);
    response.json(finishLogin(account));
  } catch (error) {
    response.status(error.status ?? 500).json({ error: error.message });
  }
});

/**
 * `joined_count` is the seeded baseline for demo events; live sign-ups come from
 * event_attendees, so the total the map shows is the sum of both.
 */
const EVENT_FIELDS = `
  events.id, events.title, events.category, events.description, events.location_name,
  events.address, events.host, events.latitude, events.longitude, events.players_needed,
  events.starts_at, events.closes_at, events.created_at, events.created_by, events.location_kind,
  events.joined_count + (
    SELECT COUNT(*) FROM event_attendees WHERE event_attendees.event_id = events.id
  ) AS joined_count
`;

function eventImagePublicUrl(filename) {
  return `/api/event-images/${filename}`;
}

function listEventImages(eventId) {
  return db
    .prepare(
      'SELECT id, filename, mime, is_primary FROM event_images WHERE event_id = ? ORDER BY is_primary DESC, id',
    )
    .all(eventId)
    .map((row) => ({
      id: row.id,
      url: eventImagePublicUrl(row.filename),
      isPrimary: Boolean(row.is_primary),
    }));
}

function attachGoing(row, userId) {
  if (!row) return null;
  const going = userId
    ? db.prepare('SELECT 1 FROM event_attendees WHERE event_id = ? AND user_id = ?').get(row.id, userId)
    : null;
  return { ...row, going: Boolean(going), images: listEventImages(row.id) };
}

function requireEventHost(request, response, eventId) {
  const event = db.prepare('SELECT id, created_by FROM events WHERE id = ?').get(eventId);
  if (!event) {
    response.status(404).json({ error: 'That event does not exist.' });
    return null;
  }
  if (event.created_by !== request.user.id) {
    response.status(403).json({ error: 'Only the host can add photos to this posting.' });
    return null;
  }
  return event;
}

function decodeEventImage(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl ?? ''));
  if (!match) return null;
  const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  if (!buffer.length || buffer.length > MAX_EVENT_IMAGE_BYTES) return null;
  return { mime: match[1], buffer };
}

function findEvent(id, userId) {
  return attachGoing(db.prepare(`SELECT ${EVENT_FIELDS} FROM events WHERE events.id = ?`).get(id), userId);
}

app.get('/api/university-life/events', async (_request, response) => {
  try {
    response.json(await loadUniversityLifeEvents());
  } catch (error) {
    response.status(502).json({ error: 'Could not refresh University Life events.', detail: String(error.message ?? error) });
  }
});

app.get('/api/official-events', async (request, response) => {
  try {
    response.json(await loadOfficialEvents(request.query.campus));
  } catch (error) {
    response.status(502).json({ error: 'Could not refresh official campus events.', detail: String(error.message ?? error) });
  }
});

app.get('/api/events', (request, response) => {
  const viewer = currentUser(request);
  const bounds = campusBounds(request.query.campus);
  const rows = db
    .prepare(`SELECT ${EVENT_FIELDS} FROM events WHERE events.closes_at > ? ORDER BY events.starts_at`)
    .all(new Date().toISOString())
    .filter((row) => !bounds || inBounds(bounds, row.latitude, row.longitude));
  response.json(rows.map((row) => attachGoing(row, viewer?.id)));
});

app.get('/api/events/:id', (request, response) => {
  const event = findEvent(request.params.id, currentUser(request)?.id);
  if (!event) return response.status(404).json({ error: 'That event does not exist.' });
  response.json(event);
});

app.post('/api/events', requireUser, (request, response) => {
  const { title, category, description, locationName, address, latitude, longitude, playersNeeded, startsAt, closesAt, locationKind } =
    request.body ?? {};
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanCategory = typeof category === 'string' ? category.trim() : '';
  const kind = locationKind === 'remote' ? 'remote' : 'mapped';
  const closes = new Date(closesAt);
  const starts = startsAt ? new Date(startsAt) : new Date();

  if (!cleanTitle) return response.status(400).json({ error: 'Give your event a title.' });
  if (!EVENT_CATEGORIES.has(cleanCategory)) {
    return response.status(400).json({ error: 'Choose one of the Campus Connect categories.' });
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !isOnCampus(latitude, longitude)) {
    return response.status(400).json({
      error: kind === 'remote' ? 'Virtual events still need to belong to a campus.' : 'Pick a spot inside the campus map.',
    });
  }
  if (Number.isNaN(starts.valueOf()) || Number.isNaN(closes.valueOf()) || closes <= starts) {
    return response.status(400).json({ error: 'The end time has to come after the start time.' });
  }
  if (closes <= new Date()) {
    return response.status(400).json({ error: 'That event has already ended.' });
  }

  const playerCount = cleanCategory === 'Sports' && playersNeeded != null ? Number(playersNeeded) : null;
  if (playerCount !== null && (!Number.isInteger(playerCount) || playerCount < 1 || playerCount > 99)) {
    return response.status(400).json({ error: 'Sports events need a player count from 1 to 99.' });
  }

  const result = db
    .prepare(
      `INSERT INTO events
         (title, category, description, location_name, address, host, latitude, longitude,
          players_needed, joined_count, starts_at, closes_at, created_by, location_kind)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
    )
    .run(
      cleanTitle,
      cleanCategory,
      typeof description === 'string' ? description.trim() : '',
      typeof locationName === 'string' ? locationName.trim() : kind === 'remote' ? 'Virtual' : '',
      typeof address === 'string' ? address.trim() : kind === 'remote' ? 'Online event' : '',
      request.user.name,
      latitude,
      longitude,
      playerCount,
      starts.toISOString(),
      closes.toISOString(),
      request.user.id,
      kind,
    );
  response.status(201).json(findEvent(result.lastInsertRowid, request.user.id));
});

app.get('/api/event-images/:filename', (request, response) => {
  const filename = basename(String(request.params.filename ?? ''));
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return response.status(404).json({ error: 'That photo does not exist.' });
  }
  const path = join(eventImageDirectory, filename);
  if (!existsSync(path)) return response.status(404).json({ error: 'That photo does not exist.' });
  const row = db.prepare('SELECT mime FROM event_images WHERE filename = ?').get(filename);
  response.setHeader('Content-Type', row?.mime || 'image/jpeg');
  response.setHeader('Cache-Control', 'public, max-age=86400');
  response.send(readFileSync(path));
});

app.post('/api/events/:id/images', requireUser, (request, response) => {
  const event = requireEventHost(request, response, request.params.id);
  if (!event) return;
  const count = db.prepare('SELECT COUNT(*) AS total FROM event_images WHERE event_id = ?').get(event.id).total;
  if (count >= MAX_EVENT_IMAGES) {
    return response.status(400).json({ error: `You can add up to ${MAX_EVENT_IMAGES} photos.` });
  }
  const decoded = decodeEventImage(request.body?.image);
  if (!decoded) return response.status(400).json({ error: 'Choose a JPEG, PNG, or WebP photo.' });
  const filename = `${event.id}-${randomBytes(8).toString('hex')}.jpg`;
  writeFileSync(join(eventImageDirectory, filename), decoded.buffer);
  const makePrimary = request.body?.primary === true || count === 0;
  if (makePrimary) {
    db.prepare('UPDATE event_images SET is_primary = 0 WHERE event_id = ?').run(event.id);
  }
  db.prepare('INSERT INTO event_images (event_id, filename, mime, is_primary) VALUES (?, ?, ?, ?)').run(
    event.id,
    filename,
    decoded.mime,
    makePrimary ? 1 : 0,
  );
  response.status(201).json(findEvent(event.id, request.user.id));
});

app.patch('/api/events/:id/images/:imageId', requireUser, (request, response) => {
  const event = requireEventHost(request, response, request.params.id);
  if (!event) return;
  const image = db
    .prepare('SELECT id FROM event_images WHERE id = ? AND event_id = ?')
    .get(request.params.imageId, event.id);
  if (!image) return response.status(404).json({ error: 'That photo does not exist.' });
  if (request.body?.primary === true) {
    db.prepare('UPDATE event_images SET is_primary = 0 WHERE event_id = ?').run(event.id);
    db.prepare('UPDATE event_images SET is_primary = 1 WHERE id = ?').run(image.id);
  }
  response.json(findEvent(event.id, request.user.id));
});

app.delete('/api/events/:id/images/:imageId', requireUser, (request, response) => {
  const event = requireEventHost(request, response, request.params.id);
  if (!event) return;
  const image = db
    .prepare('SELECT id, filename, is_primary FROM event_images WHERE id = ? AND event_id = ?')
    .get(request.params.imageId, event.id);
  if (!image) return response.status(404).json({ error: 'That photo does not exist.' });
  db.prepare('DELETE FROM event_images WHERE id = ?').run(image.id);
  try {
    unlinkSync(join(eventImageDirectory, image.filename));
  } catch {
    // The listing is gone even if the file was already removed.
  }
  if (image.is_primary) {
    const next = db.prepare('SELECT id FROM event_images WHERE event_id = ? ORDER BY id LIMIT 1').get(event.id);
    if (next) db.prepare('UPDATE event_images SET is_primary = 1 WHERE id = ?').run(next.id);
  }
  response.json(findEvent(event.id, request.user.id));
});

app.post('/api/events/:id/join', requireUser, (request, response) => {
  const event = findEvent(request.params.id, request.user.id);
  if (!event || new Date(event.closes_at) <= new Date()) {
    return response.status(404).json({ error: 'This event is no longer active.' });
  }
  if (event.going) return response.json(event);
  if (event.players_needed && event.joined_count >= event.players_needed) {
    return response.status(409).json({ error: 'This event is already full.' });
  }
  db.prepare('INSERT INTO event_attendees (event_id, user_id) VALUES (?, ?)').run(event.id, request.user.id);
  response.json(findEvent(event.id, request.user.id));
});

app.delete('/api/events/:id/join', requireUser, (request, response) => {
  const event = findEvent(request.params.id, request.user.id);
  if (!event) return response.status(404).json({ error: 'That event does not exist.' });
  db.prepare('DELETE FROM event_attendees WHERE event_id = ? AND user_id = ?').run(event.id, request.user.id);
  response.json(findEvent(event.id, request.user.id));
});

function proxyFrontend(request, response) {
  const upstream = http.request(
    {
      hostname: '127.0.0.1',
      port: frontendPort,
      path: request.originalUrl,
      method: request.method,
      headers: { ...request.headers, host: `127.0.0.1:${frontendPort}` },
    },
    (incoming) => {
      response.writeHead(incoming.statusCode ?? 502, incoming.headers);
      incoming.pipe(response);
    },
  );
  upstream.on('error', () => {
    if (response.headersSent) return;
    response.status(503).type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Campus Connect</title></head>
<body style="font-family:Inter,system-ui,sans-serif;padding:48px;color:#0f2547">
  <h1>Campus Connect</h1>
  <p>The map UI is not running yet. In another terminal:</p>
  <pre>cd frontend && npm run dev -- -p ${frontendPort}</pre>
</body></html>`);
  });
  request.pipe(upstream);
}

// Browser requests go to the Next.js app. Unknown /api/* stays here so
// removed routes (like /api/donate) return JSON 404s instead of looping
// through the Next rewrite back to this server.
app.use((request, response) => {
  if ((request.path ?? request.url ?? '').startsWith('/api')) {
    return response.status(404).json({ error: 'That endpoint does not exist.' });
  }
  proxyFrontend(request, response);
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Campus Connect is running at http://localhost:${port}`);
  void getSpectrumApp().then(() => listenSpectrumMessages());
});

server.on('upgrade', (request, socket, head) => {
  if ((request.url ?? '').startsWith('/api')) {
    socket.destroy();
    return;
  }
  const upstream = net.connect(frontendPort, '127.0.0.1', () => {
    const headerLines = Object.entries(request.headers)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\r\n');
    upstream.write(`${request.method} ${request.url} HTTP/1.1\r\n${headerLines}\r\n\r\n`);
    if (head.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});
