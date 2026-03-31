// ============================================================
// Migration Script: Supabase → Self-hosted PostgreSQL + MinIO
// Usage: node server/migrate.js
// ============================================================

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Supabase (source) ──
const SUPABASE_URL = 'https://ubfzmfbjifnwoovgikkc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZnptZmJqaWZud29vdmdpa2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNTIyMjYsImV4cCI6MjA4MDkyODIyNn0.K0gfZMkXOAHHiBD5e8kU9cFgAQ3HS5kJydEk-5FK3CU';

// ── New PostgreSQL (destination) ──
const NEW_PG = {
  host: '194.163.172.62',
  port: 5432,
  database: 'site_handicraftkids_com',
  user: 'user_handicraftkids_com',
  password: 'f8Dx0PVZJV181v45vuW5',
};

// ── MinIO S3 (destination for files) ──
const MINIO_ENDPOINT = 'https://ihost.ge/s3';
const MINIO_BUCKET = 'site-handicraftkids-com';
const MINIO_ACCESS_KEY = 'U47PlvnlLJUkadEw';
const MINIO_SECRET_KEY = '0EbJwZ8vI60BzeG3bm5ua6PpYrdduVV2';
const MINIO_PUBLIC_URL = 'https://ihost.ge/s3/site-handicraftkids-com';

// Supabase storage URL pattern
const SUPABASE_STORAGE_BASE = 'https://ubfzmfbjifnwoovgikkc.supabase.co/storage/v1/object/public';

// Tables to migrate (in order, respecting foreign keys)
const TABLES = [
  'categories',
  'products',
  'product_images',
  'category_attributes',
  'product_attributes',
  'orders',
  'notifications',
  'translations',
  'hero_slides',
  'homepage_sections',
  'pages_content',
  'admin_users',
  'admin_phone_numbers',
  'admin_notification_preferences',
  'flitt_settings',
  'sms_provider_settings',
  'sms_logs',
  'notification_logs',
  'product_audit_logs',
];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Helper: download file from URL ──
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ── Helper: upload file to MinIO via S3 PUT ──
async function uploadToMinIO(filePath, buffer, contentType) {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  
  const s3 = new S3Client({
    endpoint: MINIO_ENDPOINT,
    region: 'us-east-1',
    credentials: {
      accessKeyId: MINIO_ACCESS_KEY,
      secretAccessKey: MINIO_SECRET_KEY,
    },
    forcePathStyle: true,
  });

  await s3.send(new PutObjectCommand({
    Bucket: MINIO_BUCKET,
    Key: filePath,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  }));

  return `${MINIO_PUBLIC_URL}/${filePath}`;
}

// ── Step 1: Export data from Supabase ──
async function exportFromSupabase() {
  console.log('\n═══ STEP 1: Exporting data from Supabase ═══\n');
  const allData = {};

  for (const table of TABLES) {
    try {
      // Fetch all rows (paginate for large tables)
      let allRows = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .range(offset, offset + pageSize - 1);

        if (error) {
          console.log(`  ⚠ ${table}: ${error.message}`);
          break;
        }

        if (data && data.length > 0) {
          allRows = allRows.concat(data);
          offset += pageSize;
          if (data.length < pageSize) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      allData[table] = allRows;
      console.log(`  ✓ ${table}: ${allRows.length} rows`);
    } catch (err) {
      console.log(`  ✗ ${table}: ${err.message}`);
      allData[table] = [];
    }
  }

  // Save to JSON backup
  const backupPath = path.join(__dirname, 'backup-supabase.json');
  fs.writeFileSync(backupPath, JSON.stringify(allData, null, 2));
  console.log(`\n  💾 Backup saved to ${backupPath}`);

  return allData;
}

// ── Step 2: Create schema on new PostgreSQL ──
async function createSchema(pool) {
  console.log('\n═══ STEP 2: Creating schema on new PostgreSQL ═══\n');

  // Drop existing tables (to re-create cleanly)
  const dropOrder = [
    'product_audit_logs', 'notification_logs', 'sms_logs',
    'product_attributes', 'product_images', 'category_attributes',
    'notifications', 'admin_notification_preferences', 'admin_phone_numbers',
    'flitt_settings', 'sms_provider_settings', 'admin_users',
    'hero_slides', 'homepage_sections', 'pages_content', 'translations',
    'orders', 'products', 'categories',
  ];
  for (const t of dropOrder) {
    await pool.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
  }
  await pool.query('DROP FUNCTION IF EXISTS decrement_stock(UUID, INTEGER)');
  console.log('  ✓ Dropped existing tables');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schemaSql);
  console.log('  ✓ Schema created successfully');
}

