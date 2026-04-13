export interface Point {
  x: number;
  y: number;
}

export interface Edge {
  /** 線の始点インデックス(頂点配列) */
  from: number;
  /** 線の終点インデックス(頂点配列) */
  to: number;
}

export interface CircleDef {
  /** 相対cx (0-1, 画面中心=0.5) */
  cx: number;
  /** 相対cy (0-1, 画面中心=0.5) */
  cy: number;
  /** 半径 (pixel) */
  radius: number;
}

export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'EASY',
  normal: 'NORMAL',
  hard: 'HARD',
  expert: 'EXPERT',
};

/** 難易度ごとのタイムリミット（秒） */
export const DIFFICULTY_TIME: Record<Difficulty, number> = {
  easy: 10,
  normal: 5,
  hard: 3,
  expert: 2,
};

/** 難易度ごとのスコア倍率 */
export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 0.8,
  normal: 1.0,
  hard: 1.3,
  expert: 1.6,
};

/** 難易度ごとの許容誤差倍率 (大きいほど易しい) */
export const DIFFICULTY_TOLERANCE: Record<Difficulty, number> = {
  easy: 1.5,
  normal: 1.0,
  hard: 0.7,
  expert: 0.5,
};

export interface MagicCirclePattern {
  /** パターン名 */
  name: string;
  /** 頂点リスト (キャンバス座標) */
  vertices: Point[];
  /** 頂点間の接続定義 */
  edges: Edge[];
  /** 補助円 */
  circles: CircleDef[];
  /** 頂点数 */
  vertexCount: number;
  /** 線の数 */
  edgeCount: number;
  /** 円の追加数 */
  circleCount: number;
}

/* =================================================================== */
/*  ヘルパー: 正多角形の頂点生成                                                 */
/* =================================================================== */

function regularPolygonVertices(
  cx: number,
  cy: number,
  radius: number,
  n: number,
): Point[] {
  const verts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    verts.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }
  return verts;
}

/*  外周を閉じるエッジ */
function polygonEdges(n: number): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < n; i++) edges.push({ from: i, to: (i + 1) % n });
  return edges;
}

/*  星型のエッジ (step=2 → 五芒星)  */
function starEdges(n: number, step: number): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < n; i++) edges.push({ from: i, to: (i + step) % n });
  return edges;
}

