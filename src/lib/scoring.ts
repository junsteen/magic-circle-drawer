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

function generateTrianglePoints(cx: number, cy: number, radius: number): Point[] {
  const points: Point[] = [];
  const numPoints = 180;
  for (let i = 0; i < numPoints; i++) {
    const angle = (Math.PI * 2 * i) / numPoints - Math.PI / 2;
    const cornerAngle = (Math.PI * 2 * (i % 3)) / 3 - Math.PI / 2;
    const nextCornerAngle = (Math.PI * 2 * ((i + 1) % 3)) / 3 - Math.PI / 2;

    const cornerX1 = cx + radius * Math.cos(cornerAngle);
    const cornerY1 = cy + radius * Math.sin(cornerAngle);

    const currentAngle = (Math.PI * 2 * i) / numPoints;
    const segmentIndex = Math.floor(i / (numPoints / 3));
    const segmentProgress = (i % (numPoints / 3)) / (numPoints / 3);

    const nextSegmentIndex = (segmentIndex + 1) % 3;
    const nextCornerX = cx + radius * Math.cos((Math.PI * 2 * nextSegmentIndex) / 3 - Math.PI / 2);
    const nextCornerY = cy + radius * Math.sin((Math.PI * 2 * nextSegmentIndex) / 3 - Math.PI / 2);

    points.push({
      x: cornerX1 + (nextCornerX - cornerX1) * segmentProgress,
      y: cornerY1 + (nextCornerY - cornerY1) * segmentProgress,
    });
  }
  return points;
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

  let totalError = 0;
  const maxAllowedError = radius * 0.3;

  for (const userPoint of userPath) {
    const d = minDistance(userPoint, templatePoints);
    totalError += Math.min(d, maxAllowedError);
  }

  const avgError = totalError / userPath.length;
  let accuracy = Math.max(0, 100 - (avgError / maxAllowedError) * 100);

  const templateArea = Math.PI * radius * radius;
  const pathSpread = calculatePathSpread(userPath);
  const coverageRatio = Math.min(pathSpread / templateArea, 1);

  let score = accuracy * 0.7 + coverageRatio * 30;
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

function calculatePathSpread(path: Point[]): number {
  if (path.length < 2) return 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of path) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return (maxX - minX) * (maxY - minY);
}
