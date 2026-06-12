import type { Difficulty } from './patterns';

export const MULTI_MODE_INITIAL_TIME: Record<Difficulty, number> = {
  easy: 90,
  normal: 60,
  hard: 45,
  expert: 30,
};

export const MULTI_MODE_BONUS_TIME = 5;
export const MULTI_MODE_RESULT_DISPLAY_MS = 1800;

/** 連続 A 以上の枚数に基づくコンボ倍率（上限 3.0x） */
export function getComboMultiplier(consecutiveAPlus: number): number {
  if (consecutiveAPlus <= 0) return 1.0;
  return Math.min(1.0 + consecutiveAPlus * 0.5, 3.0);
}

export function calcOverallRank(avgScore: number): string {
  if (avgScore >= 90) return 'S';
  if (avgScore >= 70) return 'A';
  if (avgScore >= 50) return 'B';
  return 'C';
}
