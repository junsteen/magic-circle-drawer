import type { MagicCircleHistory } from '@/lib/types';
import type { CompletionRecord } from '@/lib/completionDB';

export interface ChallengeCheckData {
  histories: MagicCircleHistory[];
  completions: CompletionRecord[];
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  getProgress: (data: ChallengeCheckData) => number;
}

export const CHALLENGES: Challenge[] = [
  {
    id: 'play_1',
    title: '初めての試み',
    description: '1回プレイする',
    target: 1,
    getProgress: ({ histories }) => Math.min(histories.length, 1),
  },
  {
    id: 'play_10',
    title: '基礎の習得',
    description: '10回プレイする',
    target: 10,
    getProgress: ({ histories }) => Math.min(histories.length, 10),
  },
  {
    id: 'play_50',
    title: '精進の道',
    description: '50回プレイする',
    target: 50,
    getProgress: ({ histories }) => Math.min(histories.length, 50),
  },
  {
    id: 's_rank_3',
    title: 'Sランクへの挑戦',
    description: 'Sランクを3回取得する',
    target: 3,
    getProgress: ({ histories }) =>
      Math.min(histories.filter((h) => h.rank === 'S').length, 3),
  },
  {
    id: 'all_patterns',
    title: '全パターン挑戦',
    description: '全9種のパターンをプレイする',
    target: 9,
    getProgress: ({ completions }) => Math.min(completions.length, 9),
  },
  {
    id: 'hard_5',
    title: '高難度の試練',
    description: 'HARD以上の難易度を5回クリアする',
    target: 5,
    getProgress: ({ histories }) =>
      Math.min(
        histories.filter(
          (h) => h.difficulty === 'HARD' || h.difficulty === 'EXPERT',
        ).length,
        5,
      ),
  },
  {
    id: 'perfect_3',
    title: '完璧への執着',
    description: '100点を3回取得する',
    target: 3,
    getProgress: ({ histories }) =>
      Math.min(histories.filter((h) => h.score >= 100).length, 3),
  },
  {
    id: 'expert_1',
    title: '極限への挑戦',
    description: 'EXPERT難易度をクリアする',
    target: 1,
    getProgress: ({ histories }) =>
      histories.some((h) => h.difficulty === 'EXPERT') ? 1 : 0,
  },
];
