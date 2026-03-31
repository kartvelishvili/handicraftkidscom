const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Config — all sensitive values MUST come from environment variables
const DB_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3000;
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const S3_REGION = process.env.S3_REGION || 'us-east-1';

if (!DB_URL) { console.error('FATAL: DATABASE_URL is required'); process.exit(1); }
if (!JWT_SECRET) { console.error('FATAL: JWT_SECRET is required'); process.exit(1); }

const pool = new Pool({ connectionString: DB_URL });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ============================================================
// Middleware: Extract auth token
// ============================================================
function extractUser(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    } catch (e) {
      req.user = null;
    }
  }
  next();
}
app.use(extractUser);

// ============================================================
// AUTH endpoints: /auth/v1/
// ============================================================
app.post('/auth/v1/token', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      access_token: token,
      token_type: 'bearer',
      expires_in: 604800,
      user: { id: user.id, email: user.email, role: 'admin' }
    });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/auth/v1/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existing = await pool.query('SELECT id FROM admin_users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const hash = await bcrypt.hash(password, 12);
    const id = require('crypto').randomUUID();
    const result = await pool.query(
      'INSERT INTO admin_users (id, email, password_hash, auth_id, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, email, created_at',
      [id, email, hash, id]
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      access_token: token,
      token_type: 'bearer',
      expires_in: 604800,
      user: { id: user.id, email: user.email, role: 'admin' }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// STORAGE endpoints: /storage/v1/
// ============================================================
app.post('/storage/v1/object/:bucket/*', upload.single('file'), async (req, res) => {
  try {
    const bucket = req.params.bucket;
    const filePath = req.params[0];
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Upload to MinIO/S3 using AWS Signature V4
    const { uploadToS3 } = require('./s3-upload');
    const result = await uploadToS3(bucket, filePath, req.file.buffer, req.file.mimetype);
    
    res.json({
      Key: filePath,
      Id: filePath,
      ...result
    });
  } catch (err) {
    console.error('Storage upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

app.get('/storage/v1/object/public/:bucket/*', (req, res) => {
  const bucket = req.params.bucket;
  const filePath = req.params[0];
  res.redirect(`${S3_ENDPOINT}/${bucket}/${filePath}`);
});

// ============================================================
// FUNCTIONS endpoints: /functions/v1/
// ============================================================
app.post('/functions/v1/:name', async (req, res) => {
  const name = req.params.name;
  try {
    switch (name) {
      case 'get-dots':
        return res.json({ dots: [] });
      case 'process-order-notification':
        return res.json({ success: true });
      case 'send-sms':
        return res.json({ success: true, message: 'SMS sending not configured' });
      case 'send-test-sms':
        return res.json({ success: true, message: 'Test SMS not configured' });
      case 'send-order-email':
        return res.json({ success: true, message: 'Email sending not configured' });
      case 'bog-create-order':
        return res.json({ error: 'Payment gateway not configured' });
      case 'manage-admin-phones': {
        const { action, phone } = req.body || {};
        if (action === 'add' && phone) {
          await pool.query(
            'INSERT INTO admin_phone_numbers (id, phone, created_at) VALUES (gen_random_uuid(), $1, NOW()) ON CONFLICT DO NOTHING',
            [phone]
          );
          return res.json({ success: true });
        }
        if (action === 'remove' && phone) {
          await pool.query('DELETE FROM admin_phone_numbers WHERE phone = $1', [phone]);
          return res.json({ success: true });
        }
        if (action === 'list') {
          const result = await pool.query('SELECT * FROM admin_phone_numbers ORDER BY created_at');
          return res.json({ phones: result.rows });
        }
        return res.json({ success: true });
      }
      default:
        return res.json({ message: `Function ${name} not implemented` });
    }
  } catch (err) {
    console.error(`Function ${name} error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// REALTIME stub: /rest/v1/realtime/changes
// ============================================================
app.get('/rest/v1/realtime/changes', (req, res) => {
  res.json([]);
});

// ============================================================
// RPC endpoints: /rest/v1/rpc/:name
// ============================================================
app.post('/rest/v1/rpc/:name', async (req, res) => {
  const name = req.params.name;
  try {
    // Try calling a PostgreSQL function
    const params = req.body || {};
    const keys = Object.keys(params);
    if (keys.length === 0) {
      const result = await pool.query(`SELECT * FROM ${quoteIdent(name)}()`);
      return res.json(result.rows);
    }
    const placeholders = keys.map((k, i) => `${quoteIdent(k)} := $${i + 1}`).join(', ');
    const values = keys.map(k => params[k]);
    const result = await pool.query(`SELECT * FROM ${quoteIdent(name)}(${placeholders})`, values);
    res.json(result.rows);
  } catch (err) {
    console.error(`RPC ${name} error:`, err);
    res.status(400).json({ message: err.message });
  }
});

// ============================================================
// PostgREST-compatible REST: /rest/v1/:table
// ============================================================

// Helper: quote identifier to prevent SQL injection
function quoteIdent(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid identifier: ${name}`);
  }
  return '"' + name + '"';
}

// Foreign key map for embedded relations
const FK_MAP = {
  'products.category_id': 'categories.id',
  'product_images.product_id': 'products.id',
  'product_attributes.product_id': 'products.id',
  'product_attributes.category_id': 'categories.id',
  'category_attributes.category_id': 'categories.id',
  'product_translations.product_id': 'products.id',
  'product_audit_logs.product_id': 'products.id',
  'notifications.order_id': 'orders.id',
};

// Build reverse FK map too (for parent-to-child relations)
const REVERSE_FK = {};
for (const [child, parent] of Object.entries(FK_MAP)) {
  const [childTable, childCol] = child.split('.');
  const [parentTable, parentCol] = parent.split('.');
  if (!REVERSE_FK[parentTable]) REVERSE_FK[parentTable] = [];
  REVERSE_FK[parentTable].push({ childTable, childCol, parentCol });
  if (!REVERSE_FK[childTable]) REVERSE_FK[childTable] = [];
  // Also direct FK from child -> parent
}

// Find relation between two tables
function findRelation(mainTable, relatedTable) {
  // Check child -> parent (e.g., products -> categories via category_id)
  const key1 = Object.keys(FK_MAP).find(k => {
    const [ct] = k.split('.');
    const [pt] = FK_MAP[k].split('.');
    return ct === mainTable && pt === relatedTable;
  });
  if (key1) {
    const [, childCol] = key1.split('.');
    const [, parentCol] = FK_MAP[key1].split('.');
    return { type: 'many-to-one', mainCol: childCol, relatedCol: parentCol };
  }
  // Check parent -> child (e.g., products -> product_images)
  const key2 = Object.keys(FK_MAP).find(k => {
    const [ct] = k.split('.');
    const [pt] = FK_MAP[k].split('.');
    return ct === relatedTable && pt === mainTable;
  });
  if (key2) {
    const [, childCol] = key2.split('.');
    const [, parentCol] = FK_MAP[key2].split('.');
    return { type: 'one-to-many', mainCol: parentCol, relatedCol: childCol };
  }
  return null;
}

// Parse PostgREST select with embedded relations
function parseSelect(selectStr) {
  if (!selectStr) return { columns: ['*'], embeds: [] };
  
  const embeds = [];
  const columns = [];
  
  // Match relation(columns) patterns
  let remaining = selectStr;
  const embedRegex = /(\w+)\(([^)]*)\)/g;
  let match;
  while ((match = embedRegex.exec(selectStr)) !== null) {
    embeds.push({ table: match[1], select: match[2] || '*' });
    remaining = remaining.replace(match[0], '');
  }
  
  // Parse remaining columns
  remaining.split(',').forEach(c => {
    c = c.trim();
    if (c && c !== '') columns.push(c);
  });
  
  if (columns.length === 0) columns.push('*');
  
  return { columns, embeds };
}

// Parse PostgREST filter value
function parseFilterOp(value) {
  // not.op.value
  const notMatch = value.match(/^not\.(\w+)\.(.+)$/);
  if (notMatch) {
    const inner = parseFilterOp(`${notMatch[1]}.${notMatch[2]}`);
    return { ...inner, negate: true };
  }
  
  const ops = {
    'eq': '=', 'neq': '!=', 'gt': '>', 'gte': '>=',
    'lt': '<', 'lte': '<=', 'like': 'LIKE', 'ilike': 'ILIKE',
    'is': 'IS',
  };
  
  for (const [prefix, sqlOp] of Object.entries(ops)) {
    if (value.startsWith(prefix + '.')) {
      let val = value.slice(prefix.length + 1);
      if (prefix === 'is') {
        if (val === 'null') return { op: 'IS', value: null, literal: true };
        if (val === 'true') return { op: 'IS', value: true, literal: true };
        if (val === 'false') return { op: 'IS', value: false, literal: true };
      }
      return { op: sqlOp, value: val };
    }
  }
  
  // in.(val1,val2)
  const inMatch = value.match(/^in\.\((.+)\)$/);
  if (inMatch) {
    const values = inMatch[1].split(',').map(v => v.trim());
    return { op: 'IN', value: values };
  }
  
  // cs (contains) for JSONB
  if (value.startsWith('cs.')) {
    return { op: '@>', value: value.slice(3), jsonb: true };
  }
  
  // cd (contained by) for JSONB
  if (value.startsWith('cd.')) {
    return { op: '<@', value: value.slice(3), jsonb: true };
  }
  
  return { op: '=', value };
}

// Build WHERE clause from query params
function buildWhere(query, table) {
  const conditions = [];
  const values = [];
  let paramIdx = 1;
  
  const reserved = ['select', 'order', 'limit', 'offset', 'on_conflict'];
  
  for (const [key, val] of Object.entries(query)) {
    if (reserved.includes(key)) continue;
    
    // Handle OR conditions
    if (key === 'or') {
      const orStr = val.replace(/^\(/, '').replace(/\)$/, '');
      const orParts = parseOrConditions(orStr);
      const orConditions = [];
      for (const part of orParts) {
        const dotIdx = part.indexOf('.');
        if (dotIdx === -1) continue;
        const col = part.substring(0, dotIdx);
        const rest = part.substring(dotIdx + 1);
        const parsed = parseFilterOp(rest);
        const cond = buildCondition(quoteIdent(col), parsed, values, paramIdx);
        if (cond) {
          orConditions.push(cond.sql);
          paramIdx = cond.nextIdx;
        }
      }
      if (orConditions.length > 0) {
        conditions.push(`(${orConditions.join(' OR ')})`);
      }
      continue;
    }
    
    const parsed = parseFilterOp(val);
    const cond = buildCondition(quoteIdent(key), parsed, values, paramIdx);
    if (cond) {
      conditions.push(cond.sql);
      paramIdx = cond.nextIdx;
    }
  }
  
  return { where: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '', values };
}

function parseOrConditions(str) {
  // Parse comma-separated conditions, respecting parentheses
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of str) {
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
  return parts;
}

function buildCondition(colQuoted, parsed, values, paramIdx) {
  if (parsed.literal) {
    const val = parsed.value === null ? 'NULL' : parsed.value.toString().toUpperCase();
    const neg = parsed.negate ? 'NOT ' : '';
    return { sql: `${colQuoted} IS ${neg}${val}`, nextIdx: paramIdx };
  }
  
  if (parsed.op === 'IN') {
    const placeholders = parsed.value.map((v, i) => `$${paramIdx + i}`);
    values.push(...parsed.value);
    const neg = parsed.negate ? 'NOT ' : '';
    return { sql: `${colQuoted} ${neg}IN (${placeholders.join(',')})`, nextIdx: paramIdx + parsed.value.length };
  }
  
  if (parsed.jsonb) {
    values.push(parsed.value);
    const neg = parsed.negate ? 'NOT ' : '';
    return { sql: `${neg}${colQuoted} ${parsed.op} $${paramIdx}::jsonb`, nextIdx: paramIdx + 1 };
  }
  
  values.push(parsed.value);
  const neg = parsed.negate ? 'NOT ' : '';
  return { sql: `${neg}${colQuoted} ${parsed.op} $${paramIdx}`, nextIdx: paramIdx + 1 };
}

// GET /rest/v1/:table
app.get('/rest/v1/:table', async (req, res) => {
  try {
    const table = req.params.table;
    quoteIdent(table); // validate table name
    
    const { columns, embeds } = parseSelect(req.query.select);
    const { where, values } = buildWhere(req.query, table);
    
    // Build column list
    let selectCols = columns.map(c => c === '*' ? `${quoteIdent(table)}.*` : `${quoteIdent(table)}.${quoteIdent(c.trim())}`).join(', ');
    
    // Build ORDER BY
    let orderBy = '';
    if (req.query.order) {
      const parts = req.query.order.split(',').map(p => {
        const [col, dir] = p.trim().split('.');
        return `${quoteIdent(col)} ${dir === 'desc' ? 'DESC' : 'ASC'}`;
      });
      orderBy = 'ORDER BY ' + parts.join(', ');
    }
    
    // Build LIMIT/OFFSET
    let limitOffset = '';
    if (req.query.limit) limitOffset += ` LIMIT ${parseInt(req.query.limit)}`;
    if (req.query.offset) limitOffset += ` OFFSET ${parseInt(req.query.offset)}`;
    
    // Execute main query
    const sql = `SELECT ${selectCols} FROM ${quoteIdent(table)} ${where} ${orderBy}${limitOffset}`;
    const result = await pool.query(sql, values);
    let rows = result.rows;
    
    // Handle embedded relations
    for (const embed of embeds) {
      const relation = findRelation(table, embed.table);
      if (!relation) continue;
      
      if (relation.type === 'many-to-one') {
        // e.g., products -> categories: each product has one category
        const parentIds = [...new Set(rows.map(r => r[relation.mainCol]).filter(Boolean))];
        if (parentIds.length > 0) {
          const placeholders = parentIds.map((_, i) => `$${i + 1}`).join(',');
          const embedResult = await pool.query(
            `SELECT * FROM ${quoteIdent(embed.table)} WHERE ${quoteIdent(relation.relatedCol)} IN (${placeholders})`,
            parentIds
          );
          const lookup = {};
          embedResult.rows.forEach(r => { lookup[r[relation.relatedCol]] = r; });
          rows = rows.map(r => ({ ...r, [embed.table]: lookup[r[relation.mainCol]] || null }));
        } else {
          rows = rows.map(r => ({ ...r, [embed.table]: null }));
        }
      } else if (relation.type === 'one-to-many') {
        // e.g., products -> product_images: each product has many images
        const parentIds = [...new Set(rows.map(r => r[relation.mainCol]).filter(Boolean))];
        if (parentIds.length > 0) {
          const placeholders = parentIds.map((_, i) => `$${i + 1}`).join(',');
          const embedResult = await pool.query(
            `SELECT * FROM ${quoteIdent(embed.table)} WHERE ${quoteIdent(relation.relatedCol)} IN (${placeholders})`,
            parentIds
          );
          const lookup = {};
          embedResult.rows.forEach(r => {
            const key = r[relation.relatedCol];
            if (!lookup[key]) lookup[key] = [];
            lookup[key].push(r);
          });
          rows = rows.map(r => ({ ...r, [embed.table]: lookup[r[relation.mainCol]] || [] }));
        } else {
          rows = rows.map(r => ({ ...r, [embed.table]: [] }));
        }
      }
    }
    
    // Handle Prefer: count header
    const prefer = req.headers.prefer || '';
    if (prefer.includes('count=exact')) {
      const countSql = `SELECT count(*) FROM ${quoteIdent(table)} ${where}`;
      const countResult = await pool.query(countSql, values);
      const total = parseInt(countResult.rows[0].count);
      const start = parseInt(req.query.offset) || 0;
      const end = start + rows.length - 1;
      res.set('Content-Range', `${start}-${end}/${total}`);
    }
    
    res.json(rows);
  } catch (err) {
    console.error('GET error:', err);
    res.status(400).json({ message: err.message, code: 'PGRST000' });
  }
});

// POST /rest/v1/:table (Insert / Upsert)
app.post('/rest/v1/:table', async (req, res) => {
  try {
    const table = req.params.table;
    quoteIdent(table);
    
    const prefer = req.headers.prefer || '';
    const isUpsert = prefer.includes('resolution=merge-duplicates');
    const returnData = prefer.includes('return=representation');
    
    let data = req.body;
    const isArray = Array.isArray(data);
    if (!isArray) data = [data];
    
    const results = [];
    for (const row of data) {
      const keys = Object.keys(row);
      const cols = keys.map(k => quoteIdent(k)).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map(k => row[k]);
      
      let sql;
      if (isUpsert) {
        const conflict = req.query.on_conflict || 'id';
        const updateSet = keys.filter(k => k !== conflict).map((k, i) => `${quoteIdent(k)} = EXCLUDED.${quoteIdent(k)}`).join(', ');
        sql = `INSERT INTO ${quoteIdent(table)} (${cols}) VALUES (${placeholders})`;
        if (updateSet) {
          sql += ` ON CONFLICT (${quoteIdent(conflict)}) DO UPDATE SET ${updateSet}`;
        } else {
          sql += ` ON CONFLICT (${quoteIdent(conflict)}) DO NOTHING`;
        }
        sql += ' RETURNING *';
      } else {
        sql = `INSERT INTO ${quoteIdent(table)} (${cols}) VALUES (${placeholders}) RETURNING *`;
      }
      
      const result = await pool.query(sql, values);
      results.push(...result.rows);
    }
    
    if (returnData) {
      res.status(201).json(isArray ? results : results[0]);
    } else {
      res.status(201).json(null);
    }
  } catch (err) {
    console.error('POST error:', err);
    res.status(400).json({ message: err.message, code: 'PGRST000' });
  }
});

// PATCH /rest/v1/:table (Update)
app.patch('/rest/v1/:table', async (req, res) => {
  try {
    const table = req.params.table;
    quoteIdent(table);
    
    const { where, values: whereValues } = buildWhere(req.query, table);
    if (!where) {
      return res.status(400).json({ message: 'PATCH requires at least one filter' });
    }
    
    const data = req.body;
    const keys = Object.keys(data);
    const setClauses = keys.map((k, i) => `${quoteIdent(k)} = $${whereValues.length + i + 1}`).join(', ');
    const setValues = keys.map(k => data[k]);
    
    const sql = `UPDATE ${quoteIdent(table)} SET ${setClauses} ${where} RETURNING *`;
    const result = await pool.query(sql, [...whereValues, ...setValues]);
    
    const prefer = req.headers.prefer || '';
    if (prefer.includes('return=representation')) {
      res.json(result.rows);
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error('PATCH error:', err);
    res.status(400).json({ message: err.message, code: 'PGRST000' });
  }
});

// DELETE /rest/v1/:table
app.delete('/rest/v1/:table', async (req, res) => {
  try {
    const table = req.params.table;
    quoteIdent(table);
    
    const { where, values } = buildWhere(req.query, table);
    if (!where) {
      return res.status(400).json({ message: 'DELETE requires at least one filter' });
    }
    
    const sql = `DELETE FROM ${quoteIdent(table)} ${where} RETURNING *`;
    const result = await pool.query(sql, values);
    
    const prefer = req.headers.prefer || '';
    if (prefer.includes('return=representation')) {
      res.json(result.rows);
    } else {
      res.status(204).send();
    }
  } catch (err) {
    console.error('DELETE error:', err);
    res.status(400).json({ message: err.message, code: 'PGRST000' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Handicraft API server running on port ${PORT}`);
  console.log(`Database: ${DB_URL.replace(/:[^:@]+@/, ':***@')}`);
});
