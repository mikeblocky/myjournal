// frontend/src/lib/http.js
const API_BASE = import.meta.env.VITE_API_URL || "/api";

// Cache for GET requests
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Request deduplication
const pendingRequests = new Map();

// Cache key generator
function getCacheKey(path, token) {
  return `${path}:${token || 'no-token'}`;
}

// Cache cleanup
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

// Clean cache every minute
setInterval(cleanupCache, 60 * 1000);

export async function http(path, { method="GET", token, body, cache: useCache = true, dedupe = true } = {}) {
  const cacheKey = getCacheKey(path, token);
  
  // For GET requests, check cache first
  if (method === "GET" && useCache) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // Emit cache hit event
      window.dispatchEvent(new CustomEvent('cache-hit'));
      return cached.data;
    }
    // Emit cache miss event
    window.dispatchEvent(new CustomEvent('cache-miss'));
  }
  
  // Request deduplication for identical requests
  if (dedupe && method === "GET") {
    const pendingKey = `${method}:${cacheKey}`;
    if (pendingRequests.has(pendingKey)) {
      return pendingRequests.get(pendingKey);
    }
  }
  
  // Create the request
  const request = fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (res) => {
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();
    
    // Cache successful GET responses
    if (method === "GET" && useCache) {
      cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
    }
    
    return data;
  });
  
  // Store pending request for deduplication
  if (dedupe && method === "GET") {
    const pendingKey = `${method}:${cacheKey}`;
    pendingRequests.set(pendingKey, request);
    
    // Clean up when request completes
    request.finally(() => {
      pendingRequests.delete(pendingKey);
    });
  }
  
  return request;
}

// Cache management utilities
export const httpCache = {
  clear: () => cache.clear(),
  delete: (path, token) => cache.delete(getCacheKey(path, token)),
  size: () => cache.size,
  keys: () => Array.from(cache.keys())
};
