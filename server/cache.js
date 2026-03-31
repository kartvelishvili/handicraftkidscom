// ============================================================
// Two-tier Cache: In-memory (L1) + Redis (L2)
// ============================================================
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || '194.163.172.62',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'JpA5D5KMkw272k03Kn4PmOOW',
  db: parseInt(process.env.REDIS_DB || '4'),
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

let connected = false;

redis.connect().then(() => {
  connected = true;
  console.log('  ✅ Redis connected');
}).catch(err => {
  console.warn('  ⚠️  Redis unavailable, running without cache:', err.message);
});

redis.on('error', () => { connected = false; });
redis.on('ready', () => { connected = true; });

// ── In-memory L1 cache (fast, small TTL) ──
const memCache = new Map();
const MEM_MAX_SIZE = 100; // max entries
const MEM_TTL_MS = 30000; // 30 seconds

function memGet(key) {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { memCache.delete(key); return null; }
  return entry.data;
}

function memSet(key, data) {
  if (memCache.size >= MEM_MAX_SIZE) {
    // Evict oldest entry
    const firstKey = memCache.keys().next().value;
    memCache.delete(firstKey);
  }
  memCache.set(key, { data, expires: Date.now() + MEM_TTL_MS });
}

function memInvalidate(tablePattern) {
  for (const key of memCache.keys()) {
    if (key.includes(tablePattern)) memCache.delete(key);
  }
}

// TTL defaults for Redis (seconds)
const TTL = {
  products: 120,
  categories: 300,
  default: 60,
};

/**
 * Get cached value. L1 (memory) → L2 (Redis) → null.
 */
export async function cacheGet(key) {
  // L1: in-memory
  const mem = memGet(key);
  if (mem) return mem;

  // L2: Redis
  if (!connected) return null;
  try {
    const data = await redis.get(key);
    if (data) {
      const parsed = JSON.parse(data);
      memSet(key, parsed); // promote to L1
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Set cache value in both L1 and L2.
 */
export async function cacheSet(key, value, ttlSeconds) {
  memSet(key, value);
  if (!connected) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds || TTL.default);
  } catch { /* ignore */ }
}

/**
 * Invalidate cache by pattern in both L1 and L2.
 */
export async function cacheInvalidate(pattern) {
  // Extract table name from pattern like "rest:/rest/v1/products*"
  const tableMatch = pattern.match(/\/rest\/v1\/([^*?]+)/);
  if (tableMatch) memInvalidate(tableMatch[1]);

  if (!connected) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch { /* ignore */ }
}

/**
 * Build a cache key from request URL.
 */
export function buildCacheKey(req) {
  // Use the full URL path + query as cache key
  return `rest:${req.originalUrl}`;
}

/**
 * Get appropriate TTL for a table.
 */
export function getTTL(table) {
  return TTL[table] || TTL.default;
}

export default redis;