// ── Step 3: Import data to new PostgreSQL ──
async function importToPostgres(pool, allData) {
  console.log('\n═══ STEP 3: Importing data to new PostgreSQL ═══\n');

  // Disable FK constraints during import (user-level approach)
  const fkTables = ['product_images', 'product_attributes', 'category_attributes', 'notifications', 'product_audit_logs'];
  for (const t of fkTables) {
    try {
      await pool.query(`ALTER TABLE "${t}" DISABLE TRIGGER ALL`);
    } catch { /* ignore if not supported */ }
  }

  for (const table of TABLES) {
    const rows = allData[table];
    if (!rows || rows.length === 0) {
      console.log(`  ⊘ ${table}: no data to import`);
      continue;
    }

    // Get actual DB columns to filter out any that don't exist
    const { rows: colInfo } = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [table]
    );
    const dbColumns = new Set(colInfo.map(c => c.column_name));

    let imported = 0;
    let errors = 0;
    for (const row of rows) {
      // Only use columns that exist in the DB
      const columns = Object.keys(row).filter(c => dbColumns.has(c));
      const values = columns.map((col) => {
        const v = row[col];
        return typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
      });
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const colNames = columns.map((c) => `"${c}"`).join(', ');

      try {
        await pool.query(
          `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
        imported++;
      } catch (err) {
        errors++;
        if (errors <= 2) console.log(`  ⚠ ${table}: ${err.message.substring(0, 80)}`);
      }
    }

    console.log(`  ✓ ${table}: ${imported}/${rows.length} rows imported${errors > 0 ? ` (${errors} errors)` : ''}`);
  }

  // Re-enable FK constraints
  for (const t of fkTables) {
    try {
      await pool.query(`ALTER TABLE "${t}" ENABLE TRIGGER ALL`);
    } catch { /* ignore */ }
  }
  console.log('  ✓ FK constraints re-enabled');
}

// ── Step 4: Migrate storage files ──
async function migrateStorage(pool) {
  console.log('\n═══ STEP 4: Migrating storage files to MinIO ═══\n');

  // Collect all Supabase storage URLs from the database
  const urlQueries = [
    { table: 'products', column: 'image_url' },
    { table: 'product_images', column: 'image_url' },
    { table: 'hero_slides', column: 'image_url' },
    { table: 'hero_slides', column: 'decorative_icon_url' },
    { table: 'categories', column: 'icon_url' },
    { table: 'pages_content', column: 'hero_image_url' },
  ];

  let totalMigrated = 0;
  let totalFailed = 0;

  for (const { table, column } of urlQueries) {
    try {
      const { rows } = await pool.query(
        `SELECT id, "${column}" FROM ${table} WHERE "${column}" IS NOT NULL AND "${column}" LIKE '%supabase%'`
      );

      for (const row of rows) {
        const oldUrl = row[column];
        if (!oldUrl || !oldUrl.includes('supabase')) continue;

        try {
          // Extract path from Supabase URL
          const supabasePath = oldUrl.split('/storage/v1/object/public/')[1];
          if (!supabasePath) continue;

          // Download from Supabase
          const buffer = await downloadFile(oldUrl);

          // Determine content type from extension
          const ext = path.extname(supabasePath).toLowerCase();
          const contentTypes = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
          };
          const contentType = contentTypes[ext] || 'application/octet-stream';

          // Upload to MinIO
          const newUrl = await uploadToMinIO(supabasePath, buffer, contentType);

          // Update database reference
          await pool.query(
            `UPDATE ${table} SET "${column}" = $1 WHERE id = $2`,
            [newUrl, row.id]
          );

          totalMigrated++;
          process.stdout.write(`\r  ✓ Migrated: ${totalMigrated} files`);
        } catch (fileErr) {
          totalFailed++;
          console.log(`\n  ⚠ Failed: ${oldUrl} - ${fileErr.message}`);
        }
      }
    } catch (err) {
      console.log(`  ⚠ ${table}.${column}: ${err.message}`);
    }
  }

  console.log(`\n  📁 Storage migration complete: ${totalMigrated} migrated, ${totalFailed} failed`);
}

// ── Step 5: Update remaining Supabase URLs in JSONB fields ──
async function updateJsonbUrls(pool) {
  console.log('\n═══ STEP 5: Updating Supabase URLs in JSONB fields ═══\n');

  // Orders: products array may have image_url fields
  try {
    const { rows } = await pool.query(
      `SELECT id, products FROM orders WHERE products::text LIKE '%supabase%'`
    );

    let updated = 0;
    for (const row of rows) {
      if (row.products && Array.isArray(row.products)) {
        const updatedProducts = row.products.map((p) => {
          if (p.image_url && p.image_url.includes('supabase')) {
            const supabasePath = p.image_url.split('/storage/v1/object/public/')[1];
            if (supabasePath) {
              p.image_url = `${MINIO_PUBLIC_URL}/${supabasePath}`;
            }
          }
          return p;
        });

        await pool.query(
          `UPDATE orders SET products = $1 WHERE id = $2`,
          [JSON.stringify(updatedProducts), row.id]
        );
        updated++;
      }
    }
    console.log(`  ✓ Updated ${updated} order records`);
  } catch (err) {
    console.log(`  ⚠ Orders JSONB update: ${err.message}`);
  }

  // pages_content: staff_data may have image URLs
  try {
    const { rows } = await pool.query(
      `SELECT id, staff_data FROM pages_content WHERE staff_data::text LIKE '%supabase%'`
    );

    let updated = 0;
    for (const row of rows) {
      if (row.staff_data) {
        let staffJson = JSON.stringify(row.staff_data);
        staffJson = staffJson.replace(
          /https:\/\/ubfzmfbjifnwoovgikkc\.supabase\.co\/storage\/v1\/object\/public\//g,
          `${MINIO_PUBLIC_URL}/`
        );
        await pool.query(
          `UPDATE pages_content SET staff_data = $1 WHERE id = $2`,
          [staffJson, row.id]
        );
        updated++;
      }
    }
    console.log(`  ✓ Updated ${updated} pages_content records`);
  } catch (err) {
    console.log(`  ⚠ pages_content JSONB update: ${err.message}`);
  }
}

// ── Main ──
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Supabase → Self-hosted Migration               ║');
  console.log('║  handicraftkids.com                              ║');
  console.log('╚══════════════════════════════════════════════════╝');

  // Step 1: Export from Supabase
  const allData = await exportFromSupabase();

  // Step 2-5: Connect to new PG and do everything
  const pool = new pg.Pool(NEW_PG);
  try {
    // Test connection
    const { rows } = await pool.query('SELECT NOW()');
    console.log(`\n  ✓ Connected to new PostgreSQL at ${NEW_PG.host}: ${rows[0].now}`);

    await createSchema(pool);
    await importToPostgres(pool, allData);

    // Try storage migration (requires @aws-sdk/client-s3)
    try {
      await migrateStorage(pool);
      await updateJsonbUrls(pool);
    } catch (err) {
      console.log(`\n  ⚠ Storage migration skipped: ${err.message}`);
      console.log('    Install @aws-sdk/client-s3 to enable: npm install @aws-sdk/client-s3');
    }
  } finally {
    await pool.end();
  }

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Migration complete!                             ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
