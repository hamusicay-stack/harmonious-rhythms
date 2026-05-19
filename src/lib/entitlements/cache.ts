/**
 * Phase 6 — Distributed cache layer for the entitlement control plane.
 *
 * Goals:
 *  - Never hit Supabase on every entitlement check.
 *  - Stale-while-revalidate: always serve cached value if present, refresh
 *    in the background.
 *  - Request coalescing: collapse concurrent fetches into a single promise.
 *  - Fail-safe: if Supabase is slow/down, return last-known-good config or
 *    a safe "dual" default. Never throw.
 *
 * This module is intentionally schema-agnostic — it just caches whatever the
 * fetcher returns. The control plane module wires its own loader through it.
 */

export type CacheEntry<T> = {
  value: T;
  storedAt: number;
};

type Loader<T> = () => Promise<T>;

const DEFAULT_TTL = 8_000;
const SAFETY_TTL = 30_000;

let safetyMode = false;
export function setCacheSafetyMode(on: boolean) { safetyMode = on; }
export function isCacheSafetyMode() { return safetyMode; }

// Tiny LRU (one-key in practice for the control plane, but generic).
class LRU<K, V> {
  private max: number;
  private map = new Map<K, V>();
  constructor(max = 16) { this.max = max; }
  get(k: K): V | undefined {
    const v = this.map.get(k);
    if (v === undefined) return undefined;
    this.map.delete(k); this.map.set(k, v);
    return v;
  }
  set(k: K, v: V) {
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, v);
    if (this.map.size > this.max) {
      const first = this.map.keys().next().value;
      if (first !== undefined) this.map.delete(first);
    }
  }
  has(k: K) { return this.map.has(k); }
  size() { return this.map.size; }
}

const store = new LRU<string, CacheEntry<unknown>>(16);
const inflight = new Map<string, Promise<unknown>>();
const lastGood = new Map<string, unknown>();

// Observability counters.
const counters = {
  hits: 0,
  misses: 0,
  staleServed: 0,
  refreshes: 0,
  loaderErrors: 0,
  fallbacks: 0,
  totalLatencyMs: 0,
  latencySamples: 0,
};

export function getCacheMetrics() {
  const total = counters.hits + counters.misses;
  return {
    hits: counters.hits,
    misses: counters.misses,
    hitRate: total > 0 ? counters.hits / total : 0,
    staleServed: counters.staleServed,
    refreshes: counters.refreshes,
    loaderErrors: counters.loaderErrors,
    fallbacks: counters.fallbacks,
    avgLatencyMs:
      counters.latencySamples > 0
        ? counters.totalLatencyMs / counters.latencySamples
        : 0,
    latencySamples: counters.latencySamples,
    size: store.size(),
    safetyMode,
  };
}

export function getCachedValue<T>(key: string): T | undefined {
  const e = store.get(key) as CacheEntry<T> | undefined;
  return e?.value;
}

export function getLastGood<T>(key: string, fallback: T): T {
  const v = lastGood.get(key);
  return (v as T) ?? fallback;
}

export function setLastGood<T>(key: string, value: T) {
  lastGood.set(key, value);
}

/**
 * Stale-while-revalidate fetch with request coalescing and fail-safe
 * fallback. Always resolves — never throws.
 */
export async function swrFetch<T>(
  key: string,
  loader: Loader<T>,
  opts: { ttlMs?: number; fallback: T; force?: boolean } = { fallback: undefined as unknown as T },
): Promise<T> {
  const ttl = safetyMode ? SAFETY_TTL : (opts.ttlMs ?? DEFAULT_TTL);
  const cached = store.get(key) as CacheEntry<T> | undefined;
  const fresh = cached && Date.now() - cached.storedAt < ttl;

  if (cached) counters.hits += 1; else counters.misses += 1;

  // Serve cached immediately if present; refresh in background when stale.
  if (cached) {
    if (!fresh && !opts.force) {
      counters.staleServed += 1;
      void refresh(key, loader, opts.fallback);
    }
    return cached.value;
  }

  if (opts.force === true || !cached) {
    return refresh(key, loader, opts.fallback);
  }

  return getLastGood(key, opts.fallback);
}

async function refresh<T>(key: string, loader: Loader<T>, fallback: T): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  counters.refreshes += 1;
  const started = Date.now();
  const p = (async () => {
    try {
      const v = await loader();
      const latency = Date.now() - started;
      counters.totalLatencyMs += latency;
      counters.latencySamples += 1;
      store.set(key, { value: v, storedAt: Date.now() });
      lastGood.set(key, v);
      return v;
    } catch {
      counters.loaderErrors += 1;
      counters.fallbacks += 1;
      const lg = lastGood.get(key);
      const v = (lg as T) ?? fallback;
      // Park the fallback in the cache too so subsequent reads stay cheap.
      store.set(key, { value: v, storedAt: Date.now() });
      return v;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

export function clearEntitlementCache() {
  // Surgical wipe used by tests / admin tools; never auto-called.
  (store as unknown as { map: Map<string, unknown> }).map.clear?.();
  inflight.clear();
}
