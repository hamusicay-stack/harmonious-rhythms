// Tiny IndexedDB-backed cache for shorts video payloads.
// No service worker (Lovable PWA constraints). Strategy:
//
//   1. On first play, the browser streams the raw URL normally.
//   2. After ~3s of active playback, we asynchronously fetch the full asset
//      as a Blob and persist it to IDB keyed by URL.
//   3. On future sessions, the hook returns a `blob:` URL synchronously
//      from cache for instant playback, improving Initial Play Rate.
//
// Cap: 12 most-recent videos, ~25 MiB per item (best-effort).

const DB_NAME = "shorts-cache";
const STORE = "videos";
const DB_VERSION = 1;
const MAX_ENTRIES = 12;
const MAX_BYTES_PER_ITEM = 25 * 1024 * 1024;

type Entry = { url: string; blob: Blob; size: number; savedAt: number };

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("no-idb"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: "url" });
        s.createIndex("savedAt", "savedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function getCachedBlob(url: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise<Blob | null>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(url);
      req.onsuccess = () => resolve((req.result as Entry | undefined)?.blob ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function evictIfNeeded(db: IDBDatabase) {
  return new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const countReq = store.count();
    countReq.onsuccess = () => {
      const over = countReq.result - MAX_ENTRIES;
      if (over <= 0) { resolve(); return; }
      const idx = store.index("savedAt");
      let removed = 0;
      idx.openCursor().onsuccess = (e) => {
        const cur = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cur && removed < over) {
          cur.delete();
          removed++;
          cur.continue();
        } else {
          resolve();
        }
      };
    };
    countReq.onerror = () => resolve();
  });
}

export async function cacheVideo(url: string): Promise<void> {
  if (!url || url.startsWith("blob:")) return;
  try {
    const existing = await getCachedBlob(url);
    if (existing) return;
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) return;
    const blob = await res.blob();
    if (blob.size > MAX_BYTES_PER_ITEM) return;
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({
        url, blob, size: blob.size, savedAt: Date.now(),
      } satisfies Entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
    await evictIfNeeded(db);
  } catch {
    /* best-effort */
  }
}
