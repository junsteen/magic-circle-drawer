import { describe, it, expect } from 'vitest';
import { calculateScore } from './scoring';
import { createPresetPattern, generateEdgePoints } from './patterns';
import type { MagicCirclePattern, Point } from './patterns';

// テスト用の三角形パターン
const trianglePattern: MagicCirclePattern = {
  name: 'テスト三角形',
  vertices: [
    { x: 100, y: 50 },
    { x: 200, y: 200 },
    { x: 0, y: 200 },
  ],
  edges: [
    { from: 0, to: 1 },
    { from: 1, to: 2 },
    { from: 2, to: 0 },
  ],
  circles: [],
  vertexCount: 3,
  edgeCount: 3,
  circleCount: 0,
};

// 辺上の補間点を生成
function interpolate(
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps: number,
): { x: number; y: number }[] {
  return Array.from({ length: steps }, (_, i) => ({
    x: from.x + (to.x - from.x) * (i / steps),
    y: from.y + (to.y - from.y) * (i / steps),
  }));
}

// テンプレート辺上を正確になぞるパスを生成
function perfectPath(): { x: number; y: number }[] {
  const { vertices, edges } = trianglePattern;
  const pts: { x: number; y: number }[] = [];
  for (const edge of edges) {
    pts.push(...interpolate(vertices[edge.from], vertices[edge.to], 30));
  }
  return pts;
}

