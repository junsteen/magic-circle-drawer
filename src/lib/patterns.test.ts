import { describe, it, expect } from 'vitest';
import {
  generateEdgePoints,
  createPresetPattern,
  generateRandomPattern,
  getPatternTemplatePoints,
} from './patterns';
import type { MagicCirclePattern, Point, Edge } from './patterns';

// ─── ヘルパー ──────────────────────────────────────────────────────────────────

function makeSquare(): { vertices: Point[]; edges: Edge[] } {
  const vertices: Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];
  const edges: Edge[] = [
    { from: 0, to: 1 },
    { from: 1, to: 2 },
    { from: 2, to: 3 },
    { from: 3, to: 0 },
  ];
  return { vertices, edges };
}

// ─── generateEdgePoints ────────────────────────────────────────────────────────

describe('generateEdgePoints', () => {

  describe('点数', () => {
    it('辺数 × pointsPerEdge の点数を返す', () => {
      const { vertices, edges } = makeSquare();
      const pts = generateEdgePoints(vertices, edges, 10);
      expect(pts.length).toBe(edges.length * 10);
    });

    it('pointsPerEdge=1 のとき辺ごとに 1 点を返す', () => {
      const { vertices, edges } = makeSquare();
      const pts = generateEdgePoints(vertices, edges, 1);
      expect(pts.length).toBe(edges.length);
    });

    it('空エッジリストのとき空配列を返す', () => {
      const { vertices } = makeSquare();
      const pts = generateEdgePoints(vertices, [], 10);
      expect(pts).toHaveLength(0);
    });
  });

  describe('座標の正確性', () => {
    it('各エッジの最初の点が始点 (vertices[from]) に一致する', () => {
      const { vertices, edges } = makeSquare();
      const pointsPerEdge = 5;
      const pts = generateEdgePoints(vertices, edges, pointsPerEdge);
      for (let i = 0; i < edges.length; i++) {
        const from = vertices[edges[i].from];
        const firstPt = pts[i * pointsPerEdge];
        expect(firstPt.x).toBeCloseTo(from.x, 5);
        expect(firstPt.y).toBeCloseTo(from.y, 5);
      }
    });

    it('生成された点が始点と終点のバウンディングボックス内に収まる', () => {
      const { vertices, edges } = makeSquare();
      const pts = generateEdgePoints(vertices, edges, 20);
      for (const pt of pts) {
        expect(pt.x).toBeGreaterThanOrEqual(-0.01);
        expect(pt.x).toBeLessThanOrEqual(100.01);
        expect(pt.y).toBeGreaterThanOrEqual(-0.01);
        expect(pt.y).toBeLessThanOrEqual(100.01);
      }
    });

    it('水平辺上の点は y 座標が一定', () => {
      const vertices: Point[] = [{ x: 0, y: 50 }, { x: 200, y: 50 }];
      const edges: Edge[] = [{ from: 0, to: 1 }];
      const pts = generateEdgePoints(vertices, edges, 10);
      for (const pt of pts) {
        expect(pt.y).toBeCloseTo(50, 5);
      }
    });

    it('垂直辺上の点は x 座標が一定', () => {
      const vertices: Point[] = [{ x: 75, y: 0 }, { x: 75, y: 100 }];
      const edges: Edge[] = [{ from: 0, to: 1 }];
      const pts = generateEdgePoints(vertices, edges, 10);
      for (const pt of pts) {
        expect(pt.x).toBeCloseTo(75, 5);
      }
    });

    it('補間点は等間隔に配置される（x 差が一定）', () => {
      const vertices: Point[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
      const edges: Edge[] = [{ from: 0, to: 1 }];
      const pointsPerEdge = 5;
      const pts = generateEdgePoints(vertices, edges, pointsPerEdge);
      const diffs = pts.slice(1).map((p, i) => p.x - pts[i].x);
      for (const diff of diffs) {
        expect(diff).toBeCloseTo(100 / pointsPerEdge, 5);
      }
    });
  });
});

// ─── createPresetPattern ──────────────────────────────────────────────────────

describe('createPresetPattern', () => {
  const CANVAS_SIZE = 300;
  const patterns = createPresetPattern(CANVAS_SIZE);

  it('9 種類のプリセットパターンを返す', () => {
    expect(patterns).toHaveLength(9);
  });

  it('各パターンに name, vertices, edges, circles が含まれる', () => {
    for (const p of patterns) {
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('vertices');
      expect(p).toHaveProperty('edges');
      expect(p).toHaveProperty('circles');
    }
  });

  it('vertexCount が実際の vertices.length に一致する', () => {
    for (const p of patterns) {
      expect(p.vertexCount).toBe(p.vertices.length);
    }
  });

  it('edgeCount が実際の edges.length に一致する', () => {
    for (const p of patterns) {
      expect(p.edgeCount).toBe(p.edges.length);
    }
  });

  it('circleCount が実際の circles.length に一致する', () => {
    for (const p of patterns) {
      expect(p.circleCount).toBe(p.circles.length);
    }
  });

  it('全エッジのインデックスが vertices 範囲内に収まる', () => {
    for (const p of patterns) {
      for (const edge of p.edges) {
        expect(edge.from).toBeGreaterThanOrEqual(0);
        expect(edge.from).toBeLessThan(p.vertices.length);
        expect(edge.to).toBeGreaterThanOrEqual(0);
        expect(edge.to).toBeLessThan(p.vertices.length);
      }
    }
  });

  it('全頂点の座標がキャンバス範囲（0～canvasSize）内に収まる', () => {
    for (const p of patterns) {
      for (const v of p.vertices) {
        expect(v.x).toBeGreaterThanOrEqual(0);
        expect(v.x).toBeLessThanOrEqual(CANVAS_SIZE);
        expect(v.y).toBeGreaterThanOrEqual(0);
        expect(v.y).toBeLessThanOrEqual(CANVAS_SIZE);
      }
    }
  });

  it('全円の半径が正の数', () => {
    for (const p of patterns) {
      for (const c of p.circles) {
        expect(c.radius).toBeGreaterThan(0);
      }
    }
  });

  it('全円の中心座標 cx, cy が 0-1 の範囲に収まる', () => {
    for (const p of patterns) {
      for (const c of p.circles) {
        expect(c.cx).toBeGreaterThanOrEqual(0);
        expect(c.cx).toBeLessThanOrEqual(1);
        expect(c.cy).toBeGreaterThanOrEqual(0);
        expect(c.cy).toBeLessThanOrEqual(1);
      }
    }
  });

  it('三角形パターンは辺が 3 本、頂点が 3 つ', () => {
    const tri = patterns.find(p => p.name === '三角形');
    expect(tri).toBeDefined();
    expect(tri!.vertices).toHaveLength(3);
    expect(tri!.edges).toHaveLength(3);
  });

  it('五芒星パターンは辺が 5 本、頂点が 5 つ', () => {
    const penta = patterns.find(p => p.name === '五芒星');
    expect(penta).toBeDefined();
    expect(penta!.vertices).toHaveLength(5);
    expect(penta!.edges).toHaveLength(5);
  });
});

// ─── generateRandomPattern ────────────────────────────────────────────────────

describe('generateRandomPattern', () => {
  const CANVAS_SIZE = 300;

  it('easy: 頂点数は必ず 3', () => {
    for (let i = 0; i < 10; i++) {
      const p = generateRandomPattern({ difficulty: 'easy', canvasSize: CANVAS_SIZE });
      expect(p.vertices).toHaveLength(3);
    }
  });

  it('normal: 頂点数は 3-5 の範囲', () => {
    const counts = new Set<number>();
    for (let i = 0; i < 50; i++) {
      const p = generateRandomPattern({ difficulty: 'normal', canvasSize: CANVAS_SIZE });
      expect(p.vertices.length).toBeGreaterThanOrEqual(3);
      expect(p.vertices.length).toBeLessThanOrEqual(5);
      counts.add(p.vertices.length);
    }
    // 50 回試行で複数の頂点数が生成される
    expect(counts.size).toBeGreaterThan(1);
  });

  it('hard: 頂点数は 4-6 の範囲', () => {
    for (let i = 0; i < 30; i++) {
      const p = generateRandomPattern({ difficulty: 'hard', canvasSize: CANVAS_SIZE });
      expect(p.vertices.length).toBeGreaterThanOrEqual(4);
      expect(p.vertices.length).toBeLessThanOrEqual(6);
    }
  });

  it('expert: 頂点数は 5-9 の範囲（追加エッジによるエッジ数増加は許容）', () => {
    for (let i = 0; i < 30; i++) {
      const p = generateRandomPattern({ difficulty: 'expert', canvasSize: CANVAS_SIZE });
      expect(p.vertices.length).toBeGreaterThanOrEqual(5);
      expect(p.vertices.length).toBeLessThanOrEqual(9);
    }
  });

  it('頂点座標がキャンバス範囲（0～canvasSize）内', () => {
    for (const difficulty of ['easy', 'normal', 'hard', 'expert'] as const) {
      const p = generateRandomPattern({ difficulty, canvasSize: CANVAS_SIZE });
      for (const v of p.vertices) {
        expect(v.x).toBeGreaterThanOrEqual(0);
        expect(v.x).toBeLessThanOrEqual(CANVAS_SIZE);
        expect(v.y).toBeGreaterThanOrEqual(0);
        expect(v.y).toBeLessThanOrEqual(CANVAS_SIZE);
      }
    }
  });

  it('circles は最低 1 つ以上', () => {
    for (const difficulty of ['easy', 'normal', 'hard', 'expert'] as const) {
      const p = generateRandomPattern({ difficulty, canvasSize: CANVAS_SIZE });
      expect(p.circles.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('vertexCount === vertices.length', () => {
    for (const difficulty of ['easy', 'normal', 'hard', 'expert'] as const) {
      const p = generateRandomPattern({ difficulty, canvasSize: CANVAS_SIZE });
      expect(p.vertexCount).toBe(p.vertices.length);
    }
  });

  it('edgeCount === edges.length', () => {
    for (const difficulty of ['easy', 'normal', 'hard', 'expert'] as const) {
      const p = generateRandomPattern({ difficulty, canvasSize: CANVAS_SIZE });
      expect(p.edgeCount).toBe(p.edges.length);
    }
  });

  it('全エッジのインデックスが vertices 範囲内', () => {
    for (let i = 0; i < 20; i++) {
      const p = generateRandomPattern({ difficulty: 'expert', canvasSize: CANVAS_SIZE });
      for (const edge of p.edges) {
        expect(edge.from).toBeGreaterThanOrEqual(0);
        expect(edge.from).toBeLessThan(p.vertices.length);
        expect(edge.to).toBeGreaterThanOrEqual(0);
        expect(edge.to).toBeLessThan(p.vertices.length);
      }
    }
  });

  it('パターン名に難易度が含まれる', () => {
    const p = generateRandomPattern({ difficulty: 'hard', canvasSize: CANVAS_SIZE });
    expect(p.name.toUpperCase()).toContain('HARD');
  });
});

// ─── getPatternTemplatePoints ─────────────────────────────────────────────────

describe('getPatternTemplatePoints', () => {
  const CANVAS_SIZE = 300;

  it('デフォルト（pointsPerEdge=20）のとき edges.length × 20 点を返す', () => {
    const [triangle] = createPresetPattern(CANVAS_SIZE);
    const pts = getPatternTemplatePoints(triangle);
    expect(pts).toHaveLength(triangle.edges.length * 20);
  });

  it('pointsPerEdge を指定するとその数だけ生成される', () => {
    const [triangle] = createPresetPattern(CANVAS_SIZE);
    const pts = getPatternTemplatePoints(triangle, 10);
    expect(pts).toHaveLength(triangle.edges.length * 10);
  });

  it('generateEdgePoints と同じ結果を返す', () => {
    const [triangle] = createPresetPattern(CANVAS_SIZE);
    const fromTemplate = getPatternTemplatePoints(triangle, 15);
    const fromEdge = generateEdgePoints(triangle.vertices, triangle.edges, 15);
    expect(fromTemplate).toEqual(fromEdge);
  });

  it('返却された点がキャンバス範囲内に収まる', () => {
    const patterns = createPresetPattern(CANVAS_SIZE);
    for (const p of patterns) {
      const pts = getPatternTemplatePoints(p, 5);
      for (const pt of pts) {
        expect(pt.x).toBeGreaterThanOrEqual(0);
        expect(pt.x).toBeLessThanOrEqual(CANVAS_SIZE);
        expect(pt.y).toBeGreaterThanOrEqual(0);
        expect(pt.y).toBeLessThanOrEqual(CANVAS_SIZE);
      }
    }
  });
});
