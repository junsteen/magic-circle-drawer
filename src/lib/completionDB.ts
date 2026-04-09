import type { MagicCirclePattern } from '@/lib/patterns';
import { createPresetPattern } from '@/lib/patterns';

const DB_NAME = 'ArcaneTracerCompletion';
const DB_VERSION = 1;
const STORE_NAME = 'completion';

interface CompletionRecord {
  patternName: string;
  bestScore: number;
  bestRank: string;
  completedAt: number; // timestamp when first completed (S rank achieved)
  completionCount: number; // number of times S rank achieved
  lastAttempted: number; // timestamp of last attempt
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'patternName' });
        store.createIndex('bestScore', 'bestScore', { unique: false });
        store.createIndex('completedAt', 'completedAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** パターンの完了状況を取得 */
export async function getCompletion(patternName: string): Promise<CompletionRecord | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(patternName);
    request.onsuccess = () => resolve(request.result as CompletionRecord | undefined);
    request.onerror = () => reject(request.error);
  });
}

/** 全パターンの完了状況を取得 */
export async function getAllCompletions(): Promise<CompletionRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as CompletionRecord[]);
    request.onerror = () => reject(request.error);
  });
}

/** パターンの完了状況を更新または追加 */
export async function updateCompletion(
  patternName: string,
  score: number,
  rank: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // 既存の記録を取得
    const getRequest = store.get(patternName);
    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      const now = Date.now();
      
      let completionRecord: CompletionRecord;
      if (existing) {
        // 既存記録を更新
        completionRecord = {
          patternName,
          bestScore: Math.max(existing.bestScore, score),
          bestRank: getBetterRank(existing.bestRank, rank),
          completedAt: existing.completedAt, // 元の完了日時を保持
          completionCount: existing.completionCount + (rank === 'S' ? 1 : 0),
          lastAttempted: now
        };
        
        // Sランク初めて達成したら完了日時を設定
        if (rank === 'S' && existing.bestScore < 90) {
          completionRecord.completedAt = now;
        }
      } else {
        // 新規記録を作成
        completionRecord = {
          patternName,
          bestScore: score,
          bestRank: rank,
          completedAt: rank === 'S' ? now : 0,
          completionCount: rank === 'S' ? 1 : 0,
          lastAttempted: now
        };
      }
      
      const updateRequest = store.put(completionRecord);
      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => reject(updateRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
    
    tx.oncomplete = () => {};
  });
}

/** パターンがSランクで完了済みかどうかをチェック */
export async function isPatternCompleted(patternName: string): Promise<boolean> {
  const completion = await getCompletion(patternName);
  return !!completion && completion.bestScore >= 90; // Sランク以上
}

/** 完了済みパターンの数を取得 */
export async function getCompletedCount(): Promise<number> {
  const completions = await getAllCompletions();
  return completions.filter(c => c.bestScore >= 90).length;
}

/** 全パターン数を取得 */
export async function getTotalPatternsCount(): Promise<number> {
  // 実際のパターン数を取得
  try {
    // 注意: ここでCanvasサイズが必要だが、DBレイヤーではわからないため
    // デフォルトサイズを使用。実際の使用ではuseMagicCircleから渡してもらう方が良い
    const patterns = createPresetPattern(350); // デフォルトCanvasサイズ
    return patterns.length;
  } catch (e) {
    console.error('Failed to get total patterns count:', e);
    return 9; // フォールバック値
  }
}

/** ベターなランクを返す（S > A > B > C） */
function getBetterRank(rank1: string, rank2: string): string {
  const rankValues: Record<string, number> = {
    'S': 4,
    'A': 3,
    'B': 2,
    'C': 1
  };
  
  const val1 = rankValues[rank1] || 0;
  const val2 = rankValues[rank2] || 0;
  
  return val1 >= val2 ? rank1 : rank2;
}