describe('calculateScore', () => {

  // ─── 1. 入力検証 ─────────────────────────────────────────────────────────

  describe('入力検証', () => {
    it('userPath が空配列のとき score=0, rank="C", damageMultiplier="0%" を返す', () => {
      const result = calculateScore([], trianglePattern);
      expect(result.score).toBe(0);
      expect(result.rank).toBe('C');
      expect(result.damageMultiplier).toBe('0%');
    });

    it('userPath が 1 点のとき score=0 を返す', () => {
      const result = calculateScore([{ x: 100, y: 50 }], trianglePattern);
      expect(result.score).toBe(0);
      expect(result.rank).toBe('C');
    });

    it('userPath が 9 点（境界未満）のとき score=0 を返す', () => {
      const path = Array.from({ length: 9 }, (_, i) => ({ x: 100 + i, y: 50 }));
      const result = calculateScore(path, trianglePattern);
      expect(result.score).toBe(0);
    });

    it('userPath がちょうど 10 点のとき通常計算が実行される（score=0 ではない）', () => {
      const path = Array.from({ length: 10 }, (_, i) => ({
        x: 100 + (100 * i) / 9,
        y: 50 + (150 * i) / 9,
      }));
      const result = calculateScore(path, trianglePattern);
      expect(result.score).toBeGreaterThan(0);
    });
  });

  // ─── 2. ランク・ダメージ倍率の対応 ───────────────────────────────────────

  describe('ランク・ダメージ倍率', () => {
    it('完璧なパスは score>=90, rank="S", damageMultiplier="120%" を返す', () => {
      const result = calculateScore(perfectPath(), trianglePattern);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.rank).toBe('S');
      expect(result.damageMultiplier).toBe('120%');
    });

    it('テンプレートから大きく外れたパスは rank="C", damageMultiplier="0%" を返す', () => {
      const farPath = Array.from({ length: 20 }, () => ({ x: 350, y: 350 }));
      const result = calculateScore(farPath, trianglePattern);
      expect(result.rank).toBe('C');
      expect(result.damageMultiplier).toBe('0%');
    });

    it('rank="S" のとき damageMultiplier は "120%"', () => {
      const result = calculateScore(perfectPath(), trianglePattern);
      if (result.rank === 'S') {
        expect(result.damageMultiplier).toBe('120%');
      }
    });

    it('rank="A" のとき damageMultiplier は "100%"', () => {
      // 18px ずらしたパスは A ランク帯になる
      const slightlyOffPath = perfectPath().map(p => ({ x: p.x + 18, y: p.y }));
      const result = calculateScore(slightlyOffPath, trianglePattern);
      if (result.rank === 'A') {
        expect(result.damageMultiplier).toBe('100%');
      }
    });

    it('rank="B" のとき damageMultiplier は "70%"', () => {
      const moderatelyOffPath = perfectPath().map(p => ({ x: p.x + 30, y: p.y }));
      const result = calculateScore(moderatelyOffPath, trianglePattern);
      if (result.rank === 'B') {
        expect(result.damageMultiplier).toBe('70%');
      }
    });
  });

  // ─── 3. 戻り値の構造 ─────────────────────────────────────────────────────

  describe('戻り値の構造', () => {
    it('結果は score, rank, damageMultiplier プロパティを持つ', () => {
      const result = calculateScore(perfectPath(), trianglePattern);
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('rank');
      expect(result).toHaveProperty('damageMultiplier');
    });

    it('score は 0-100 の整数', () => {
      const result = calculateScore(perfectPath(), trianglePattern);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.score)).toBe(true);
    });

    it('rank は S/A/B/C のいずれか', () => {
      const result = calculateScore(perfectPath(), trianglePattern);
      expect(['S', 'A', 'B', 'C']).toContain(result.rank);
    });

    it('score が低いほど rank も低い（完璧 vs 最悪の比較）', () => {
      const goodResult = calculateScore(perfectPath(), trianglePattern);
      const badResult = calculateScore(Array.from({ length: 20 }, () => ({ x: 350, y: 350 })), trianglePattern);
      expect(goodResult.score).toBeGreaterThan(badResult.score);
    });
  });

  // ─── 4. difficultyTolerance の影響 ───────────────────────────────────────

  describe('difficultyTolerance', () => {
    it('完璧なパスは tolerance に関わらず高スコアを返す', () => {
      const path = perfectPath();
      const lenient = calculateScore(path, trianglePattern, 2.0);
      const strict = calculateScore(path, trianglePattern, 0.5);
      expect(lenient.score).toBeGreaterThanOrEqual(80);
      expect(strict.score).toBeGreaterThanOrEqual(80);
    });

    it('ずれたパスは tolerance が厳しいほど低スコアになる', () => {
      // 20px ずらしたパス：strict(0.5)では閾値12.5px未満なので頂点未到達
      const deviatedPath = perfectPath().map(p => ({ x: p.x + 20, y: p.y }));
      const lenient = calculateScore(deviatedPath, trianglePattern, 2.0);
      const strict = calculateScore(deviatedPath, trianglePattern, 0.5);
      expect(strict.score).toBeLessThan(lenient.score);
    });

    it('tolerance=1.0（デフォルト）は指定なしと同じスコアを返す', () => {
      const path = perfectPath();
      const withDefault = calculateScore(path, trianglePattern);
      const withExplicit = calculateScore(path, trianglePattern, 1.0);
      expect(withDefault.score).toBe(withExplicit.score);
    });
  });

  // ─── 5. 辺なし・頂点なしパターン（エッジケース） ─────────────────────────

  describe('エッジケース：最小パターン', () => {
    it('辺が 1 本のパターンでも score が計算される', () => {
      const linePattern: MagicCirclePattern = {
        name: '直線',
        vertices: [{ x: 100, y: 100 }, { x: 200, y: 100 }],
        edges: [{ from: 0, to: 1 }],
        circles: [],
        vertexCount: 2,
        edgeCount: 1,
        circleCount: 0,
      };
      const path = interpolate({ x: 100, y: 100 }, { x: 200, y: 100 }, 30);
      const result = calculateScore(path, linePattern);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});

// ─── プリセットパターンを使った座標描画テスト ──────────────────────────────────

const CANVAS_SIZE = 300;
const presetPatterns = createPresetPattern(CANVAS_SIZE);

/**
 * パターンの全エッジ上を正確になぞるパスを生成
 */
function perfectPathForPattern(pattern: MagicCirclePattern, pointsPerEdge = 30): Point[] {
  return generateEdgePoints(pattern.vertices, pattern.edges, pointsPerEdge);
}

describe('calculateScore — プリセットパターン別座標描画', () => {

  describe('五芒星パターン', () => {
    const pentagram = presetPatterns.find(p => p.name === '五芒星')!;

    it('完璧なパスでスコア >= 90（S ランク）', () => {
      const result = calculateScore(perfectPathForPattern(pentagram), pentagram);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.rank).toBe('S');
    });

    it('大きくずれたパスは C ランク', () => {
      const farPath = Array.from({ length: 30 }, () => ({ x: 0, y: 0 }));
      const result = calculateScore(farPath, pentagram);
      expect(result.rank).toBe('C');
    });

    it('スコアは 0-100 の整数', () => {
      const result = calculateScore(perfectPathForPattern(pentagram), pentagram);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.score)).toBe(true);
    });
  });

  describe('六芒星パターン', () => {
    const hexagram = presetPatterns.find(p => p.name === '六芒星')!;

    it('完璧なパスでスコア >= 90', () => {
      const result = calculateScore(perfectPathForPattern(hexagram), hexagram);
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it('パス長がパターン周長より大幅に短いと低スコア', () => {
      // 辺の一部だけをなぞる（最初の辺のみ）
      const partialPath = generateEdgePoints(
        hexagram.vertices,
        [hexagram.edges[0]],
        30,
      );
      const result = calculateScore(partialPath, hexagram);
      const fullResult = calculateScore(perfectPathForPattern(hexagram), hexagram);
      expect(result.score).toBeLessThan(fullResult.score);
    });
  });

  describe('複数パターン共通プロパティ', () => {
    it('全プリセットパターンで完璧なパスのスコアが 0-100 の範囲内', () => {
      for (const pattern of presetPatterns) {
        const result = calculateScore(perfectPathForPattern(pattern), pattern);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      }
    });

    it('全プリセットパターンで完璧なパスのランクが S/A/B/C のいずれか', () => {
      for (const pattern of presetPatterns) {
        const result = calculateScore(perfectPathForPattern(pattern), pattern);
        expect(['S', 'A', 'B', 'C']).toContain(result.rank);
      }
    });

    it('完璧なパスは大幅にずれたパスよりスコアが高い', () => {
      for (const pattern of presetPatterns) {
        const perfect = calculateScore(perfectPathForPattern(pattern), pattern);
        const far = calculateScore(
          Array.from({ length: 30 }, () => ({ x: -500, y: -500 })),
          pattern,
        );
        expect(perfect.score).toBeGreaterThan(far.score);
      }
    });
  });

  describe('精度とスコアの関係', () => {
    const [triangle] = presetPatterns;

    it('ずれ量が増えるほどスコアが下がる', () => {
      const offsets = [5, 15, 30];
      const scores = offsets.map(offset => {
        const path = perfectPathForPattern(triangle).map(p => ({ x: p.x + offset, y: p.y }));
        return calculateScore(path, triangle).score;
      });
      // scores[0] >= scores[1] >= scores[2]
      expect(scores[0]).toBeGreaterThanOrEqual(scores[1]);
      expect(scores[1]).toBeGreaterThanOrEqual(scores[2]);
    });

    it('difficultyTolerance が大きいほど同じずれに対して高スコア', () => {
      const path = perfectPathForPattern(triangle).map(p => ({ x: p.x + 20, y: p.y }));
      const lenient = calculateScore(path, triangle, 2.0);
      const strict = calculateScore(path, triangle, 0.5);
      expect(lenient.score).toBeGreaterThan(strict.score);
    });
  });
});
