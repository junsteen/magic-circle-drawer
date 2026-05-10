import { getAllHistories } from '@/lib/historyDB';
import { getAllCompletions } from '@/lib/completionDB';
import {
  ACHIEVEMENTS,
  evaluateAchievements,
} from '@/lib/achievements';

/** データベース名 */
const DB_NAME = 'ArcaneTracerAchievement';
/** データベースバージョン */
const DB_VERSION = 1;
/** オブジェクトストア名 */
const STORE_NAME = 'achievement';

/**
 * アチーブメント解除レコード
 */
export interface AchievementUnlock {
  /** アチーブメントID */
  id: string;
  /** 解除した日時（タイムスタンプ） */
  unlockedAt: number;
}

/**
 * IndexedDB接続を開く
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 指定アチーブメントを解除済みとして記録（既に解除済みなら何もしない）
 */
export async function unlockAchievement(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        resolve();
        return;
      }
      const putReq = store.put({ id, unlockedAt: Date.now() } as AchievementUnlock);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * 全解除レコードを取得
 */
export async function getUnlockedAchievements(): Promise<AchievementUnlock[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () =>
      resolve(request.result as AchievementUnlock[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 解除済みアチーブメントのID集合を取得
 */
export async function getUnlockedAchievementIds(): Promise<Set<string>> {
  const list = await getUnlockedAchievements();
  return new Set(list.map((u) => u.id));
}

/**
 * 指定IDが解除済みか
 */
export async function isAchievementUnlocked(id: string): Promise<boolean> {
  const ids = await getUnlockedAchievementIds();
  return ids.has(id);
}

/**
 * 履歴・完了データから条件を再評価し、新たに解除されたものを保存する。
 * 結果として新規解除されたアチーブメントID配列を返す。
 */
export async function checkAndUnlockAchievements(): Promise<string[]> {
  const [histories, completions, unlockedIds] = await Promise.all([
    getAllHistories(),
    getAllCompletions(),
    getUnlockedAchievementIds(),
  ]);
  const achieved = new Set(evaluateAchievements({ histories, completions }));
  const newlyUnlocked: string[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (!achieved.has(ach.id)) continue;
    if (unlockedIds.has(ach.id)) continue;
    await unlockAchievement(ach.id);
    newlyUnlocked.push(ach.id);
  }
  return newlyUnlocked;
}
