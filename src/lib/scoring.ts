interface Point {
  x: number;
  y: number;
}

export interface ScoringResult {
  score: number;
  rank: string;
  damageMultiplier: string;
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

function getTriangleVertices(cx: number, cy: number, radius: number): Point[] {
  return [0, 1, 2].map((i) => ({
    x: cx + radius * Math.cos((Math.PI * 2 * i) / 3 - Math.PI / 2),
    y: cy + radius * Math.sin((Math.PI * 2 * i) / 3 - Math.PI / 2),
  }));
}

function generateTrianglePoints(cx: number, cy: number, radius: number): Point[] {
  const points: Point[] = [];
  const numPoints = 180;
  for (let i = 0; i < numPoints; i++) {
    const cornerAngle = (Math.PI * 2 * (i % 3)) / 3 - Math.PI / 2;
    const nextCornerAngle = (Math.PI * 2 * ((i + 1) % 3)) / 3 - Math.PI / 2;

    const cornerX1 = cx + radius * Math.cos(cornerAngle);
    const cornerY1 = cy + radius * Math.sin(cornerAngle);

    const nextCornerX = cx + radius * Math.cos(nextCornerAngle);
    const nextCornerY = cy + radius * Math.sin(nextCornerAngle);

    const segmentProgress = (i % (numPoints / 3)) / (numPoints / 3);

    points.push({
      x: cornerX1 + (nextCornerX - cornerX1) * segmentProgress,
      y: cornerY1 + (nextCornerY - cornerY1) * segmentProgress,
    });
  }
  return points;
}

/** Check if user passed near all 3 triangle vertices (checkpoint system) */
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

export function calculateScore(
  userPath: Point[],
  canvasWidth: number,
  canvasHeight: number,
): ScoringResult {
  if (userPath.length < 10) {
    return { score: 0, rank: 'C', damageMultiplier: '0%' };
  }

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const radius = Math.min(canvasWidth, canvasHeight) * 0.35;
  const templatePoints = generateTrianglePoints(cx, cy, radius);
  const vertices = getTriangleVertices(cx, cy, radius);

  // 1. Accuracy: how close is the user path to the template?
  let totalError = 0;
  const maxAllowedError = radius * 0.3;
  for (const userPoint of userPath) {
    const d = minDistance(userPoint, templatePoints);
    totalError += Math.min(d, maxAllowedError);
  }
  const avgError = totalError / userPath.length;
  let accuracy = Math.max(0, 100 - (avgError / maxAllowedError) * 100);

  // 2. Checkpoint: did user pass near all 3 vertices?
  const vertexThreshold = radius * 0.25;
  const visitedVertices = checkVertexCheckpoints(userPath, vertices, vertexThreshold);
  const checkpointRatio = visitedVertices / vertices.length;

  // 3. Coverage: replaced bounding-box area with path length ratio
  const perimeter = radius * 3 * Math.sqrt(3); // equilateral triangle perimeter
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
