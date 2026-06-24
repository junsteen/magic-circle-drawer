import type { MagicCirclePattern } from '@/lib/patterns';
import type { AkashicPatternData } from '@/lib/akashicTypes';

const DB_NAME = 'ArcaneTracerCustomPatterns';
const DB_VERSION = 1;
const STORE_NAME = 'patterns';

export interface LocalCustomPattern {
  id: string;
  name: string;
  data: AkashicPatternData;
  thumbnail?: string;
  downloadedAt: number;
}

export function toMagicCirclePattern(p: LocalCustomPattern): MagicCirclePattern {
  return {
    name: p.name,
    vertices: p.data.vertices,
    edges: p.data.edges,
    circles: p.data.circles,
    vertexCount: p.data.vertices.length,
    edgeCount: p.data.edges.length,
    circleCount: p.data.circles.length,
  };
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('downloadedAt', 'downloadedAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCustomPattern(pattern: LocalCustomPattern): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(pattern);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllCustomPatterns(): Promise<LocalCustomPattern[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).index('downloadedAt').getAll();
    request.onsuccess = () => resolve((request.result as LocalCustomPattern[]).reverse());
    request.onerror = () => reject(request.error);
  });
}

export async function getCustomPattern(id: string): Promise<LocalCustomPattern | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as LocalCustomPattern | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCustomPattern(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function isDownloaded(id: string): Promise<boolean> {
  const pattern = await getCustomPattern(id);
  return pattern !== undefined;
}
