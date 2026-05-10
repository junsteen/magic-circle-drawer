import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENTS,
  evaluateAchievements,
  getAchievementById,
  type AchievementCheckData,
} from './achievements';
import type { MagicCircleHistory } from './types';
import type { CompletionRecord } from './completionDB';

function makeHistory(
  overrides: Partial<MagicCircleHistory> = {},
): MagicCircleHistory {
  return {
    id: `h_${Math.random().toString(36).slice(2, 9)}`,
    data: {
      pattern: { name: '三角形', vertices: [], edges: [], circles: [] },
      drawLogs: [],
      timestamp: Date.now(),
    },
    score: 80,
    rank: 'B',
    difficulty: 'NORMAL',
    difficultyMultiplier: 1.0,
    damageMultiplier: '1.0',
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeCompletion(
  overrides: Partial<CompletionRecord> = {},
): CompletionRecord {
  return {
    patternName: '三角形',
    bestScore: 80,
    bestRank: 'B',
    completedAt: 0,
    completionCount: 0,
    lastAttempted: Date.now(),
    ...overrides,
  };
}

const empty: AchievementCheckData = { histories: [], completions: [] };

describe('ACHIEVEMENTS - 定義の整合性', () => {
  it('IDがすべてユニーク', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('10件以上定義されている', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(10);
  });

  it('getAchievementById で取得できる', () => {
    const ach = getAchievementById('first_step');
    expect(ach).toBeDefined();
    expect(ach?.name).toBe('最初の一筆');
  });
});

describe('first_step（最初の一筆）', () => {
  const ach = getAchievementById('first_step')!;
  it('履歴ゼロでは未達成', () => {
    expect(ach.check(empty)).toBe(false);
  });
  it('履歴1件で達成', () => {
    expect(ach.check({ histories: [makeHistory()], completions: [] })).toBe(true);
  });
});

describe('first_s（神の筆致）', () => {
  const ach = getAchievementById('first_s')!;
  it('Sランクが無ければ未達成', () => {
    expect(
      ach.check({ histories: [makeHistory({ rank: 'A' })], completions: [] }),
    ).toBe(false);
  });
  it('Sランク履歴があれば達成', () => {
    expect(
      ach.check({
        histories: [makeHistory({ rank: 'B' }), makeHistory({ rank: 'S' })],
        completions: [],
      }),
    ).toBe(true);
  });
});

describe('three_master（三冠魔導士）', () => {
  const ach = getAchievementById('three_master')!;
  it('Sが2件では未達成', () => {
    const completions = [
      makeCompletion({ patternName: '三角形', bestRank: 'S' }),
      makeCompletion({ patternName: '五芒星', bestRank: 'S' }),
    ];
    expect(ach.check({ histories: [], completions })).toBe(false);
  });
  it('Sが3件で達成', () => {
    const completions = [
      makeCompletion({ patternName: '三角形', bestRank: 'S' }),
      makeCompletion({ patternName: '五芒星', bestRank: 'S' }),
      makeCompletion({ patternName: '六芒星', bestRank: 'S' }),
    ];
    expect(ach.check({ histories: [], completions })).toBe(true);
  });
});

describe('all_master（全パターン制覇）', () => {
  const ach = getAchievementById('all_master')!;
  it('8件では未達成', () => {
    const completions = Array.from({ length: 8 }, (_, i) =>
      makeCompletion({ patternName: `pattern${i}`, bestRank: 'S' }),
    );
    expect(ach.check({ histories: [], completions })).toBe(false);
  });
  it('9件で達成', () => {
    const completions = Array.from({ length: 9 }, (_, i) =>
      makeCompletion({ patternName: `pattern${i}`, bestRank: 'S' }),
    );
    expect(ach.check({ histories: [], completions })).toBe(true);
  });
});

describe('hard_breaker / expert_master', () => {
  it('HARD履歴があれば hard_breaker 達成', () => {
    expect(
      getAchievementById('hard_breaker')!.check({
        histories: [makeHistory({ difficulty: 'HARD' })],
        completions: [],
      }),
    ).toBe(true);
  });
  it('EXPERT履歴があれば expert_master 達成', () => {
    expect(
      getAchievementById('expert_master')!.check({
        histories: [makeHistory({ difficulty: 'EXPERT' })],
        completions: [],
      }),
    ).toBe(true);
  });
  it('NORMALだけでは hard_breaker 未達成', () => {
    expect(
      getAchievementById('hard_breaker')!.check({
        histories: [makeHistory({ difficulty: 'NORMAL' })],
        completions: [],
      }),
    ).toBe(false);
  });
});

describe('perfect_score（完璧なる詠唱）', () => {
  const ach = getAchievementById('perfect_score')!;
  it('99点では未達成', () => {
    expect(
      ach.check({ histories: [makeHistory({ score: 99 })], completions: [] }),
    ).toBe(false);
  });
  it('100点で達成', () => {
    expect(
      ach.check({ histories: [makeHistory({ score: 100 })], completions: [] }),
    ).toBe(true);
  });
});

describe('streak_5（連続達成）', () => {
  const ach = getAchievementById('streak_5')!;
  it('履歴4件では未達成', () => {
    const histories = Array.from({ length: 4 }, () =>
      makeHistory({ rank: 'S' }),
    );
    expect(ach.check({ histories, completions: [] })).toBe(false);
  });
  it('直近5件すべてA以上で達成', () => {
    const histories = [
      makeHistory({ rank: 'S' }),
      makeHistory({ rank: 'A' }),
      makeHistory({ rank: 'S' }),
      makeHistory({ rank: 'A' }),
      makeHistory({ rank: 'S' }),
      makeHistory({ rank: 'C' }), // 6件目（範囲外）
    ];
    expect(ach.check({ histories, completions: [] })).toBe(true);
  });
  it('先頭5件にBが混じれば未達成', () => {
    const histories = [
      makeHistory({ rank: 'S' }),
      makeHistory({ rank: 'B' }),
      makeHistory({ rank: 'A' }),
      makeHistory({ rank: 'A' }),
      makeHistory({ rank: 'S' }),
    ];
    expect(ach.check({ histories, completions: [] })).toBe(false);
  });
});

describe('evaluateAchievements', () => {
  it('空データではどれも達成しない', () => {
    expect(evaluateAchievements(empty)).toEqual([]);
  });
  it('1件のSランク履歴で first_step と first_s が達成', () => {
    const data: AchievementCheckData = {
      histories: [makeHistory({ rank: 'S' })],
      completions: [],
    };
    const ids = evaluateAchievements(data);
    expect(ids).toContain('first_step');
    expect(ids).toContain('first_s');
    expect(ids).not.toContain('three_master');
  });
});
