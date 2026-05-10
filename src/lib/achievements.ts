import type { MagicCircleHistory } from '@/lib/types';
import type { CompletionRecord } from '@/lib/completionDB';

/**
 * アチーブメント判定に必要なプレイヤーデータのスナップショット
 */
export interface AchievementCheckData {
  /** プレイ履歴（新しい順） */
  histories: MagicCircleHistory[];
  /** パターン別の完了記録 */
  completions: CompletionRecord[];
}

/**
 * アチーブメント定義
 */
export interface Achievement {
  /** 内部識別子（IndexedDBキー） */
  id: string;
  /** 表示名 */
  name: string;
  /** 達成条件の説明文 */
  description: string;
  /** アイコン（幾何記号 or 絵文字） */
  icon: string;
  /** 達成判定関数 */
  check: (data: AchievementCheckData) => boolean;
}

/** Sランク達成数のしきい値 */
const SRANK_TRIPLE = 3;
const SRANK_ALL = 9;
const PLAY_COUNT_PERSISTENT = 100;
const HISTORY_COUNT_COLLECTOR = 20;
const STREAK_LENGTH = 5;
const PERFECT_SCORE = 100;

/**
 * アチーブメント一覧（10種）
 * `check` は与えられたデータが達成条件を満たすかを判定する純粋関数。
 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_step',
    name: '最初の一筆',
    description: '魔法陣を初めて完成させた',
    icon: '◯',
    check: ({ histories }) => histories.length >= 1,
  },
  {
    id: 'first_s',
    name: '神の筆致',
    description: '初めてSランクを取得',
    icon: '✦',
    check: ({ histories }) => histories.some((h) => h.rank === 'S'),
  },
  {
    id: 'three_master',
    name: '三冠魔導士',
    description: '3つのパターンでSランクを達成',
    icon: '△',
    check: ({ completions }) =>
      completions.filter((c) => c.bestRank === 'S').length >= SRANK_TRIPLE,
  },
  {
    id: 'all_master',
    name: '全パターン制覇',
    description: '9パターン全てでSランクを達成',
    icon: '✧',
    check: ({ completions }) =>
      completions.filter((c) => c.bestRank === 'S').length >= SRANK_ALL,
  },
  {
    id: 'persistent',
    name: '魔導の探求者',
    description: '累計100回プレイ',
    icon: '◐',
    check: ({ histories }) => histories.length >= PLAY_COUNT_PERSISTENT,
  },
  {
    id: 'hard_breaker',
    name: '困難への挑戦',
    description: 'HARD難易度をクリア',
    icon: '◇',
    check: ({ histories }) =>
      histories.some((h) => h.difficulty === 'HARD'),
  },
  {
    id: 'expert_master',
    name: '極致の魔導士',
    description: 'EXPERT難易度をクリア',
    icon: '◆',
    check: ({ histories }) =>
      histories.some((h) => h.difficulty === 'EXPERT'),
  },
  {
    id: 'perfect_score',
    name: '完璧なる詠唱',
    description: '100点を取得',
    icon: '★',
    check: ({ histories }) =>
      histories.some((h) => h.score >= PERFECT_SCORE),
  },
  {
    id: 'collector',
    name: '記録の蒐集者',
    description: '履歴を20件以上保存',
    icon: '▤',
    check: ({ histories }) => histories.length >= HISTORY_COUNT_COLLECTOR,
  },
  {
    id: 'streak_5',
    name: '連続達成',
    description: '直近5回連続でAランク以上',
    icon: '▶',
    check: ({ histories }) => {
      if (histories.length < STREAK_LENGTH) return false;
      // historyDB は新しい順で返るため先頭から STREAK_LENGTH 件を見る
      return histories
        .slice(0, STREAK_LENGTH)
        .every((h) => h.rank === 'S' || h.rank === 'A');
    },
  },
];

/**
 * IDから定義を取得
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * 与えられたデータで達成済みのアチーブメントID一覧を返す（純粋関数）
 */
export function evaluateAchievements(
  data: AchievementCheckData,
): string[] {
  return ACHIEVEMENTS.filter((a) => a.check(data)).map((a) => a.id);
}
