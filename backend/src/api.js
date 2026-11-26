import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { getPool } from './db.js';
import { requireAuth, requireRole } from './auth.js';

const router = Router();
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const adminOnly = requireRole('ADMIN', 'SUPER_ADMIN');

router.get('/products', asyncRoute(async (_req, res) => {
  const [rows] = await getPool().execute(
    `SELECT id, slug, name, description, amount_minor AS amountMinor, currency,
            billing_period AS billingPeriod
     FROM products WHERE is_active = 1 ORDER BY created_at DESC`
  );
  res.json({ products: rows });
}));

router.post('/admin/products', requireAuth, adminOnly, asyncRoute(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const slug = String(req.body?.slug || '').trim().toLowerCase();
  const description = String(req.body?.description || '').trim();
  const amountMinor = Number(req.body?.amountMinor);
  const currency = String(req.body?.currency || 'USD').trim().toUpperCase();
  const billingPeriod = String(req.body?.billingPeriod || 'MONTHLY').toUpperCase();
  if (name.length < 2 || name.length > 160 || !/^[a-z0-9-]{2,100}$/.test(slug)) {
    return res.status(400).json({ error: 'A valid product name and slug are required.' });
  }
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 1 || !/^[A-Z]{3}$/.test(currency) ||
      !['ONCE', 'MONTHLY', 'YEARLY'].includes(billingPeriod)) {
    return res.status(400).json({ error: 'Invalid price, currency or billing period.' });
  }
  const [result] = await getPool().execute(
    `INSERT INTO products (slug, name, description, amount_minor, currency, billing_period)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [slug, name, description || null, amountMinor, currency, billingPeriod]
  );
  res.status(201).json({ id: result.insertId, success: true });
}));

router.get('/bots', requireAuth, asyncRoute(async (req, res) => {
  const [rows] = await getPool().execute(
    `SELECT public_id AS id, name, runtime_status AS status, created_at AS createdAt,
            updated_at AS updatedAt
     FROM bots WHERE user_id = ? ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json({ bots: rows });
}));

router.post('/bots', requireAuth, asyncRoute(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (name.length < 2 || name.length > 120) {
    return res.status(400).json({ error: 'Bot name must be between 2 and 120 characters.' });
  }
  const publicId = randomUUID();
  const [result] = await getPool().execute(
    'INSERT INTO bots (public_id, user_id, name, runtime_status) VALUES (?, ?, ?, ?)',
    [publicId, req.user.id, name, 'STOPPED']
  );
  res.status(201).json({ bot: { id: publicId, name, status: 'STOPPED' }, databaseId: result.insertId });
}));

router.get('/orders', requireAuth, asyncRoute(async (req, res) => {
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
  const [rows] = await getPool().execute(
    `SELECT o.public_id AS id, p.name AS product, o.amount_minor AS amountMinor,
            o.currency, o.status, o.created_at AS createdAt
     FROM orders o JOIN products p ON p.id = o.product_id
     ${isAdmin ? '' : 'WHERE o.user_id = ?'}
     ORDER BY o.created_at DESC LIMIT 100`,
    isAdmin ? [] : [req.user.id]
  );
  res.json({ orders: rows });
}));

router.post('/orders', requireAuth, asyncRoute(async (req, res) => {
  const productId = Number(req.body?.productId);
  if (!Number.isSafeInteger(productId) || productId < 1) {
    return res.status(400).json({ error: 'A valid product is required.' });
  }
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [products] = await connection.execute(
      'SELECT id, amount_minor, currency FROM products WHERE id = ? AND is_active = 1 FOR UPDATE',
      [productId]
    );
    if (!products.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Product not found.' });
    }
    const publicId = randomUUID();
    const product = products[0];
    await connection.execute(
      `INSERT INTO orders (public_id, user_id, product_id, amount_minor, currency, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [publicId, req.user.id, product.id, product.amount_minor, product.currency]
    );
    await connection.commit();
    res.status(201).json({
      order: { id: publicId, productId: product.id, amountMinor: product.amount_minor,
        currency: product.currency, status: 'PENDING' }
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

router.get('/admin/overview', requireAuth, adminOnly, asyncRoute(async (_req, res) => {
  const pool = getPool();
  const [[users]] = await pool.execute('SELECT COUNT(*) AS total FROM users');
  const [[products]] = await pool.execute('SELECT COUNT(*) AS total FROM products WHERE is_active = 1');
  const [[bots]] = await pool.execute('SELECT COUNT(*) AS total FROM bots');
  const [[orders]] = await pool.execute(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount_minor ELSE 0 END), 0) AS paidMinor
     FROM orders`
  );
  res.json({ users: users.total, products: products.total, bots: bots.total,
    orders: orders.total, paidMinor: orders.paidMinor });
}));

export default router;
