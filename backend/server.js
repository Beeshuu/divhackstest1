import express from 'express';
import http from 'node:http';
import net from 'node:net';
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadUniversityLifeEvents } from './university-life.js';
import {
  getSpectrumApp,
  handleSpectrumWebhook,
  sendSpectrumCode,
  sendSpectrumWelcome,
  setInboundHandler,
  spectrumConfigured,
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

// The first release stored only coordinates and a title; the map needs more.
const EVENT_COLUMN_ADDITIONS = {
  description: "TEXT NOT NULL DEFAULT ''",
  location_name: "TEXT NOT NULL DEFAULT ''",
  address: "TEXT NOT NULL DEFAULT ''",
  host: "TEXT NOT NULL DEFAULT ''",
  starts_at: 'TEXT',
  created_by: 'INTEGER',
};
const existingEventColumns = new Set(db.prepare('PRAGMA table_info(events)').all().map((column) => column.name));
for (const [column, definition] of Object.entries(EVENT_COLUMN_ADDITIONS)) {
  if (!existingEventColumns.has(column)) db.exec(`ALTER TABLE events ADD COLUMN ${column} ${definition}`);
}

const app = express();
const port = Number(process.env.PORT) || 3000;
const frontendPort = Number(process.env.FRONTEND_PORT) || 3001;
const campus = { south: 40.8036, west: -73.9669, north: 40.8168, east: -73.9505 };

function isOnCampus(latitude, longitude) {
  return latitude >= campus.south && latitude <= campus.north && longitude >= campus.west && longitude <= campus.east;
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

app.use(express.json());
app.use(express.static(join(root, 'dist')));

const USER_COLUMNS = 'id, name, email, phone, college, profile_private, two_factor_enabled';

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
      (user_id, phone, code_salt, code_hash, expires_at, created_at, token, purpose, inbound_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
  ).run(
    account.id,
    account.phone,
    salt,
    hash,
    new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    now.toISOString(),
    token,
    purpose,
  );

  let channel = 'demo';
  try {
    const sent = await sendSpectrumCode(account.phone, code, purpose, account.name);
    if (sent.delivered) channel = sent.channel;
  } catch (error) {
    console.error('Photon Spectrum could not send a code:', error.message);
  }

  if (channel === 'demo') {
    console.log(`${purpose} code for ${maskPhone(account.phone)}: ${code}`);
  }

  return {
    challengeId: token,
    phoneHint: maskPhone(account.phone),
    expiresInMinutes: 10,
    channel,
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
      `SELECT users.id, users.name, users.email, users.phone, users.college, users.profile_private, users.two_factor_enabled
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

app.get('/api/auth/me', requireUser, (request, response) => {
  response.json({ user: request.user });
});

app.patch('/api/auth/me', requireUser, (request, response) => {
  const { name, email, phone, college, profilePrivate, twoFactorEnabled } = request.body ?? {};
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
    'UPDATE users SET name = ?, email = ?, phone = ?, college = ?, profile_private = ?, two_factor_enabled = ? WHERE id = ?',
  ).run(nextName, nextEmail, nextPhone, nextCollege, nextPrivate, nextTwoFactor, current.id);

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
  events.starts_at, events.closes_at, events.created_at,
  events.joined_count + (
    SELECT COUNT(*) FROM event_attendees WHERE event_attendees.event_id = events.id
  ) AS joined_count
`;

function attachGoing(row, userId) {
  if (!row) return null;
  const going = userId
    ? db.prepare('SELECT 1 FROM event_attendees WHERE event_id = ? AND user_id = ?').get(row.id, userId)
    : null;
  return { ...row, going: Boolean(going) };
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

app.get('/api/events', (request, response) => {
  const viewer = currentUser(request);
  const rows = db
    .prepare(`SELECT ${EVENT_FIELDS} FROM events WHERE events.closes_at > ? ORDER BY events.starts_at`)
    .all(new Date().toISOString());
  response.json(rows.map((row) => attachGoing(row, viewer?.id)));
});

app.get('/api/events/:id', (request, response) => {
  const event = findEvent(request.params.id, currentUser(request)?.id);
  if (!event) return response.status(404).json({ error: 'That event does not exist.' });
  response.json(event);
});

app.post('/api/events', requireUser, (request, response) => {
  const { title, category, description, locationName, address, latitude, longitude, playersNeeded, startsAt, closesAt } =
    request.body ?? {};
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanCategory = typeof category === 'string' ? category.trim() : '';
  const closes = new Date(closesAt);
  const starts = startsAt ? new Date(startsAt) : new Date();

  if (!cleanTitle) return response.status(400).json({ error: 'Give your event a title.' });
  if (!EVENT_CATEGORIES.has(cleanCategory)) {
    return response.status(400).json({ error: 'Choose one of the Campus Connect categories.' });
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !isOnCampus(latitude, longitude)) {
    return response.status(400).json({ error: 'Pick a spot inside the Columbia campus boundary.' });
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
          players_needed, joined_count, starts_at, closes_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    )
    .run(
      cleanTitle,
      cleanCategory,
      typeof description === 'string' ? description.trim() : '',
      typeof locationName === 'string' ? locationName.trim() : '',
      typeof address === 'string' ? address.trim() : '',
      request.user.name,
      latitude,
      longitude,
      playerCount,
      starts.toISOString(),
      closes.toISOString(),
      request.user.id,
    );
  response.status(201).json(findEvent(result.lastInsertRowid, request.user.id));
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

// Browser requests go to the Next.js app; /api/* stays on this server.
app.use((request, response) => {
  proxyFrontend(request, response);
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Campus Connect is running at http://localhost:${port}`);
  void getSpectrumApp();
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
