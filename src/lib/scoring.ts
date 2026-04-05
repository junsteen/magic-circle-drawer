import type { Point, MagicCirclePattern } from './patterns';

export interface ScoringResult {
  score: number;
  rank: string;
  damageMultiplier: string;
  difficultyMultiplier?: number;
}

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

export function calculateScore(
  userPath: Point[],
  pattern: MagicCirclePattern,
  difficultyTolerance = 1.0,
): ScoringResult {
  if (userPath.length < 10) {
    return { score: 0, rank: 'C', damageMultiplier: '0%' };
  }

  const templatePoints = getTemplatePoints(pattern);
  const vertices = pattern.vertices;
  const perimeter = estimatePatternPerimeter(pattern);
  const baseTolerance = 25; // base vertex check threshold in pixels
  const vertexThreshold = baseTolerance * difficultyTolerance;
  const maxAllowedError = 40 * difficultyTolerance; // base accuracy threshold

  // 1. Accuracy: how close is the user path to the template?
  let totalError = 0;
  for (const userPoint of userPath) {
    const d = minDistance(userPoint, templatePoints);
    totalError += Math.min(d, maxAllowedError);
  }
  const avgError = totalError / userPath.length;
  let accuracy = Math.max(0, 100 - (avgError / maxAllowedError) * 100);

  // 2. Checkpoint: did user pass near all vertices?
  // Cap vertices to check for circles (many vertices) to avoid performance issues
  const maxCheckpointVertices = Math.min(vertices.length, 20);
  const sampledVertices = vertices.filter((_, i) => i % Math.max(1, Math.floor(vertices.length / maxCheckpointVertices)) === 0);
  const visitedVertices = checkVertexCheckpoints(userPath, sampledVertices, vertexThreshold);
  const checkedCount = Math.min(sampledVertices.length, vertices.length);
  const checkpointRatio = visitedVertices / checkedCount;

  // 3. Coverage: path length ratio
  let totalPathLength = 0;
  for (let i = 1; i < userPath.length; i++) {
    totalPathLength += distance(userPath[i - 1], userPath[i]);
  }
  const lengthRatio = Math.min(totalPathLength / perimeter, 1.5) / 1.5;

  // Scoring: accuracy 50%, checkpoints 30%, path length 20%
  let score = accuracy * 0.5 + checkpointRatio * 100 * 0.3 + lengthRatio * 100 * 0.2;
  score = Math.min(100, Math.max(0, score));

  const roundedScore = Math.round(score);

  let rank: string;
  let damageMultiplier: string;

  if (roundedScore >= 90) {
    rank = 'S';
    damageMultiplier = '120%';
  } else if (roundedScore >= 70) {
    rank = 'A';
    damageMultiplier = '100%';
  } else if (roundedScore >= 50) {
    rank = 'B';
    damageMultiplier = '70%';
  } else {
    rank = 'C';
    damageMultiplier = '0%';
  }

  return { score: roundedScore, rank, damageMultiplier };
}
