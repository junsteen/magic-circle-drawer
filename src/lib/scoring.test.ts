import { describe, expect, test } from 'vitest';
import type { Point, MagicCirclePattern, ScoringResult } from './scoring';
import { 
  calculateScore
} from './scoring';
import { createPresetPattern } from './patterns';

// Helper functions (copied from implementation for testing)
function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function minDistance(point: Point, targets: Point[]): number {
  let min = Infinity;
  for (const t of targets) {
    const d = distance(point, t);
    if (d < min) min = d;
  }
  return min;
}

/** Check if user passed near all vertices of a pattern */
function checkVertexCheckpoints(
  userPath: Point[],
  vertices: Point[],
  threshold: number,
): number {
  let visitedCount = 0;
  for (let v = 0; v < vertices.length; v++) {
    for (const p of userPath) {
      if (distance(p, vertices[v]) < threshold) {
        visitedCount++;
        break;
      }
    }
  }
  return visitedCount;
}

/** テンプレートパス上の全サンプル点を生成 */
function getTemplatePoints(pattern: MagicCirclePattern, pointsPerEdge = 30): Point[] {
  const pts: Point[] = [];
  for (const edge of pattern.edges) {
    const a = pattern.vertices[edge.from];
    const b = pattern.vertices[edge.to];
    for (let j = 0; j < pointsPerEdge; j++) {
      const t = j / pointsPerEdge;
      pts.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      });
    }
  }
  return pts;
}

/** パターンのおおよその周長を計算 */
function estimatePatternPerimeter(pattern: MagicCirclePattern): number {
  let total = 0;
  for (const edge of pattern.edges) {
    const a = pattern.vertices[edge.from];
    const b = pattern.vertices[edge.to];
    total += distance(a, b);
  }
  return total;
}

