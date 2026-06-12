import type { Difficulty } from './patterns';

export const MULTI_MODE_INITIAL_TIME: Record<Difficulty, number> = {
  easy: 90,
  normal: 60,
  hard: 45,
  expert: 30,
};

/** 1枚クリアごとの追加秒数（初期時間を上限とする） */
export const MULTI_MODE_BONUS_TIME = 5;

/** スコア表示後、次の魔法陣へ自動遷移するまでの時間 (ms) */
export const MULTI_MODE_RESULT_DISPLAY_MS = 1800;

export function calcOverallRank(avgScore: number): string {
  if (avgScore >= 90) return 'S';
  if (avgScore >= 70) return 'A';
  if (avgScore >= 50) return 'B';
  return 'C';
}
