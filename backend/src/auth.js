import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getPool } from './db.js';

const SESSION_COOKIE = 'codryx_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function cookieOptions() {
  const secure = process.env.NODE_ENV === 'production';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`);
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

export async function createSession(userId, res) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await getPool().execute(
    'INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt]
  );
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions()}`);
}

export async function loadUser(req, _res, next) {
  try {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) {
      req.user = null;
      return next();
    }

    const [rows] = await getPool().execute(
      `SELECT u.id, u.email, u.display_name, u.role, u.status
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP
       LIMIT 1`,
      [hashToken(token)]
    );

    const user = rows[0];
    req.user = user && user.status === 'ACTIVE' ? user : null;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions.' });
    next();
  };
}

export async function register(req, res) {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const displayName = String(req.body?.displayName || '').trim();
  const password = String(req.body?.password || '');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (displayName.length < 2 || displayName.length > 80) {
    return res.status(400).json({ error: 'Display name must be between 2 and 80 characters.' });
  }
  if (password.length < 10 || password.length > 72) {
    return res.status(400).json({ error: 'Password must be between 10 and 72 characters.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await getPool().execute(
      'INSERT INTO users (email, display_name, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [email, displayName, passwordHash, 'CUSTOMER', 'ACTIVE']
    );
    await createSession(result.insertId, res);
    return res.status(201).json({ user: { id: result.insertId, email, displayName, role: 'CUSTOMER' } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with this email already exists.' });
    throw error;
  }
}

export async function login(req, res) {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const [rows] = await getPool().execute(
    'SELECT id, email, display_name, password_hash, role, status FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  const user = rows[0];
  const valid = user && user.status === 'ACTIVE' && await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

  await createSession(user.id, res);
  return res.json({ user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role } });
}

export async function logout(req, res) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) {
    await getPool().execute('DELETE FROM auth_sessions WHERE token_hash = ?', [hashToken(token)]);
  }
  clearSessionCookie(res);
  return res.json({ success: true });
}

export function publicUser(user) {
  if (!user) return null;
  return { id: user.id, email: user.email, displayName: user.display_name, role: user.role };
}
