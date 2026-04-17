import type { Point, MagicCirclePattern } from './patterns';

/**
 * スコアリング結果のインターフェース
 */
export interface ScoringResult {
  /** 総合スコア (0-100) */
  score: number;
  /** ランク (S/A/B/C) */
  rank: string;
  /** ダメージ倍率 (例: '120%') */
  damageMultiplier: string;
  /** 難易度倍率 (オプション) */
  difficultyMultiplier?: number;
}

/**
 * 2点間のユークリッド距離を計算
 * @param a 点A
 * @param b 点B
 * @returns 2点間の距離
 */
function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * 点と点群のうち最も近い点までの距離を取得
 * @param point 基準点
 * @param targets 対象点群
 * @returns 最小距離
 */
function minDistance(point: Point, targets: Point[]): number {
  let min = Infinity;
  for (const t of targets) {
    const d = distance(point, t);
    if (d < min) min = d;
  }
  return min;
}

/**
 * ユーザーがパターンのすべての頂点付近を通過したかチェック
 * @param userPath ユーザーの描画軌跡
 * @param vertices パターンの頂点リスト
 * @param threshold 頂点到達判定の閾値（ピクセル）
 * @returns 到達した頂点数
 */
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

/**
 * テンプレートパス上の全サンプル点を生成
 * @param pattern 魔法陣パターン
 * @param pointsPerEdge 1辺あたりのサンプル点数（デフォルト: 30）
 * @returns 生成されたテンプレート点群
 */
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

/**
 * パターンのおおよその周長を計算
 * @param pattern 魔法陣パターン
 * @returns 推定周長（ピクセル）
 */
function estimatePatternPerimeter(pattern: MagicCirclePattern): number {
  let total = 0;
  for (const edge of pattern.edges) {
    const a = pattern.vertices[edge.from];
    const b = pattern.vertices[edge.to];
    total += distance(a, b);
  }
  return total;
}

/**
 * ユーザーの描画軌跡からスコアを計算
 * @param userPath ユーザーの描画軌跡点群
 * @param pattern 対象の魔法陣パターン
 * @param difficultyTolerance 難易度による許容誤差倍率（デフォルト: 1.0）
 * @returns スコアリング結果オブジェクト
 */
export function calculateScore(
  userPath: Point[],
  pattern: MagicCirclePattern,
  difficultyTolerance = 1.0,
): ScoringResult {
  // 最低限の描画点数チェック
  if (userPath.length < 10) {
    return { score: 0, rank: 'C', damageMultiplier: '0%' };
  }

  // テンプレート点と頂点、周長を取得
  const templatePoints = getTemplatePoints(pattern);
  const vertices = pattern.vertices;
  const perimeter = estimatePatternPerimeter(pattern);
  
  // 難易度に応じた閾値を計算
  const baseTolerance = 25; // 基本頂点チェック閾値（ピクセル）
  const vertexThreshold = baseTolerance * difficultyTolerance;
  const maxAllowedError = 40 * difficultyTolerance; // 基本精度閾値（ピクセル）

  // 1. 精度: ユーザーパスがテンプレートにどれだけ近いか？
  let totalError = 0;
  for (const userPoint of userPath) {
    const d = minDistance(userPoint, templatePoints);
    totalError += Math.min(d, maxAllowedError);
  }
  const avgError = totalError / userPath.length;
  let accuracy = Math.max(0, 100 - (avgError / maxAllowedError) * 100);

  // 2. チェックポイント: ユーザーがすべての頂点付近を通過したか？
  // 性能問題を避けるため円など多頂点の場合はサンプリング
  const maxCheckpointVertices = Math.min(vertices.length, 20);
  const sampledVertices = vertices.filter((_, i) => i % Math.max(1, Math.floor(vertices.length / maxCheckpointVertices)) === 0);
  const visitedVertices = checkVertexCheckpoints(userPath, sampledVertices, vertexThreshold);
  const checkedCount = Math.min(sampledVertices.length, vertices.length);
  const checkpointRatio = visitedVertices / checkedCount;

  // 3. カバレッジ: パス長比率
  let totalPathLength = 0;
  for (let i = 1; i < userPath.length; i++) {
    totalPathLength += distance(userPath[i - 1], userPath[i]);
  }
  // パス長が周長の1.5倍を超えたら1.5でクリップ（オーバードロー防止）
  const lengthRatio = Math.min(totalPathLength / perimeter, 1.5) / 1.5;

  // スコア計算: 精度50%、チェックポイント30%、パス長20%
  let score = accuracy * 0.5 + checkpointRatio * 100 * 0.3 + lengthRatio * 100 * 0.2;
  score = Math.min(100, Math.max(0, score));

  const roundedScore = Math.round(score);

  // ランクとダメージ倍率を決定
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
