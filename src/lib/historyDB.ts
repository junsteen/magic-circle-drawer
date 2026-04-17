import type { MagicCircleHistory } from '@/lib/types';

/** データベース名 */
const DB_NAME = 'ArcaneTracerHistory';
/** データベースバージョン */
const DB_VERSION = 1;
/** オブジェクトストア名 */
const STORE_NAME = 'history';

/**
 * IndexedDB接続を開く
 * @returns IndexedDBデータベース接続のPromise
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** 履歴をすべて取得 (新しい順) */
/**
 * すべての履歴データを作成日時の降順（新しい順）で取得
 * @returns 履歴データの配列（新しい順にソート済み）
 */
export async function getAllHistories(): Promise<MagicCircleHistory[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('createdAt');
    const request = index.openCursor(undefined, 'prev');
    const results: MagicCircleHistory[] = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        results.push(cursor.value as MagicCircleHistory);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/** 履歴を1件追加 */
/**
 * 新しい履歴データをデータベースに追加
 * @param history 追加する履歴データ
 * @returns 追加が完了したことを示すPromise
 */
export async function addHistory(history: MagicCircleHistory): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(history);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {};
  });
}

/** 履歴を1件削除 */
/**
 * 指定されたIDの履歴データをデータベースから削除
 * @param id 削除する履歴のID
 * @returns 削除が完了したことを示すPromise
 */
export async function deleteHistory(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** 履歴を1件取得 */
/**
 * 指定されたIDの履歴データをデータベースから取得
 * @param id 取得する履歴のID
 * @returns 履歴データ（存在しない場合はundefined）
 */
export async function getHistoryById(id: string): Promise<MagicCircleHistory | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as MagicCircleHistory | undefined);
    request.onerror = () => reject(request.error);
  });
}
