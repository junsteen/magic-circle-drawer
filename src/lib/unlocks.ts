const MULTI_QUALIFY_KEY = 'arcane_multi_qualify_count';
const COMBO_UNLOCKED_KEY = 'arcane_combo_unlocked';
const UNLOCK_THRESHOLD = 3;

export function isComboModeUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(COMBO_UNLOCKED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function getQualifyCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    return parseInt(localStorage.getItem(MULTI_QUALIFY_KEY) ?? '0', 10);
  } catch {
    return 0;
  }
}

/** セッション終了時にアンロック判定を行う。新規解放時は newlyUnlocked = true を返す */
export function tryUnlock(
  timeLeftOnEnd: number,
  overallRank: string,
): { qualified: boolean; newlyUnlocked: boolean; count: number } {
  if (typeof window === 'undefined') return { qualified: false, newlyUnlocked: false, count: 0 };

  const qualified = timeLeftOnEnd >= 1 && (overallRank === 'S' || overallRank === 'A');
  if (!qualified) return { qualified: false, newlyUnlocked: false, count: getQualifyCount() };

  const alreadyUnlocked = isComboModeUnlocked();
  const currentCount = getQualifyCount();
  const newCount = currentCount + 1;

  try {
    localStorage.setItem(MULTI_QUALIFY_KEY, String(newCount));
  } catch { /* ignore */ }

  if (!alreadyUnlocked && newCount >= UNLOCK_THRESHOLD) {
    try {
      localStorage.setItem(COMBO_UNLOCKED_KEY, 'true');
    } catch { /* ignore */ }
    return { qualified: true, newlyUnlocked: true, count: newCount };
  }

  return { qualified: true, newlyUnlocked: false, count: newCount };
}
