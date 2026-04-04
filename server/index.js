// ============================================================
// Backend API Server for handicraftkids.com
// Replaces Supabase: PostgREST + Storage + Auth + Edge Functions
// ============================================================
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import pool from './db.js';
import { uploadFile, getPublicUrl, deleteFile, UPLOADS_DIR } from './storage.js';
import { createBogOrder, getBogPaymentDetails, verifyBogCallback } from './bog-payment.js';
import { cacheGet, cacheSet, cacheInvalidate, buildCacheKey, getTTL } from './cache.js';

const app = express();
const PORT = process.env.API_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'hck-jwt-secret-key-2024-change-in-production';
const SITE_URL = process.env.SITE_URL || 'https://handicraftkids.com';

// ── Middleware ──
app.use(cors());
app.use(express.json({
  limit: '50mb',
  verify: (req, _res, buf) => {
    // Save raw body for BOG callback signature verification
    if (req.url === '/functions/v1/bog-callback') {
      req.rawBody = buf.toString('utf-8');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ── Auth middleware (optional per route) ──
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next(); // Allow anonymous access (like Supabase anon key)
  const token = authHeader.replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    // Invalid token - continue as anonymous
  }
  next();
}
app.use(authMiddleware);

// ════════════════════════════════════════════
// AUTH ROUTES (GoTrue-compatible subset)
// ════════════════════════════════════════════

// Sign up
app.post('/auth/v1/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    await pool.query(
      'INSERT INTO admin_users (id, email, password_hash) VALUES ($1, $2, $3)',
      [id, email, passwordHash]
    );

    const token = jwt.sign({ sub: id, email, role: 'authenticated' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      access_token: token,
      token_type: 'bearer',
      expires_in: 604800,
      user: { id, email, role: 'authenticated' },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Sign in
app.post('/auth/v1/token', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email]);
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid login credentials' });

    const user = rows[0];
    if (user.password_hash) {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(400).json({ error: 'Invalid login credentials' });
    }

    const token = jwt.sign({ sub: user.id, email: user.email, role: 'authenticated' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      access_token: token,
      token_type: 'bearer',
      expires_in: 604800,
      user: { id: user.id, email: user.email, role: 'authenticated' },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get session/user
app.get('/auth/v1/user', (req, res) => {
  if (req.user) {
    res.json({ id: req.user.sub, email: req.user.email, role: req.user.role });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Sign out (client-side only, just acknowledge)
app.post('/auth/v1/logout', (req, res) => {
  res.json({});
});

// ════════════════════════════════════════════
// STORAGE ROUTES (Supabase Storage-compatible)
// ════════════════════════════════════════════

// Serve locally-stored uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// Upload file
app.post('/storage/v1/object/:bucket/*', upload.single('file'), async (req, res) => {
  try {
    const bucket = req.params.bucket;
    const filePath = req.params[0];
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const fullPath = `${bucket}/${filePath}`;
    const url = await uploadFile(fullPath, req.file.buffer, req.file.mimetype);
    res.json({ Key: fullPath, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get public URL — redirect to S3
app.get('/storage/v1/object/public/:bucket/*', (req, res) => {
  const bucket = req.params.bucket;
  const filePath = req.params[0];
  const s3Url = getPublicUrl(`${bucket}/${filePath}`);
  res.redirect(301, s3Url);
});

// Get public URL (JSON)
app.post('/storage/v1/object/public-url', (req, res) => {
  const { bucket, path: filePath } = req.body;
  const url = getPublicUrl(`${bucket}/${filePath}`);
  res.json({ publicUrl: url });
});

// Delete file
app.delete('/storage/v1/object/:bucket/*', async (req, res) => {
  try {
    const bucket = req.params.bucket;
    const filePath = req.params[0];
    await deleteFile(`${bucket}/${filePath}`);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
// PostgREST-COMPATIBLE REST API
// ════════════════════════════════════════════

// Parse PostgREST filter operators
// Returns { sql, values } where sql may contain $1, $2, ... placeholders
function buildFilter(key, value, paramIndex) {
  // Handle 'or' key: or=(condition1,condition2)
  if (key === 'or') {
    const inner = value.replace(/^\(/, '').replace(/\)$/, '');
    // Parse individual conditions like "status.eq.new,status.eq.processing"
    const conditions = [];
    const vals = [];
    let idx = paramIndex;
    
    // Split carefully - conditions are like field.op.value
    const parts = inner.split(',');
    for (const part of parts) {
      const dotParts = part.trim().split('.');
      if (dotParts.length >= 3) {
        const field = dotParts[0];
        const op = dotParts[1];
        const val = dotParts.slice(2).join('.');
        
        const opMap = { eq: '=', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'LIKE', ilike: 'ILIKE' };
        
        if (op === 'is') {
          if (val === 'null') conditions.push(`"${field}" IS NULL`);
          else if (val === 'true') conditions.push(`"${field}" IS TRUE`);
          else if (val === 'false') conditions.push(`"${field}" IS FALSE`);
        } else if (opMap[op]) {
          conditions.push(`"${field}" ${opMap[op]} $${idx}`);
          vals.push(val);
          idx++;
        }
      }
    }
    
    if (conditions.length > 0) {
      return { sql: `(${conditions.join(' OR ')})`, values: vals, nextIndex: idx };
    }
    return { sql: 'TRUE', values: [], nextIndex: paramIndex };
  }

  // Handle 'not' prefix: not.op.value
  if (value.startsWith('not.')) {
    const rest = value.slice(4);
    if (rest.startsWith('eq.')) {
      return { sql: `"${key}" != $${paramIndex}`, values: [rest.slice(3)], nextIndex: paramIndex + 1 };
    }
    if (rest.startsWith('is.null')) {
      return { sql: `"${key}" IS NOT NULL`, values: [], nextIndex: paramIndex };
    }
    if (rest.startsWith('in.(') && rest.endsWith(')')) {
      const inVals = rest.slice(4, -1).split(',').map(v => v.replace(/^"|"$/g, '').trim());
      const placeholders = inVals.map((_, i) => `$${paramIndex + i}`);
      return { sql: `"${key}" NOT IN (${placeholders.join(', ')})`, values: inVals, nextIndex: paramIndex + inVals.length };
    }
    // Generic not
    const sub = buildFilter(key, rest, paramIndex);
    return { sql: `NOT (${sub.sql})`, values: sub.values, nextIndex: sub.nextIndex };
  }
  
  // Handle 'in' operator: in.(val1,val2,val3)
  if (value.startsWith('in.(') && value.endsWith(')')) {
    const vals = value.slice(4, -1).split(',').map(v => v.replace(/^"|"$/g, '').trim());
    const placeholders = vals.map((_, i) => `$${paramIndex + i}`);
    return { sql: `"${key}" IN (${placeholders.join(', ')})`, values: vals, nextIndex: paramIndex + vals.length };
  }

  // Handle 'cs' (contains) for JSONB/array
  if (value.startsWith('cs.')) {
    const val = value.slice(3);
    return { sql: `"${key}" @> $${paramIndex}::jsonb`, values: [val], nextIndex: paramIndex + 1 };
  }

  // Handle 'cd' (contained by) for JSONB/array
  if (value.startsWith('cd.')) {
    const val = value.slice(3);
    return { sql: `"${key}" <@ $${paramIndex}::jsonb`, values: [val], nextIndex: paramIndex + 1 };
  }

  // Standard operators
  const operators = {
    'eq': '=', 'neq': '!=', 'gt': '>', 'gte': '>=',
    'lt': '<', 'lte': '<=', 'like': 'LIKE', 'ilike': 'ILIKE',
  };

  for (const [op, sqlOp] of Object.entries(operators)) {
    if (value.startsWith(`${op}.`)) {
      const val = value.slice(op.length + 1);
      return { sql: `"${key}" ${sqlOp} $${paramIndex}`, values: [val], nextIndex: paramIndex + 1 };
    }
  }
  
  // Handle 'is' operator
  if (value.startsWith('is.')) {
    const val = value.slice(3);
    if (val === 'null') return { sql: `"${key}" IS NULL`, values: [], nextIndex: paramIndex };
    if (val === 'true') return { sql: `"${key}" IS TRUE`, values: [], nextIndex: paramIndex };
    if (val === 'false') return { sql: `"${key}" IS FALSE`, values: [], nextIndex: paramIndex };
  }

  // Default: equality
  return { sql: `"${key}" = $${paramIndex}`, values: [value], nextIndex: paramIndex + 1 };
}

// Parse select parameter with joins
function parseSelect(selectParam, table) {
  if (!selectParam || selectParam === '*') return { columns: '*', joins: [] };

  // Handle nested parens by tracking depth
  const parts = [];
  let current = '';
  let depth = 0;
  for (const ch of selectParam) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());

  const columns = [];
  const joins = [];

  for (const part of parts) {
    // Check for join: table_name(*) or table_name(col1,col2)
    const joinMatch = part.match(/^(\w+)\((.+)\)$/);
    if (joinMatch) {
      joins.push({ table: joinMatch[1], columns: joinMatch[2] });
    } else if (part === '*') {
      columns.push('*');
    } else {
      columns.push(`"${table}"."${part}"`);
    }
  }

  return { columns: columns.length > 0 ? columns.join(', ') : '*', joins };
}

// GET /rest/v1/:table - Select rows
app.get('/rest/v1/:table', async (req, res) => {
  try {
    const table = req.params.table;
    const { select, order, limit, offset, ...filters } = req.query;

    // Check Redis cache
    const cacheKey = buildCacheKey(req);
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const { columns, joins } = parseSelect(select, table);

    let sql = `SELECT ${columns === '*' ? `"${table}".*` : columns} FROM "${table}"`;
    const values = [];
    let paramIndex = 1;

    // Handle joins by fetching related data
    // We'll use a simpler approach: fetch main data, then fetch joined data

    // WHERE clause from filters
    const whereClauses = [];
    for (const [key, value] of Object.entries(filters)) {
      if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(key)) continue;
      const filter = buildFilter(key, String(value), paramIndex);
      whereClauses.push(filter.sql);
      values.push(...filter.values);
      paramIndex = filter.nextIndex;
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // ORDER BY
    if (order) {
      const orderParts = order.split(',').map(o => {
        const [col, dir] = o.trim().split('.');
        return `"${col}" ${dir === 'desc' ? 'DESC' : 'ASC'}`;
      });
      sql += ` ORDER BY ${orderParts.join(', ')}`;
    }

    // LIMIT & OFFSET
    if (limit) sql += ` LIMIT ${parseInt(limit)}`;
    if (offset) sql += ` OFFSET ${parseInt(offset)}`;

    const { rows } = await pool.query(sql, values);

    // Handle joins: batch fetch related data (avoids N+1 queries)
    if (joins.length > 0) {
      const joinMeta = {};
      for (const join of joins) {
        const fkInCurrent = `${join.table.replace(/s$/, '')}_id`;
        const fkInJoin = `${table.replace(/s$/, '')}_id`;
        const { rows: colCheck } = await pool.query(
          `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1`,
          [join.table, fkInJoin]
        );
        joinMeta[join.table] = { fkInCurrent, fkInJoin, fkInJoinExists: colCheck.length > 0 };
      }

      for (const join of joins) {
        const { fkInCurrent, fkInJoin, fkInJoinExists } = joinMeta[join.table];
        const joinCols = join.columns === '*' ? '*' : join.columns.split(',').map(c => `"${c.trim()}"`).join(', ');

        // Determine which batch strategy to use
        const fkValues = rows.map(r => r[fkInCurrent]).filter(v => v != null);
        const idValues = rows.map(r => r.id).filter(v => v != null);

        if (fkValues.length > 0) {
          // FK in current table → batch fetch from join table by IDs
          const uniqueIds = [...new Set(fkValues)];
          const { rows: joinRows } = await pool.query(
            `SELECT ${joinCols} FROM "${join.table}" WHERE id = ANY($1::uuid[])`,
            [uniqueIds]
          );
          const joinMap = {};
          for (const jr of joinRows) joinMap[jr.id] = jr;
          for (const row of rows) {
            row[join.table] = row[fkInCurrent] ? (joinMap[row[fkInCurrent]] || null) : null;
          }
        } else if (fkInJoinExists && idValues.length > 0) {
          // FK in join table → batch fetch all related rows
          const { rows: joinRows } = await pool.query(
            `SELECT ${joinCols}${joinCols === '*' ? '' : `, "${fkInJoin}"`} FROM "${join.table}" WHERE "${fkInJoin}" = ANY($1::uuid[])`,
            [idValues]
          );
          const joinMap = {};
          for (const jr of joinRows) {
            const key = jr[fkInJoin];
            if (!joinMap[key]) joinMap[key] = [];
            joinMap[key].push(jr);
          }
          for (const row of rows) {
            row[join.table] = joinMap[row.id] || [];
          }
        } else {
          for (const row of rows) row[join.table] = null;
        }
      }
    }

    // Check Prefer header for single/count
    const prefer = req.headers.prefer || '';
    if (prefer.includes('count=exact')) {
      // Return count in header
      const countSql = `SELECT COUNT(*) FROM "${table}"${whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : ''}`;
      const { rows: countRows } = await pool.query(countSql, values);
      res.set('content-range', `0-${rows.length}/${countRows[0].count}`);
    }

    // Cache the result
    await cacheSet(cacheKey, rows, getTTL(table));

    res.json(rows);
  } catch (err) {
    console.error('GET /rest/v1 error:', err.message);
    res.status(400).json({ message: err.message, code: 'PGRST000' });
  }
});

// POST /rest/v1/:table - Insert rows
app.post('/rest/v1/:table', async (req, res) => {
  try {
    const table = req.params.table;
    const data = Array.isArray(req.body) ? req.body : [req.body];
    const prefer = req.headers.prefer || '';
    const returnData = prefer.includes('return=representation');

    // Handle upsert
    const isUpsert = prefer.includes('resolution=merge-duplicates');
    const onConflict = req.query.on_conflict;

    const results = [];
    for (const row of data) {
      const columns = Object.keys(row);
      const values = columns.map(c => {
        const v = row[c];
        return typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
      });
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const colNames = columns.map(c => `"${c}"`).join(', ');

      let sql;
      if (isUpsert && onConflict) {
        const conflictCol = onConflict;
        const updateSet = columns
          .filter(c => c !== conflictCol)
          .map(c => `"${c}" = EXCLUDED."${c}"`)
          .join(', ');
        sql = `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders}) ON CONFLICT ("${conflictCol}") DO UPDATE SET ${updateSet}`;
      } else if (isUpsert) {
        const updateSet = columns
          .filter(c => c !== 'id')
          .map(c => `"${c}" = EXCLUDED."${c}"`)
          .join(', ');
        sql = `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateSet}`;
      } else {
        sql = `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders})`;
      }

      if (returnData) sql += ' RETURNING *';

      const { rows } = await pool.query(sql, values);
      if (returnData && rows[0]) results.push(rows[0]);
    }

    // Invalidate cache for this table
    await cacheInvalidate(`rest:/rest/v1/${table}*`);

    if (returnData) {
      res.status(201).json(results);
    } else {
      res.status(201).json({});
    }
  } catch (err) {
    console.error('POST /rest/v1 error:', err.message);
    res.status(400).json({ message: err.message, code: 'PGRST000' });
  }
});

// PATCH /rest/v1/:table - Update rows
app.patch('/rest/v1/:table', async (req, res) => {
  try {
    const table = req.params.table;
    const updates = req.body;
    const { select, ...filters } = req.query;
    const prefer = req.headers.prefer || '';
    const returnData = prefer.includes('return=representation');

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [col, val] of Object.entries(updates)) {
      setClauses.push(`"${col}" = $${paramIndex++}`);
      values.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
    }

    let sql = `UPDATE "${table}" SET ${setClauses.join(', ')}`;

    // WHERE from query params
    const whereClauses = [];
    for (const [key, value] of Object.entries(filters)) {
      if (key === 'select') continue;
      const filter = buildFilter(key, String(value), paramIndex);
      whereClauses.push(filter.sql);
      values.push(...filter.values);
      paramIndex = filter.nextIndex;
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (returnData) sql += ' RETURNING *';

    const { rows } = await pool.query(sql, values);

    // Invalidate cache for this table
    await cacheInvalidate(`rest:/rest/v1/${table}*`);

    res.json(returnData ? rows : {});
  } catch (err) {
    console.error('PATCH /rest/v1 error:', err.message);
    res.status(400).json({ message: err.message, code: 'PGRST000' });
  }
});

// DELETE /rest/v1/:table - Delete rows
app.delete('/rest/v1/:table', async (req, res) => {
  try {
    const table = req.params.table;
    const { ...filters } = req.query;
    const prefer = req.headers.prefer || '';
    const returnData = prefer.includes('return=representation');

    let sql = `DELETE FROM "${table}"`;
    const values = [];
    let paramIndex = 1;

    const whereClauses2 = [];
    for (const [key, value] of Object.entries(filters)) {
      const filter = buildFilter(key, String(value), paramIndex);
      whereClauses2.push(filter.sql);
      values.push(...filter.values);
      paramIndex = filter.nextIndex;
    }

    if (whereClauses2.length > 0) {
      sql += ` WHERE ${whereClauses2.join(' AND ')}`;
    }

    if (returnData) sql += ' RETURNING *';

    const { rows } = await pool.query(sql, values);

    // Invalidate cache for this table
    await cacheInvalidate(`rest:/rest/v1/${table}*`);

    res.json(returnData ? rows : {});
  } catch (err) {
    console.error('DELETE /rest/v1 error:', err.message);
    res.status(400).json({ message: err.message, code: 'PGRST000' });
  }
});

// ════════════════════════════════════════════
// RPC ROUTES
// ════════════════════════════════════════════
app.post('/rest/v1/rpc/:fn', async (req, res) => {
  try {
    const fn = req.params.fn;
    const params = req.body;

    if (fn === 'decrement_stock') {
      await pool.query('SELECT decrement_stock($1, $2)', [params.p_id, params.qty]);
      return res.json({});
    }

    // Generic RPC call
    const paramNames = Object.keys(params);
    const paramValues = Object.values(params);
    const placeholders = paramValues.map((_, i) => `$${i + 1}`).join(', ');

    const { rows } = await pool.query(`SELECT ${fn}(${placeholders})`, paramValues);
    res.json(rows);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ════════════════════════════════════════════
// EDGE FUNCTION EQUIVALENTS
// ════════════════════════════════════════════

// ── Flitt Create Order ──
app.post('/functions/v1/flitt-create-order', async (req, res) => {
  try {
    const { order_id, amount_gel, description, customer_email } = req.body;

    if (!order_id || !amount_gel) {
      return res.status(400).json({ error: 'order_id and amount_gel are required' });
    }

    const { rows: settingsRows } = await pool.query('SELECT * FROM flitt_settings LIMIT 1');
    const settings = settingsRows[0];
    if (!settings) return res.status(500).json({ error: 'Payment settings not configured' });

    const isTestMode = settings.test_mode;
    const merchantId = isTestMode ? settings.test_merchant_id : settings.merchant_id;
    const paymentKey = isTestMode ? settings.test_payment_key : settings.payment_key;
    const checkoutUrl = settings.merchant_url || 'https://pay.flitt.com/api/checkout/url';

    if (!merchantId || !paymentKey) {
      return res.status(500).json({ error: 'Merchant credentials not configured' });
    }

    const amountInMinor = Math.round(amount_gel * 100);
    const currency = settings.settlement_account_currency || 'GEL';

    const orderParams = {
      order_id: String(order_id),
      merchant_id: String(merchantId),
      order_desc: description || `Order ${order_id}`,
      amount: String(amountInMinor),
      currency,
      response_url: `${SITE_URL}/payment/flitt/response?order_id=${order_id}&status=success`,
      server_callback_url: `${process.env.API_PUBLIC_URL || `http://localhost:${PORT}`}/functions/v1/flitt-callback`,
      sender_email: customer_email || '',
      lang: 'ka',
      payment_systems: 'card',
      default_payment_system: 'card',
    };

    // Generate SHA-1 signature
    const filtered = {};
    for (const [key, value] of Object.entries(orderParams)) {
      if (key !== 'signature' && value !== '' && value !== undefined) {
        filtered[key] = String(value);
      }
    }
    const sortedKeys = Object.keys(filtered).sort();
    const signatureString = paymentKey + '|' + sortedKeys.map(k => filtered[k]).join('|');
    const signature = crypto.createHash('sha1').update(signatureString).digest('hex');
    orderParams.signature = signature;

    const flittResponse = await fetch(checkoutUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: orderParams }),
    });
    const flittData = await flittResponse.json();

    if (flittData?.response?.checkout_url) {
      await pool.query(
        `UPDATE orders SET payment_provider = 'flitt', payment_order_id = $1, payment_status = 'pending' WHERE id = $2`,
        [flittData.response.order_id || order_id, order_id]
      );
      res.json({
        checkout_url: flittData.response.checkout_url,
        url: flittData.response.checkout_url,
        payment_id: flittData.response.payment_id,
      });
    } else {
      res.status(502).json({ error: flittData?.response?.error_message || 'Unknown Flitt error' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Flitt Callback ──
app.post('/functions/v1/flitt-callback', async (req, res) => {
  try {
    let callbackData;
    if (req.is('application/json')) {
      callbackData = req.body;
    } else {
      callbackData = {};
      // form-encoded data would be in req.body with urlencoded middleware
      Object.assign(callbackData, req.body);
    }

    const orderId = callbackData.order_id;
    const orderStatus = callbackData.order_status;
    const paymentId = callbackData.payment_id;

    if (!orderId) return res.status(400).send('Missing order_id');

    // Verify signature
    const { rows: settingsRows } = await pool.query('SELECT * FROM flitt_settings LIMIT 1');
    const settings = settingsRows[0];
    if (settings) {
      const paymentKey = settings.test_mode ? settings.test_payment_key : settings.payment_key;
      if (paymentKey && callbackData.signature) {
        const filtered = {};
        for (const [key, value] of Object.entries(callbackData)) {
          if (key !== 'signature' && value !== '' && value !== undefined) filtered[key] = String(value);
        }
        const sortedKeys = Object.keys(filtered).sort();
        const signatureString = paymentKey + '|' + sortedKeys.map(k => filtered[k]).join('|');
        const computed = crypto.createHash('sha1').update(signatureString).digest('hex');
        if (computed !== callbackData.signature) return res.status(403).send('Invalid signature');
      }
    }

    let paymentStatus = 'pending';
    let orderStatusUpdate = 'new';
    if (orderStatus === 'approved') { paymentStatus = 'paid'; orderStatusUpdate = 'processing'; }
    else if (orderStatus === 'declined' || orderStatus === 'expired') { paymentStatus = 'failed'; orderStatusUpdate = 'cancelled'; }
    else if (orderStatus === 'reversed') { paymentStatus = 'refunded'; orderStatusUpdate = 'refunded'; }

    await pool.query(
      `UPDATE orders SET payment_status = $1, status = $2, payment_id = $3, payment_callback_data = $4, updated_at = NOW() WHERE id = $5`,
      [paymentStatus, orderStatusUpdate, paymentId || null, JSON.stringify(callbackData), orderId]
    );

    // Decrement stock if paid
    if (paymentStatus === 'paid') {
      const { rows: orderRows } = await pool.query('SELECT products FROM orders WHERE id = $1', [orderId]);
      if (orderRows[0]?.products) {
        for (const item of orderRows[0].products) {
          if (item.id) await pool.query('SELECT decrement_stock($1, $2)', [item.id, item.quantity || 1]);
        }
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('flitt-callback error:', err);
    res.status(500).send('Internal error');
  }
});

// ── BOG Create Order ──
app.post('/functions/v1/bog-create-order', async (req, res) => {
  try {
    const { order_id, amount_gel, cart_items, buyer } = req.body;

    if (!order_id || !amount_gel) {
      return res.status(400).json({ error: 'order_id and amount_gel are required' });
    }

    const callbackUrl = `${process.env.API_PUBLIC_URL || `https://handicraftkids.com/api`}/functions/v1/bog-callback`;
    const successUrl = `${SITE_URL}/payment/bog/response?order_id=${order_id}&status=success`;
    const failUrl = `${SITE_URL}/payment/bog/response?order_id=${order_id}&status=fail`;

    const bogResponse = await createBogOrder({
      orderId: order_id,
      totalAmount: amount_gel,
      cartItems: cart_items || [],
      buyer: buyer || {},
      callbackUrl,
      successUrl,
      failUrl,
    });

    const redirectUrl = bogResponse?._links?.redirect?.href;
    const bogOrderId = bogResponse?.id;

    if (!redirectUrl) {
      return res.status(502).json({ error: 'No redirect URL from BOG' });
    }

    // Save BOG order ID
    await pool.query(
      `UPDATE orders SET payment_provider = 'bog', payment_order_id = $1, payment_status = 'pending' WHERE id = $2`,
      [bogOrderId, order_id]
    );

    res.json({ redirect_url: redirectUrl, bog_order_id: bogOrderId });
  } catch (err) {
    console.error('bog-create-order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── BOG Callback (webhook) ──
app.post('/functions/v1/bog-callback', async (req, res) => {
  try {
    const rawBody = req.rawBody || JSON.stringify(req.body);

    // Verify signature
    const signature = req.headers['callback-signature'];
    if (signature && !verifyBogCallback(rawBody, signature)) {
      console.warn('BOG callback signature verification failed');
      return res.status(403).send('Invalid signature');
    }

    const data = req.body;
    const bogOrderId = data.body?.order_id;
    const orderStatusKey = data.body?.order_status?.key;
    const externalOrderId = data.body?.external_order_id;
    const transactionId = data.body?.payment_detail?.transaction_id;

    if (!bogOrderId) {
      return res.status(400).send('Missing order_id');
    }

    // Find our order by external_order_id or payment_order_id
    const { rows } = await pool.query(
      `SELECT id, products FROM orders WHERE id = $1 OR payment_order_id = $2 LIMIT 1`,
      [externalOrderId, bogOrderId]
    );
    const order = rows[0];
    if (!order) {
      console.warn('BOG callback: order not found', { bogOrderId, externalOrderId });
      return res.status(200).send('OK'); // Return 200 to stop retries
    }

    // Map BOG status to our status
    let paymentStatus = 'pending';
    let orderStatus = 'new';
    if (orderStatusKey === 'completed') { paymentStatus = 'paid'; orderStatus = 'processing'; }
    else if (orderStatusKey === 'rejected') { paymentStatus = 'failed'; orderStatus = 'cancelled'; }
    else if (orderStatusKey === 'refunded' || orderStatusKey === 'refunded_partially') { paymentStatus = 'refunded'; orderStatus = 'refunded'; }
    else if (orderStatusKey === 'processing') { paymentStatus = 'pending'; orderStatus = 'processing'; }

    await pool.query(
      `UPDATE orders SET payment_status = $1, status = $2, payment_id = $3, payment_callback_data = $4, updated_at = NOW() WHERE id = $5`,
      [paymentStatus, orderStatus, transactionId || bogOrderId, JSON.stringify(data), order.id]
    );

    // Decrement stock if paid
    if (paymentStatus === 'paid' && order.products) {
      for (const item of order.products) {
        if (item.id) await pool.query('SELECT decrement_stock($1, $2)', [item.id, item.quantity || 1]);
      }

      // Send SMS/notification after successful payment
      try {
        const { rows: fullOrder } = await pool.query('SELECT * FROM orders WHERE id = $1', [order.id]);
        if (fullOrder[0]) {
          const orderObj = fullOrder[0];
          // Parse customer_info if it's a string
          if (typeof orderObj.customer_info === 'string') {
            try { orderObj.customer_info = JSON.parse(orderObj.customer_info); } catch {}
          }
          // Fire notification via internal call
          const notifUrl = `http://localhost:${PORT}/functions/v1/process-order-notification`;
          fetch(notifUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: orderObj })
          }).catch(e => console.error('BOG notification fetch error:', e));
        }
      } catch (notifErr) {
        console.error('BOG post-payment notification error:', notifErr);
      }
    }

    console.log(`BOG callback: order ${order.id} → ${paymentStatus}`);
    res.status(200).send('OK');
  } catch (err) {
    console.error('bog-callback error:', err);
    res.status(200).send('OK'); // Return 200 to prevent retries
  }
});

// ── BOG Payment Details ──
app.get('/functions/v1/bog-payment-details/:bogOrderId', async (req, res) => {
  try {
    const details = await getBogPaymentDetails(req.params.bogOrderId);
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Process Order Notification ──
app.post('/functions/v1/process-order-notification', async (req, res) => {
  try {
    const { order } = req.body;
    if (!order || !order.id) return res.status(400).json({ error: 'Order data required' });

    const results = { sms_admin: { success: false }, sms_customer: { success: false }, email_customer: { success: false }, notification: { success: false } };

    // Check notification preferences
    const { rows: prefRows } = await pool.query('SELECT * FROM admin_notification_preferences LIMIT 1');
    const prefs = prefRows[0];
    const smsEnabled = prefs?.enable_sms_notifications !== false;

    // Fetch SMS settings
    let smsSettings = null;
    if (smsEnabled) {
      const { rows } = await pool.query("SELECT * FROM sms_provider_settings WHERE is_active = true LIMIT 1");
      smsSettings = rows[0];
    }

    // Helper: Format phone
    const formatPhone = (phone) => {
      let cleaned = phone.replace(/[\s\-\(\)]/g, '');
      if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
      if (cleaned.startsWith('0')) cleaned = '995' + cleaned.substring(1);
      if (!cleaned.startsWith('995') && cleaned.length === 9) cleaned = '995' + cleaned;
      return cleaned;
    };

    // SMS to admin
    if (smsSettings?.api_key && smsSettings?.sender_name) {
      try {
        const { rows: adminNumbers } = await pool.query("SELECT phone FROM admin_phone_numbers WHERE is_active = true");
        if (adminNumbers.length > 0) {
          const customerName = `${order.customer_info?.firstName || ''} ${order.customer_info?.lastName || ''}`.trim();
          const phone = order.customer_info?.phone || 'N/A';
          const total = order.total_amount ? `${order.total_amount}₾` : 'N/A';
          const orderNum = order.order_number || order.id?.substring(0, 8);
          const paymentMethod = order.payment_method === 'card' ? 'ბარათი' : 'ნაღდი';
          const adminMessage = `ახალი შეკვეთა #${orderNum}! ${customerName}, ${phone}, ${total} (${paymentMethod}). handicraftkids.com/admin`;

          const destinations = adminNumbers.map(n => formatPhone(n.phone)).join(',');
          const params = new URLSearchParams({ key: smsSettings.api_key, destination: destinations, sender: smsSettings.sender_name, content: adminMessage });
          const smsRes = await fetch(`https://smsoffice.ge/api/v2/send/?${params}`);
          const smsResult = await smsRes.json();
          results.sms_admin.success = smsResult?.Success === true || smsResult?.ErrorCode === 0;
        }
      } catch (e) { console.error('Admin SMS error:', e); }

      // SMS to customer
      const customerPhone = order.customer_info?.phone;
      if (customerPhone) {
        try {
          const orderNum = order.order_number || order.id?.substring(0, 8);
          const total = order.total_amount ? `${order.total_amount}₾` : '';
          const customerMessage = `მადლობა შეკვეთისთვის #${orderNum}! თანხა: ${total}. შეკვეთა მუშავდება. Handicraft Kids`;
          const params = new URLSearchParams({ key: smsSettings.api_key, destination: formatPhone(customerPhone), sender: smsSettings.sender_name, content: customerMessage });
          const smsRes = await fetch(`https://smsoffice.ge/api/v2/send/?${params}`);
          const smsResult = await smsRes.json();
          results.sms_customer.success = smsResult?.Success === true || smsResult?.ErrorCode === 0;
        } catch (e) { console.error('Customer SMS error:', e); }
      }
    }

    // In-app notification
    try {
      const customerName = `${order.customer_info?.firstName || ''} ${order.customer_info?.lastName || ''}`.trim();
      const total = order.total_amount ? `₾${order.total_amount}` : '';
      await pool.query(
        `INSERT INTO notifications (title, message, type, order_id, is_read) VALUES ($1, $2, $3, $4, false)`,
        ['ახალი შეკვეთა!', `${customerName || 'მომხმარებელი'} - ${total}`, 'order', order.id]
      );
      results.notification.success = true;
    } catch (e) { console.error('Notification error:', e); }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Send SMS ──
app.post('/functions/v1/send-sms', async (req, res) => {
  try {
    const { phone, orderData, type, message: directMessage } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });

    const { rows } = await pool.query("SELECT * FROM sms_provider_settings WHERE is_active = true LIMIT 1");
    const settings = rows[0];
    if (!settings) return res.json({ success: false, message: 'SMS provider not configured' });

    let cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '995' + cleanPhone.substring(1);
    if (!cleanPhone.startsWith('995') && cleanPhone.length === 9) cleanPhone = '995' + cleanPhone;

    let content = directMessage || '';
    if (!content && orderData) {
      const orderNum = orderData.order_number || orderData.id?.substring(0, 8);
      const total = orderData.total_amount ? `${orderData.total_amount}₾` : '';
      if (type === 'admin') {
        const name = `${orderData.customer_info?.firstName || ''} ${orderData.customer_info?.lastName || ''}`.trim();
        content = `ახალი შეკვეთა #${orderNum}! ${name}, ${orderData.customer_info?.phone || ''}, ${total}. handicraftkids.com/admin`;
      } else {
        content = `მადლობა შეკვეთისთვის #${orderNum}! თანხა: ${total}. Handicraft Kids`;
      }
    }
    if (!content) content = 'Handicraft Kids - შეტყობინება';

    const params = new URLSearchParams({ key: settings.api_key, destination: cleanPhone, sender: settings.sender_name, content });
    const smsRes = await fetch(`https://smsoffice.ge/api/v2/send/?${params}`);
    const smsResult = await smsRes.json();
    const isSuccess = smsResult?.Success === true || smsResult?.ErrorCode === 0;

    res.json({ success: isSuccess, content, response: smsResult });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Send Test SMS ──
app.post('/functions/v1/send-test-sms', async (req, res) => {
  try {
    const { rows: settingsRows } = await pool.query("SELECT * FROM sms_provider_settings WHERE is_active = true LIMIT 1");
    const settings = settingsRows[0];
    if (!settings) return res.json({ success: false, message: 'SMS provider not configured' });

    const { rows: adminNumbers } = await pool.query("SELECT phone FROM admin_phone_numbers WHERE is_active = true LIMIT 1");
    if (adminNumbers.length === 0) return res.json({ success: false, message: 'No active admin phone numbers' });

    let phone = adminNumbers[0].phone.replace(/[\s\-\(\)\+]/g, '');
    if (!phone.startsWith('995')) phone = phone.startsWith('0') ? '995' + phone.substring(1) : '995' + phone;

    const testMessage = `სატესტო SMS - Handicraft Kids. ${new Date().toLocaleString('ka-GE')}`;
    const params = new URLSearchParams({ key: settings.api_key, destination: phone, sender: settings.sender_name, content: testMessage });
    const smsRes = await fetch(`https://smsoffice.ge/api/v2/send/?${params}`);
    const smsResult = await smsRes.json();
    const isSuccess = smsResult?.Success === true || smsResult?.ErrorCode === 0;

    await pool.query(
      'INSERT INTO sms_logs (recipient_phone, message, status, response) VALUES ($1, $2, $3, $4)',
      [phone, testMessage, isSuccess ? 'sent' : 'failed', JSON.stringify(smsResult)]
    );

    res.json({ success: isSuccess, message: isSuccess ? 'Test SMS sent' : `Failed: ${smsResult?.Message}`, response: smsResult });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Send Order Email ──
app.post('/functions/v1/send-order-email', async (req, res) => {
  try {
    const { to, subject, html, type } = req.body;
    if (!to || !subject || !html) return res.status(400).json({ success: false, message: 'Missing: to, subject, html' });

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return res.json({ success: false, message: 'Email service not configured (RESEND_API_KEY)' });

    const fromAddress = type === 'admin'
      ? 'Handicraft Kids Admin <admin@handicraftkids.com>'
      : 'Handicraft Kids <info@handicraftkids.com>';

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: fromAddress, to: Array.isArray(to) ? to : [to], subject, html }),
    });
    const result = await emailRes.json();

    res.json({ success: emailRes.ok, message: emailRes.ok ? 'Email sent' : result?.message, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Manage Admin Phones ──
app.post('/functions/v1/manage-admin-phones', async (req, res) => {
  try {
    const { action, phone, phone_id } = req.body;

    if (action === 'add' && phone) {
      const { rows } = await pool.query(
        'INSERT INTO admin_phone_numbers (phone, is_active) VALUES ($1, true) RETURNING *',
        [phone]
      );
      return res.json({ success: true, data: rows[0] });
    }
    if ((action === 'remove' || action === 'delete') && (phone_id || req.body.id)) {
      const targetId = phone_id || req.body.id;
      await pool.query('DELETE FROM admin_phone_numbers WHERE id = $1', [targetId]);
      return res.json({ success: true });
    }
    if (action === 'toggle' && (req.body.id || phone_id)) {
      const targetId = req.body.id || phone_id;
      const newState = req.body.is_active;
      await pool.query('UPDATE admin_phone_numbers SET is_active = $1 WHERE id = $2', [newState, targetId]);
      return res.json({ success: true });
    }
    if (action === 'list') {
      const { rows } = await pool.query('SELECT * FROM admin_phone_numbers ORDER BY created_at DESC');
      return res.json({ success: true, data: rows });
    }

    res.status(400).json({ success: false, message: 'Invalid action' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Contact Messages ──
app.post('/functions/v1/submit-contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ success: false, message: 'All fields required' });
    const { rows } = await pool.query(
      'INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3) RETURNING *',
      [name, email, message]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Get Dots (loyalty/rewards points) ──
app.post('/functions/v1/get-dots', async (req, res) => {
  try {
    // Check if dots_history table exists, if not return defaults
    const { rows } = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dots_history')
    `);
    
    if (!rows[0].exists) {
      return res.json({ total_dots: 0, history: [], last_updated: null });
    }
    
    const { rows: history } = await pool.query('SELECT * FROM dots_history ORDER BY created_at DESC');
    const totalDots = history.reduce((sum, h) => sum + (h.dots || 0), 0);
    
    res.json({
      total_dots: totalDots,
      history,
      last_updated: history[0]?.created_at || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create Admin User ──
app.post('/functions/v1/create-admin-user', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    
    await pool.query(
      'INSERT INTO admin_users (id, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
      [id, email, passwordHash]
    );

    res.json({ success: true, message: 'Admin user created', user: { id, email } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Send Password Reset Email ──
app.post('/functions/v1/send-password-reset-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    // Check if user exists
    const { rows } = await pool.query('SELECT id FROM admin_users WHERE email = $1', [email]);
    if (rows.length === 0) {
      // Don't reveal if email exists or not
      return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    await pool.query(
      'UPDATE admin_users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
      [resetToken, expiresAt, email]
    );

    // Try sending via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      const resetUrl = `${SITE_URL}/admin/reset-password/${resetToken}`;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Handicraft Kids <noreply@handicraftkids.com>',
          to: [email],
          subject: 'პაროლის აღდგენა - Handicraft Kids',
          html: `<p>პაროლის აღსადგენად დააწკაპეთ ამ ბმულზე:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>ბმული მოქმედებს 1 საათის განმავლობაში.</p>`,
        }),
      });
    }

    res.json({ success: true, message: 'Reset email sent' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Reset Admin Password ──
app.post('/functions/v1/reset-admin-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, error: 'Token and new password required' });

    const { rows } = await pool.query(
      'SELECT id FROM admin_users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE admin_users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [passwordHash, rows[0].id]
    );

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════
// REALTIME SIMULATION (polling endpoint)
// ════════════════════════════════════════════
// Since we don't have WebSocket, provide a polling endpoint
app.get('/rest/v1/realtime/changes', async (req, res) => {
  try {
    const { table, since } = req.query;
    const sinceDate = since || new Date(Date.now() - 30000).toISOString();

    if (table) {
      // Check which timestamp columns exist in the table
      const { rows: cols } = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name IN ('created_at', 'updated_at')`,
        [table]
      );
      const colNames = cols.map(c => c.column_name);
      if (colNames.length === 0) {
        return res.json([]);
      }
      const conditions = colNames.map(c => `"${c}" > $1`).join(' OR ');
      const orderCol = colNames.includes('created_at') ? 'created_at' : colNames[0];
      const { rows } = await pool.query(
        `SELECT * FROM "${table}" WHERE ${conditions} ORDER BY "${orderCol}" DESC LIMIT 50`,
        [sinceDate]
      );
      res.json(rows);
    } else {
      res.json([]);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── Health check ──
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// ══════════════════════════════════════════════
// SPA SERVING + DYNAMIC OG META TAG INJECTION
// ══════════════════════════════════════════════

const DIST_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'dist');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');

// Serve static assets from dist
app.use(express.static(DIST_DIR, { index: false }));

// Helper: detect social media crawlers
function isCrawler(userAgent) {
  if (!userAgent) return false;
  const bots = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Pinterest|Discordbot|Googlebot/i;
  return bots.test(userAgent);
}

// Helper: escape HTML to prevent XSS in meta tags
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Product page OG injection for crawlers
app.get('/product/:id', async (req, res) => {
  try {
    if (!isCrawler(req.headers['user-agent'])) {
      // Normal user – serve SPA
      if (fs.existsSync(INDEX_HTML_PATH)) {
        return res.sendFile(INDEX_HTML_PATH);
      }
      return res.status(404).send('Not found');
    }

    // It's a crawler – inject product OG tags
    const { id } = req.params;
    const { rows } = await pool.query('SELECT name, description, image_url, price, meta_title, meta_description FROM products WHERE id = $1', [id]);
    const product = rows[0];

    if (!product || !fs.existsSync(INDEX_HTML_PATH)) {
      if (fs.existsSync(INDEX_HTML_PATH)) return res.sendFile(INDEX_HTML_PATH);
      return res.status(404).send('Not found');
    }

    let html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
    const siteUrl = process.env.SITE_URL || 'https://handicraft.com.ge';
    const title = escapeHtml(product.meta_title || product.name || 'Handicraft');
    const desc = escapeHtml(product.meta_description || (product.description || '').substring(0, 160));
    const image = escapeHtml(product.image_url || '');
    const url = `${siteUrl}/product/${id}`;
    const price = product.price || '';

    // Replace existing OG tags in index.html
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${title} - Handicraft</title>`)
      .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${desc}" />`)
      .replace(/<meta property="og:type"[^>]*>/, `<meta property="og:type" content="product" />`)
      .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${title} - Handicraft" />`)
      .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${desc}" />`)
      .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${image}" />`)
      .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`)
      .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`);

    // Add product price meta if not already present
    if (price && !html.includes('product:price:amount')) {
      html = html.replace('</head>', `<meta property="product:price:amount" content="${escapeHtml(String(price))}" />\n<meta property="product:price:currency" content="GEL" />\n</head>`);
    }

    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('OG injection error:', err);
    if (fs.existsSync(INDEX_HTML_PATH)) return res.sendFile(INDEX_HTML_PATH);
    res.status(500).send('Server error');
  }
});

// Catch-all: serve SPA for all other non-API routes
app.get('*', (req, res) => {
  // Skip API-like paths
  if (req.path.startsWith('/rest/') || req.path.startsWith('/auth/') || req.path.startsWith('/storage/') || req.path.startsWith('/functions/') || req.path.startsWith('/uploads/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (fs.existsSync(INDEX_HTML_PATH)) {
    return res.sendFile(INDEX_HTML_PATH);
  }
  res.status(404).send('Not found');
});

// ── Start server ──
app.listen(PORT, () => {
  console.log(`\n  🚀 Backend API running on http://localhost:${PORT}`);
  console.log(`  📦 PostgreSQL: ${process.env.DB_HOST || '194.163.172.62'}:5432`);
  console.log(`  🗄️  MinIO S3: https://ihost.ge/s3\n`);
});
