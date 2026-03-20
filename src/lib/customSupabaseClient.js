// ============================================================
// Custom API Client — Drop-in replacement for Supabase JS client
// Supports: .from().select().eq()... / .storage / .auth / .functions / .rpc
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ────────────────────────────────────────────
// Auth state management
// ────────────────────────────────────────────
let _session = null;
let _user = null;
const _authListeners = new Set();

function loadSession() {
  try {
    const stored = localStorage.getItem('hck_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.expires_at && Date.now() / 1000 < parsed.expires_at) {
        _session = parsed;
        _user = parsed.user;
      } else {
        localStorage.removeItem('hck_session');
      }
    }
  } catch { /* ignore */ }
}
loadSession();

function saveSession(data) {
  _session = {
    access_token: data.access_token,
    user: data.user,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 604800),
  };
  _user = data.user;
  localStorage.setItem('hck_session', JSON.stringify(_session));
  _authListeners.forEach(fn => fn('SIGNED_IN', _session));
}

function clearSession() {
  _session = null;
  _user = null;
  localStorage.removeItem('hck_session');
  _authListeners.forEach(fn => fn('SIGNED_OUT', null));
}

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (_session?.access_token) {
    headers['Authorization'] = `Bearer ${_session.access_token}`;
  }
  return headers;
}

// ────────────────────────────────────────────
// Query Builder — mirrors Supabase .from() chain
// ────────────────────────────────────────────
class QueryBuilder {
  constructor(table) {
    this._table = table;
    this._select = '*';
    this._filters = [];
    this._order = [];
    this._limit = null;
    this._offset = null;
    this._single = false;
    this._maybeSingle = false;
    this._count = null;
    this._head = false;
    this._method = 'GET';
    this._body = null;
    this._upsert = false;
    this._onConflict = null;
    this._prefer = [];
  }

  select(columns, opts) {
    this._select = columns || '*';
    // Only set method to GET if no mutation method has been set
    if (!this._body && this._method === 'GET') this._method = 'GET';
    if (opts?.count) this._count = opts.count;
    if (opts?.head) this._head = true;
    return this;
  }

  insert(data, opts) {
    this._method = 'POST';
    this._body = data;
    this._prefer.push('return=representation');
    if (opts?.onConflict) {
      this._upsert = true;
      this._onConflict = opts.onConflict;
    }
    return this;
  }

  upsert(data, opts) {
    this._method = 'POST';
    this._body = data;
    this._upsert = true;
    this._onConflict = opts?.onConflict || null;
    this._prefer.push('return=representation', 'resolution=merge-duplicates');
    return this;
  }

  update(data) {
    this._method = 'PATCH';
    this._body = data;
    this._prefer.push('return=representation');
    return this;
  }

  delete() {
    this._method = 'DELETE';
    this._prefer.push('return=representation');
    return this;
  }

  eq(col, val) { this._filters.push([col, `eq.${val}`]); return this; }
  neq(col, val) { this._filters.push([col, `neq.${val}`]); return this; }
  gt(col, val) { this._filters.push([col, `gt.${val}`]); return this; }
  gte(col, val) { this._filters.push([col, `gte.${val}`]); return this; }
  lt(col, val) { this._filters.push([col, `lt.${val}`]); return this; }
  lte(col, val) { this._filters.push([col, `lte.${val}`]); return this; }
  like(col, val) { this._filters.push([col, `like.${val}`]); return this; }
  ilike(col, val) { this._filters.push([col, `ilike.${val}`]); return this; }
  is(col, val) { this._filters.push([col, `is.${val}`]); return this; }
  in(col, vals) { this._filters.push([col, `in.(${vals.join(',')})`]); return this; }
  not(col, op, val) { this._filters.push([col, `not.${op}.${val}`]); return this; }
  or(conditions) { this._filters.push(['or', `(${conditions})`]); return this; }
  contains(col, val) { this._filters.push([col, `cs.${JSON.stringify(val)}`]); return this; }
  containedBy(col, val) { this._filters.push([col, `cd.${JSON.stringify(val)}`]); return this; }

  order(col, opts = {}) {
    const dir = opts.ascending === false ? 'desc' : 'asc';
    this._order.push(`${col}.${dir}`);
    return this;
  }

  limit(n) { this._limit = n; return this; }
  range(from, to) { this._offset = from; this._limit = to - from + 1; return this; }
  single() { this._single = true; return this; }
  maybeSingle() { this._single = true; this._maybeSingle = true; return this; }

  // Execute the query
  async then(resolve, reject) {
    try {
      const result = await this._execute();
      resolve(result);
    } catch (err) {
      if (reject) reject(err);
      else resolve({ data: null, error: err });
    }
  }

