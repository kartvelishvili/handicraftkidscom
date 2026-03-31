// ============================================================
// Storage client — MinIO S3 on s3.ihost.ge
// ============================================================
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import net from 'net';
import tls from 'tls';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── DNS override: s3.ihost.ge → 194.163.172.62 ──────────────
// Needed until Cloudflare DNS propagates the s3.ihost.ge record.
// Safe to remove once `dig s3.ihost.ge` returns 194.163.172.62.
const S3_HOST = 's3.ihost.ge';
const S3_IP = '194.163.172.62';

const origConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (options, ...args) {
  if (typeof options === 'object' && options.host === S3_HOST) {
    options = { ...options, host: S3_IP };
  }
  return origConnect.call(this, options, ...args);
};

const origTlsConnect = tls.connect;
tls.connect = function (options, ...args) {
  if (typeof options === 'object' && options.host === S3_HOST) {
    options = { ...options, host: S3_IP, servername: S3_HOST };
  }
  return origTlsConnect.call(this, options, ...args);
};
// ─────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BUCKET = process.env.S3_BUCKET || 'site-handicraftkids-com';
const ENDPOINT = process.env.S3_ENDPOINT || 'https://s3.ihost.ge';
const PUBLIC_URL = process.env.S3_PUBLIC_URL || 'https://s3.ihost.ge/site-handicraftkids-com';

// Local uploads directory (fallback)
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'U47PlvnlLJUkadEw',
    secretAccessKey: process.env.S3_SECRET_KEY || '0EbJwZ8vI60BzeG3bm5ua6PpYrdduVV2',
  },
  forcePathStyle: true,
});

export async function uploadFile(filePath, buffer, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: filePath,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${PUBLIC_URL}/${filePath}`;
}

export async function deleteFile(filePath) {
  await s3.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: filePath,
  }));
}

export function getPublicUrl(filePath) {
  return `${PUBLIC_URL}/${filePath}`;
}

export { s3, BUCKET, PUBLIC_URL, UPLOADS_DIR };
