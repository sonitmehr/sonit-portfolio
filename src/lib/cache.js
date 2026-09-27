/**
 * Lightweight localStorage cache utility with TTL (time-to-live) support.
 *
 * Usage:
 *   cache.set('my-key', data, 60 * 60 * 1000); // 1 hour TTL
 *   const data = cache.get('my-key');           // null if expired or missing
 *   cache.clear('my-key');                      // remove a specific key
 *   cache.clearByPrefix('topic-');              // remove all keys with prefix
 */

const PREFIX = "sonit_cache_";

/**
 * Write a value to localStorage with an expiry timestamp.
 * @param {string} key
 * @param {*} value  — must be JSON-serialisable
 * @param {number} ttlMs — time-to-live in milliseconds (default 1 hour)
 */
export function set(key, value, ttlMs = 60 * 60 * 1000) {
  try {
    const payload = {
      value,
      expiresAt: Date.now() + ttlMs,
    };
    localStorage.setItem(PREFIX + key, JSON.stringify(payload));
  } catch (e) {
    // Storage quota exceeded or private-browsing — silently skip
    console.warn("[cache] set failed:", key, e);
  }
}

/**
 * Read a cached value. Returns null if the key doesn't exist or has expired.
 * @param {string} key
 * @returns {*|null}
 */
export function get(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;

    const payload = JSON.parse(raw);
    if (Date.now() > payload.expiresAt) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return payload.value;
  } catch (e) {
    console.warn("[cache] get failed:", key, e);
    return null;
  }
}

/**
 * Remove a single cached entry.
 * @param {string} key
 */
export function clear(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch (_) {}
}

/**
 * Remove all cached entries whose key starts with the given prefix.
 * @param {string} keyPrefix
 */
export function clearByPrefix(keyPrefix) {
  try {
    const fullPrefix = PREFIX + keyPrefix;
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(fullPrefix)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch (_) {}
}

/**
 * Remove ALL entries created by this cache utility.
 */
export function clearAll() {
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch (_) {}
}

export default { set, get, clear, clearByPrefix, clearAll };