  async _execute() {
    const url = new URL(`${API_BASE}/rest/v1/${this._table}`);

    if (this._select) url.searchParams.set('select', this._select);

    for (const [col, val] of this._filters) {
      url.searchParams.set(col, val);
    }

    if (this._order.length > 0) {
      url.searchParams.set('order', this._order.join(','));
    }

    if (this._limit !== null) url.searchParams.set('limit', this._limit);
    if (this._offset !== null) url.searchParams.set('offset', this._offset);

    if (this._upsert && this._onConflict) {
      url.searchParams.set('on_conflict', this._onConflict);
    }

    const headers = getAuthHeaders();
    const preferParts = [...this._prefer];
    if (this._count) preferParts.push(`count=${this._count}`);
    if (preferParts.length > 0) headers['Prefer'] = preferParts.join(', ');

    const fetchOpts = { method: this._method, headers };
    if (this._body && (this._method === 'POST' || this._method === 'PATCH')) {
      fetchOpts.body = JSON.stringify(this._body);
    }

    try {
      const response = await fetch(url.toString(), fetchOpts);

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ message: response.statusText }));
        return { data: null, error: { message: errBody.message || response.statusText, code: errBody.code } };
      }

      let data = await response.json().catch(() => null);

      let count = null;
      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)/);
        if (match) count = parseInt(match[1]);
      }

      if (this._head) {
        return { data: null, error: null, count };
      }

      if (this._single) {
        if (Array.isArray(data)) {
          if (data.length === 0) {
            if (this._maybeSingle) return { data: null, error: null, count };
            return { data: null, error: { message: 'No rows found', code: 'PGRST116' }, count };
          }
          data = data[0];
        }
      }

      if ((this._method === 'POST' || this._method === 'PATCH') && Array.isArray(data)) {
        if (!Array.isArray(this._body) && data.length === 1) data = data[0];
      }

      return { data, error: null, count };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }
}

// ────────────────────────────────────────────
// Storage Client
// ────────────────────────────────────────────
class StorageBucket {
  constructor(bucket) {
    this._bucket = bucket;
  }

  async upload(filePath, file, options = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers = {};
      if (_session?.access_token) headers['Authorization'] = `Bearer ${_session.access_token}`;
      if (options.upsert) headers['x-upsert'] = 'true';

      const response = await fetch(`${API_BASE}/storage/v1/object/${this._bucket}/${filePath}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { data: null, error: { message: err.error || 'Upload failed' } };
      }

      const data = await response.json();
      return { data: { path: filePath, ...data }, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  async remove(paths) {
    try {
      for (const p of paths) {
        await fetch(`${API_BASE}/storage/v1/object/${this._bucket}/${p}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
      }
      return { data: paths, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  getPublicUrl(filePath) {
    const publicUrl = import.meta.env.VITE_STORAGE_PUBLIC_URL || `${API_BASE}/storage/v1/object/public`;
    return {
      data: { publicUrl: `${publicUrl}/${this._bucket}/${filePath}` },
    };
  }
}

// ────────────────────────────────────────────
// Auth Client
// ────────────────────────────────────────────
const auth = {
  async getSession() {
    return { data: { session: _session }, error: null };
  },

  async getUser() {
    return { data: { user: _user }, error: null };
  },

  async signUp({ email, password }) {
    try {
      const res = await fetch(`${API_BASE}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: { message: data.error } };
      saveSession(data);
      return { data: { user: data.user, session: _session }, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  },

  async signInWithPassword({ email, password }) {
    try {
      const res = await fetch(`${API_BASE}/auth/v1/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: { message: data.error } };
      saveSession(data);
      return { data: { user: data.user, session: _session }, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  },

  async signOut() {
    clearSession();
    return { error: null };
  },

  onAuthStateChange(callback) {
    _authListeners.add(callback);
    if (_session) callback('SIGNED_IN', _session);
    return {
      data: {
        subscription: {
          unsubscribe() { _authListeners.delete(callback); },
        },
      },
    };
  },
};

// ────────────────────────────────────────────
// Functions Client
// ────────────────────────────────────────────
const functions = {
  async invoke(name, options = {}) {
    try {
      const res = await fetch(`${API_BASE}/functions/v1/${name}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(options.body || {}),
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: { message: data.error || res.statusText } };
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  },
};

// ────────────────────────────────────────────
// Realtime (polling-based fallback)
// ────────────────────────────────────────────
class RealtimeChannel {
  constructor(name) {
    this._name = name;
    this._handlers = [];
    this._interval = null;
    this._table = null;
    this._lastCheck = new Date().toISOString();
  }

  on(event, config, callback) {
    if (event === 'postgres_changes') {
      this._table = config.table;
      this._handlers.push({ event: config.event, callback });
    }
    return this;
  }

  subscribe(statusCallback) {
    if (this._table) {
      this._interval = setInterval(async () => {
        try {
          const res = await fetch(
            `${API_BASE}/rest/v1/realtime/changes?table=${this._table}&since=${this._lastCheck}`,
            { headers: getAuthHeaders() }
          );
          const rows = await res.json();
          this._lastCheck = new Date().toISOString();
          if (rows.length > 0) {
            for (const handler of this._handlers) {
              for (const row of rows) {
                handler.callback({ new: row, old: null, eventType: handler.event });
              }
            }
          }
        } catch { /* ignore */ }
      }, 5000);
    }
    if (statusCallback) statusCallback('SUBSCRIBED');
    return this;
  }

  unsubscribe() {
    if (this._interval) clearInterval(this._interval);
  }
}

// ────────────────────────────────────────────
// Main Client
// ────────────────────────────────────────────
const customSupabaseClient = {
  from(table) {
    return new QueryBuilder(table);
  },

  storage: {
    from(bucket) {
      return new StorageBucket(bucket);
    },
  },

  auth,
  functions,

  async rpc(fn, params = {}) {
    try {
      const res = await fetch(`${API_BASE}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: { message: data.message || res.statusText } };
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  },

  channel(name) {
    return new RealtimeChannel(name);
  },

  removeChannel(channel) {
    if (channel) channel.unsubscribe();
  },
};

export default customSupabaseClient;

export {
  customSupabaseClient,
  customSupabaseClient as supabase,
};
