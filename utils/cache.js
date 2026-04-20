const _cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCache(key) {
  const item = _cache.get(key);
  if (!item) return null;
  if (Date.now() - item.ts > CACHE_TTL) { _cache.delete(key); return null; }
  return item.data;
}

function setCache(key, data) {
  _cache.set(key, { data, ts: Date.now() });
}

function invalidateCache(...keys) {
  keys.forEach((k) => _cache.delete(k));
}

module.exports = { getCache, setCache, invalidateCache };
