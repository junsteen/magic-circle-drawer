const HISTORY_UNLOCKED_KEY = 'arcane_history_unlocked';
const MULTI_MODE_UNLOCKED_KEY = 'arcane_multi_mode_unlocked';
const GRIMOIRE_UNLOCKED_KEY = 'arcane_grimoire_unlocked';
const MULTI_QUALIFY_KEY = 'arcane_multi_qualify_count';
const COMBO_UNLOCKED_KEY = 'arcane_combo_unlocked';
const UNLOCK_THRESHOLD = 3;

// アンロック条件（総プレイ数）
const HISTORY_THRESHOLD = 1;
const MULTI_MODE_THRESHOLD = 5;
const GRIMOIRE_THRESHOLD = 10;

export interface UnlockInfo {
  key: string;
  icon: string;
  title: string;
  description: string;
}

const UNLOCK_INFO: Record<string, UnlockInfo> = {
  history: {
    key: 'history',
    icon: '📜',
    title: '作成履歴 解放！',
    description: 'これまでに詠唱した魔法陣の履歴を確認できます。メニューから開けます。',
  },
  multiMode: {
    key: 'multiMode',
    icon: '⚡',
    title: 'マルチモード 解放！',
    description: '時間制限内に何枚もの魔法陣を連続詠唱するモードが解放されました。メニューから選択できます。',
  },
  grimoire: {
    key: 'grimoire',
    icon: '📖',
    title: 'アカシックレコード 解放！',
    description: '全ての魔法陣パターンを閲覧できるアカシックレコードが解放されました。メニューから開けます。',
  },
  comboMode: {
    key: 'comboMode',
    icon: '🔥',
    title: 'コンボモード 解放！',
    description: '制限時間より早く、高精度でクリアを3回達成！コンボ倍率ありのモードが解放されました。',
  },
};

function get(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem(key) === 'true'; } catch { return false; }
}

function set(key: string): void {
  try { localStorage.setItem(key, 'true'); } catch { /* ignore */ }
}

export function isHistoryUnlocked(): boolean { return get(HISTORY_UNLOCKED_KEY); }
export function isMultiModeUnlocked(): boolean { return get(MULTI_MODE_UNLOCKED_KEY); }
export function isGrimoireUnlocked(): boolean { return get(GRIMOIRE_UNLOCKED_KEY); }
export function isComboModeUnlocked(): boolean { return get(COMBO_UNLOCKED_KEY); }

export function getQualifyCount(): number {
  if (typeof window === 'undefined') return 0;
  try { return parseInt(localStorage.getItem(MULTI_QUALIFY_KEY) ?? '0', 10); } catch { return 0; }
}

/** 現在のアンロック状態を全て返す */
export function getAllUnlockStatus() {
  return {
    history: isHistoryUnlocked(),
    multiMode: isMultiModeUnlocked(),
    grimoire: isGrimoireUnlocked(),
    comboMode: isComboModeUnlocked(),
  };
}

/** プレイ回数に基づくアンロックチェック。新規解放されたものを返す */
export function checkPlayBasedUnlocks(totalPlays: number): UnlockInfo[] {
  if (typeof window === 'undefined') return [];
  const results: UnlockInfo[] = [];

  if (totalPlays >= HISTORY_THRESHOLD && !isHistoryUnlocked()) {
    set(HISTORY_UNLOCKED_KEY);
    results.push(UNLOCK_INFO.history);
  }
  if (totalPlays >= MULTI_MODE_THRESHOLD && !isMultiModeUnlocked()) {
    set(MULTI_MODE_UNLOCKED_KEY);
    results.push(UNLOCK_INFO.multiMode);
  }
  if (totalPlays >= GRIMOIRE_THRESHOLD && !isGrimoireUnlocked()) {
    set(GRIMOIRE_UNLOCKED_KEY);
    results.push(UNLOCK_INFO.grimoire);
  }

  return results;
}

/** マルチモードセッション終了時のコンボモードアンロック判定 */
export function tryUnlock(
  timeLeftOnEnd: number,
  overallRank: string,
): { qualified: boolean; newlyUnlocked: boolean; count: number; info: UnlockInfo | null } {
  if (typeof window === 'undefined') {
    return { qualified: false, newlyUnlocked: false, count: 0, info: null };
  }

  const qualified = timeLeftOnEnd >= 1 && (overallRank === 'S' || overallRank === 'A');
  if (!qualified) {
    return { qualified: false, newlyUnlocked: false, count: getQualifyCount(), info: null };
  }

  const alreadyUnlocked = isComboModeUnlocked();
  const currentCount = getQualifyCount();
  const newCount = currentCount + 1;

  try { localStorage.setItem(MULTI_QUALIFY_KEY, String(newCount)); } catch { /* ignore */ }

  if (!alreadyUnlocked && newCount >= UNLOCK_THRESHOLD) {
    set(COMBO_UNLOCKED_KEY);
    return { qualified: true, newlyUnlocked: true, count: newCount, info: UNLOCK_INFO.comboMode };
  }

  return { qualified: true, newlyUnlocked: false, count: newCount, info: null };
}
