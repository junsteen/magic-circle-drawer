/**
 * ユーザー設定の保存・読み込みユーティリティ
 * localStorage を使用してセッションをまたいで設定を保持する
 */

const SETTINGS_KEY = 'arcane_tracer_settings';

export interface UserSettings {
  /** デフォルト難易度 */
  defaultDifficulty: 'easy' | 'normal' | 'hard' | 'expert';
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultDifficulty: 'normal',
};

export function loadSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(patch: Partial<UserSettings>): void {
  try {
    const current = loadSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {
    // localStorage 非対応環境では無視
  }
}

export function resetTutorial(): void {
  try {
    localStorage.removeItem('tutorialCompleted');
  } catch {
    // localStorage 非対応環境では無視
  }
}

export function isTutorialCompleted(): boolean {
  try {
    return !!localStorage.getItem('tutorialCompleted');
  } catch {
    return false;
  }
}
