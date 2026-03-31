export const safeStorage = {
  getItem(key) {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage?.setItem(key, value);
    } catch {
      return;
    }
  },
  removeItem(key) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage?.removeItem(key);
    } catch {
      return;
    }
  },
};