/*  多角形の辺上のサンプル点を生成                                                */
export function generateEdgePoints(
  vertices: Point[],
  edges: Edge[],
  pointsPerEdge: number,
): Point[] {
  const pts: Point[] = [];
  for (const edge of edges) {
    const a = vertices[edge.from];
    const b = vertices[edge.to];
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

/* =================================================================== */
/*  Preset パターン                                                                  */
/* =================================================================== */

export function createPresetPattern(
  canvasSize: number,
): MagicCirclePattern[] {
  const cx = canvasSize / 2;
  const cy = canvasSize / 2;
  const r = canvasSize * 0.35;

  // ─── 三角形 ───
  const triVerts = regularPolygonVertices(cx, cy, r, 3);
  const triangle: MagicCirclePattern = {
    name: '三角形',
    vertices: triVerts,
    edges: polygonEdges(3),
    circles: [{ cx: 0.5, cy: 0.5, radius: r + 20 }],
    vertexCount: 3,
    edgeCount: 3,
    circleCount: 1,
  };

  // ─── 五芒星 ───
  const pentaVerts = regularPolygonVertices(cx, cy, r, 5);
  const pentagram: MagicCirclePattern = {
    name: '五芒星',
    vertices: pentaVerts,
    edges: starEdges(5, 2),
    circles: [
      { cx: 0.5, cy: 0.5, radius: r + 20 },
      { cx: 0.5, cy: 0.5, radius: r },
    ],
    vertexCount: 5,
    edgeCount: 5,
    circleCount: 2,
  };

  // ─── 六芒星 ───
  const hexVerts = regularPolygonVertices(cx, cy, r, 6);
  const hexagram: MagicCirclePattern = {
    name: '六芒星',
    vertices: hexVerts,
    // 2つの三角形で構成
    edges: [
      { from: 0, to: 2 }, { from: 2, to: 4 }, { from: 4, to: 0 },
      { from: 1, to: 3 }, { from: 3, to: 5 }, { from: 5, to: 1 },
    ],
    circles: [
      { cx: 0.5, cy: 0.5, radius: r + 20 },
      { cx: 0.5, cy: 0.5, radius: r },
    ],
    vertexCount: 6,
    edgeCount: 6,
    circleCount: 2,
  };

  // ─── 円 ───
  const circlePts: Point[] = [];
  const circleN = 60;
  const circleR = r;
  for (let i = 0; i < circleN; i++) {
    const angle = (Math.PI * 2 * i) / circleN;
    circlePts.push({
      x: cx + circleR * Math.cos(angle),
      y: cy + circleR * Math.sin(angle),
    });
  }
  const circleEdges: Edge[] = [];
  for (let i = 0; i < circleN; i++) circleEdges.push({ from: i, to: (i + 1) % circleN });

  const circle: MagicCirclePattern = {
    name: '円',
    vertices: circlePts,
    edges: circleEdges,
    circles: [{ cx: 0.5, cy: 0.5, radius: r }],
    vertexCount: circleN,
    edgeCount: circleN,
    circleCount: 1,
  };

  // ─── 複合魔法陣 ───
  const compVerts = regularPolygonVertices(cx, cy, r, 8);
  const complex: MagicCirclePattern = {
    name: '複合魔法陣',
    vertices: compVerts,
    edges: [
      ...polygonEdges(8),
      // 内側の星型
      { from: 0, to: 3 }, { from: 2, to: 5 }, { from: 4, to: 7 }, { from: 6, to: 1 },
    ],
    circles: [
      { cx: 0.5, cy: 0.5, radius: r + 20 },
      { cx: 0.5, cy: 0.5, radius: r },
      { cx: 0.5, cy: 0.5, radius: r * 0.6 },
    ],
    vertexCount: 8,
    edgeCount: 12,
    circleCount: 3,
  };

  // ─── 八芒星 ───
  const octaVerts = regularPolygonVertices(cx, cy, r, 8);
  const octagram: MagicCirclePattern = {
    name: '八芒星',
    vertices: octaVerts,
    edges: starEdges(8, 3), // 八芒星はstep=3
    circles: [
      { cx: 0.5, cy: 0.5, radius: r + 25 },
      { cx: 0.5, cy: 0.5, radius: r + 5 },
    ],
    vertexCount: 8,
    edgeCount: 8,
    circleCount: 2,
  };

  // ─── 三重円（一重枚目） ───
  const tripleCircleVerts = regularPolygonVertices(cx, cy, r * 0.8, 32); // 円滑にするため十分な頂点数
  const tripleCircleEdges: Edge[] = [];
  for (let i = 0; i < 32; i++) {
    tripleCircleEdges.push({ from: i, to: (i + 1) % 32 });
  }
  const tripleCircle: MagicCirclePattern = {
    name: '三重円',
    vertices: tripleCircleVerts,
    edges: tripleCircleEdges,
    circles: [
      { cx: 0.5, cy: 0.5, radius: r * 0.8 },   // 内圈
      { cx: 0.5, cy: 0.5, radius: r * 1.0 },   // 中圈
      { cx: 0.5, cy: 0.5, radius: r * 1.2 },   // 外圈
    ],
    vertexCount: 32,
    edgeCount: 32,
    circleCount: 3,
  };

  // ─── 五重星結界 ───
  const sealVerts = regularPolygonVertices(cx, cy, r, 5);
  const pentagramSeal: MagicCirclePattern = {
    name: '五重星結界',
    vertices: sealVerts,
    edges: [
      ...starEdges(5, 2),      // 五芒星
      ...polygonEdges(5),      // 外枠五角形
    ],
    circles: [
      { cx: 0.5, cy: 0.5, radius: r + 15 },
      { cx: 0.5, cy: 0.5, radius: r - 10 },
    ],
    vertexCount: 5,
    edgeCount: 10, // 5 (star) + 5 (pentagon)
    circleCount: 2,
  };

  // ─── 魔方陣風パターン 3x3グリッド ───
  const magicSquareVerts: Point[] = [];
  const magicSquareSize = r * 0.6;
  const startX = cx - magicSquareSize / 2;
  const startY = cy - magicSquareSize / 2;
  const cellSize = magicSquareSize / 3;
  
  // 3x3グリッドの交点を頂点とする
  for (let row = 0; row <= 3; row++) {
    for (let col = 0; col <= 3; col++) {
      magicSquareVerts.push({
        x: startX + col * cellSize,
        y: startY + row * cellSize,
      });
    }
  }
  
  const magicSquareEdges: Edge[] = [];
  // 水平線
  for (let row = 0; row <= 3; row++) {
    for (let col = 0; col < 3; col++) {
      const from = row * 4 + col;
      const to = row * 4 + col + 1;
      magicSquareEdges.push({ from, to });
    }
  }
  // 垂直線
  for (let col = 0; col <= 3; col++) {
    for (let row = 0; row < 3; row++) {
      const from = row * 4 + col;
      const to = (row + 1) * 4 + col;
      magicSquareEdges.push({ from, to });
    }
  }
  
  const magicSquare: MagicCirclePattern = {
    name: '魔方陣風',
    vertices: magicSquareVerts,
    edges: magicSquareEdges,
    circles: [
      { cx: 0.5, cy: 0.5, radius: r * 0.7 },
    ],
    vertexCount: 16, // 4x4 grid points
    edgeCount: 24,   // 12 horizontal + 12 vertical
    circleCount: 1,
  };

  return [triangle, pentagram, hexagram, circle, complex, octagram, tripleCircle, pentagramSeal, magicSquare];
}

/* =================================================================== */
/*  ランダム生成                                                                           */
/* =================================================================== */

export interface RandomPatternConfig {
  difficulty: Difficulty;
  canvasSize: number;
}

export function generateRandomPattern(
  config: RandomPatternConfig,
): MagicCirclePattern {
  const { difficulty, canvasSize } = config;
  const cx = canvasSize / 2;
  const cy = canvasSize / 2;
  const baseR = canvasSize * 0.35;

  // 難易度に応じた頂点数
  let vertexCount: number;
  switch (difficulty) {
    case 'easy':
      vertexCount = 3;
      break;
    case 'normal':
      vertexCount = 3 + Math.floor(Math.random() * 3); // 3-5
      break;
    case 'hard':
      vertexCount = 4 + Math.floor(Math.random() * 3); // 4-6
      break;
    case 'expert':
      vertexCount = 5 + Math.floor(Math.random() * 5); // 5-9
      break;
  }

  const randomR = baseR * (0.85 + Math.random() * 0.3); // 多少ランダムな半径
  const verts = regularPolygonVertices(cx, cy, randomR, vertexCount);

  // エッジの種類を決定
  const isPentagramStyle = vertexCount >= 5 && Math.random() > 0.5;
  const edges = isPentagramStyle
    ? starEdges(vertexCount, 2)
    : polygonEdges(vertexCount);
  // expertなら追加エッジ
  if (difficulty === 'expert' && Math.random() > 0.3) {
    const extraCount = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < extraCount; i++) {
      const a = Math.floor(Math.random() * vertexCount);
      let b = Math.floor(Math.random() * vertexCount);
      while (b === a || edges.some((e) => e.from === a && e.to === b)) {
        b = Math.floor(Math.random() * vertexCount);
      }
      edges.push({ from: a, to: b });
    }
  }

  // 円の数 (難易度に応じて増える)
  let circleCount: number;
  switch (difficulty) {
    case 'easy':
      circleCount = 1;
      break;
    case 'normal':
      circleCount = 1 + (Math.random() > 0.5 ? 1 : 0);
      break;
    case 'hard':
    case 'expert':
      circleCount = 1 + Math.floor(Math.random() * 3); // 1-3
      break;
  }

  const circles: CircleDef[] = [];
  circles.push({ cx: 0.5, cy: 0.5, radius: randomR + 20 }); // 外側
  for (let i = 0; i < circleCount - 1; i++) {
    circles.push({ cx: 0.5, cy: 0.5, radius: randomR * (0.4 + Math.random() * 0.4) });
  }

  const randomName = `Lv.${difficulty.toUpperCase()} #${Math.floor(Math.random() * 900 + 100)}`;

  return {
    name: randomName,
    vertices: verts,
    edges,
    circles,
    vertexCount: verts.length,
    edgeCount: edges.length,
    circleCount: circles.length,
  };
}

/* =================================================================== */
/*  ユーティリティ                                                                          */
/* =================================================================== */

export function getPatternVerticesForTemplate(
  pattern: MagicCirclePattern,
): Point[] {
  return pattern.vertices;
}

export function getPatternTemplatePoints(
  pattern: MagicCirclePattern,
  pointsPerEdge: number = 20,
): Point[] {
  return generateEdgePoints(pattern.vertices, pattern.edges, pointsPerEdge);
}

/* Preset patterns cache */
let presetPatternsCache: MagicCirclePattern[] | null = null;

/**
 * Get all preset patterns
 * @returns Array of MagicCirclePattern objects
 */
export function getPatterns(): MagicCirclePattern[] {
  if (!presetPatternsCache) {
    // Initialize with default canvas size (will be adjusted by caller if needed)
    presetPatternsCache = createPresetPattern(800); // 800px canvas size for patterns
  }
  return [...presetPatternsCache]; // Return copy to prevent mutation
}

/**
 * Get a pattern by its name
 * @param name - Name of the pattern to find
 * @returns The pattern if found, undefined otherwise
 */
export function getPatternByName(name: string): MagicCirclePattern | undefined {
  if (!presetPatternsCache) {
    presetPatternsCache = createPresetPattern(800);
  }
  return presetPatternsCache.find(pattern => pattern.name === name);
}