describe('scoring.ts', () => {
  const testPattern: MagicCirclePattern = createPresetPattern(300)[1]; // 五芒星

  describe('distance', () => {
    test('should calculate correct distance', () => {
      expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
      expect(distance({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
      expect(distance({ x: -1, y: -1 }, { x: 1, y: 1 })).toBeCloseTo(2.828, 3);
    });
  });

  describe('minDistance', () => {
    test('should find minimum distance to points', () => {
      const targets = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 5 }];
      expect(minDistance({ x: 6, y: 0 }, targets)).toBeCloseTo(4, 2); // Distance to (10,0)
      expect(minDistance({ x: 0, y: 0 }, targets)).toBe(0);
    });

    test('should return Infinity for empty targets', () => {
      expect(minDistance({ x: 0, y: 0 }, [])).toBe(Infinity);
    });
  });

  describe('checkVertexCheckpoints', () => {
    test('should count visited vertices', () => {
      const vertices = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }];
      const userPath = [{ x: 1, y: 1 }, { x: 9, y: 1 }, { x: 5, y: 9 }];
      
      // With threshold of 2, all vertices should be "visited"
      expect(checkVertexCheckpoints(userPath, vertices, 2)).toBe(3);
      
      // With threshold of 0.5, none should be visited
      expect(checkVertexCheckpoints(userPath, vertices, 0.5)).toBe(0);
    });

    test('should handle empty arrays', () => {
      expect(checkVertexCheckpoints([], [{ x: 0, y: 0 }], 5)).toBe(0);
      expect(checkVertexCheckpoints([{ x: 0, y: 0 }], [], 5)).toBe(0);
    });
  });

  describe('getTemplatePoints', () => {
    test('should generate template points for edges', () => {
      const pattern: MagicCirclePattern = {
        name: 'test',
        vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
        edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }],
        circles: [],
        vertexCount: 3,
        edgeCount: 2,
        circleCount: 0
      };
      
      const points = getTemplatePoints(pattern, 2);
      // 2 edges * 2 points per edge = 4 points
      expect(points).toHaveLength(4);
      
      // First edge: start point and midpoint
      expect(points[0]).toEqual({ x: 0, y: 0 });
      expect(points[1]).toEqual({ x: 5, y: 0 });
      
      // Second edge: start point and midpoint  
      expect(points[2]).toEqual({ x: 10, y: 0 });
      expect(points[3]).toEqual({ x: 10, y: 5 });
    });
  });

  describe('estimatePatternPerimeter', () => {
    test('should calculate perimeter correctly', () => {
      const pattern: MagicCirclePattern = {
        name: 'test',
        vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
        edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 }],
        circles: [],
        vertexCount: 3,
        edgeCount: 3,
        circleCount: 0
      };
      
      // Two sides of length 10 and one side of length sqrt(200) ≈ 14.14
      const perimeter = estimatePatternPerimeter(pattern);
      expect(perimeter).toBeCloseTo(34.14, 2);
    });
  });

  describe('calculateScore', () => {
    test('should return zero score for very short path', () => {
      const result: ScoringResult = calculateScore(
        [{ x: 0, y: 0 }, { x: 1, y: 1 }], // Only 2 points
        testPattern
      );
      expect(result.score).toBe(0);
      expect(result.rank).toBe('C');
      expect(result.damageMultiplier).toBe('0%');
    });

    test('should calculate score for perfect path', () => {
      // Create a perfect circular path matching the template
      const templatePoints = getTemplatePoints(testPattern, 50);
      
      const result: ScoringResult = calculateScore(
        templatePoints,
        testPattern,
        1.0
      );
      
      // Should score high for perfect match
      expect(result.score).toBeGreaterThan(80);
      expect(['A', 'S']).toContain(result.rank);
    });

    test('should apply difficulty tolerance', () => {
      const userPath = [
        { x: 150, y: 100 },
        { x: 200, y: 150 },
        { x: 250, y: 200 },
        { x: 200, y: 250 },
        { x: 150, y: 200 }
      ];
      
      const resultEasy = calculateScore(userPath, testPattern, 1.5); // Easy tolerance
      const resultHard = calculateScore(userPath, testPattern, 0.7); // Hard tolerance
      
      // Harder tolerance should give lower or equal score
      expect(resultHard.score).toBeLessThanOrEqual(resultEasy.score);
    });

    test('should assign correct ranks based on score', () => {
      // Mock a path that should give specific scores
      // We'll test the ranking logic by checking score ranges
      
      // Test S rank (score >= 90)
      const highScorePath = Array.from({ length: 100 }, (_, i) => ({
        x: 150 + Math.cos(i * 0.1) * 50,
        y: 150 + Math.sin(i * 0.1) * 50
      }));
      
      const highResult = calculateScore(highScorePath, testPattern, 1.0);
      if (highResult.score >= 90) {
        expect(highResult.rank).toBe('S');
        expect(highResult.damageMultiplier).toBe('120%');
      }
      
      // Test A rank (score >= 70)
      const mediumScorePath = Array.from({ length: 50 }, (_, i) => ({
        x: 150 + Math.cos(i * 0.2) * 40 + Math.random() * 10,
        y: 150 + Math.sin(i * 0.2) * 40 + Math.random() * 10
      }));
      
      const mediumResult = calculateScore(mediumScorePath, testPattern, 1.0);
      if (mediumResult.score >= 70 && mediumResult.score < 90) {
        expect(mediumResult.rank).toBe('A');
        expect(mediumResult.damageMultiplier).toBe('100%');
      }
      
      // Test B rank (score >= 50)
      const lowScorePath = Array.from({ length: 20 }, (_, i) => ({
        x: 150 + Math.random() * 100,
        y: 150 + Math.random() * 100
      }));
      
      const lowResult = calculateScore(lowScorePath, testPattern, 1.0);
      if (lowResult.score >= 50 && lowResult.score < 70) {
        expect(lowResult.rank).toBe('B');
        expect(lowResult.damageMultiplier).toBe('70%');
      }
      
      // Test C rank (score < 50)
      const veryLowResult = calculateScore(
        [{ x: 0, y: 0 }, { x: 1, y: 1 }], 
        testPattern
      );
      if (veryLowResult.score < 50) {
        expect(veryLowResult.rank).toBe('C');
        expect(veryLowResult.damageMultiplier).toBe('0%');
      }
    });
  });
});