import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDatabase } from './db.js';
import { bootstrapOwner, clearSessionCookie, loadUser, login, logout, publicUser, register, requireAuth } from './auth.js';
import apiRouter from './api.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '../..');

app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '32kb' }));
app.use(loadUser);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' }
});

app.get('/api/health', async (_req, res) => {
  try {
    await checkDatabase();
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});

app.post('/api/auth/bootstrap-owner', authLimiter, bootstrapOwner);
app.post('/api/auth/register', authLimiter, register);
app.post('/api/auth/login', authLimiter, login);
app.post('/api/auth/logout', requireAuth, logout);
app.get('/api/auth/me', (req, res) => res.json({ user: publicUser(req.user) }));
app.use('/api', apiRouter);

app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));

const distPath = path.join(projectRoot, 'dist');
app.use(express.static(distPath, { index: false, maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint not found.' });
  res.sendFile(path.join(distPath, 'index.html'), error => {
    if (error && !res.headersSent) res.status(503).send('Frontend build is not available yet.');
  });
});

app.use((error, _req, res, _next) => {
  console.error('Request failed:', error.message);
  if (res.headersSent) return;
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

app.listen(port, () => {
  console.log(`CodRyx API listening on port ${port}`);
});
