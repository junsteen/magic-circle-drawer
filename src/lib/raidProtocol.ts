/**
 * レイド魔法陣: DataChannel 上を流れるメッセージの定義と間引き処理
 *
 * Phase 1 は可読性を優先して JSON で送る（4人でも上り下り各 100kbps 程度で収まる）。
 * バイナリ化は Phase 3 の課題。
 */

import {
  RAID_MAX_POINTS_PER_MSG,
  RAID_THIN_ANGLE_DEG,
  RAID_THIN_DISTANCE_PX,
} from './raidConstants';

/** 送受信する1点 */
export interface RaidPoint {
  x: number;
  y: number;
  /** ストローク開始からの経過ミリ秒 */
  t: number;
}

/** DataChannel を流れるメッセージ */
export type RaidMessage =
  | { kind: 'stroke'; strokeId: number; points: RaidPoint[] }
  | { kind: 'strokeEnd'; strokeId: number }
  | { kind: 'ping'; pingId: number; sentAt: number }
  | { kind: 'pong'; pingId: number; sentAt: number; repliedAt: number }
  | { kind: 'hello'; name: string }
  | { kind: 'bye' };

const THIN_ANGLE_RAD = (RAID_THIN_ANGLE_DEG * Math.PI) / 180;

/** 角度差を -π〜π に収める */
function normalizeAngle(radian: number): number {
  let a = radian;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** 点列を等間隔に間引いて指定数まで減らす（始点と終点は必ず残す） */
function decimate(points: RaidPoint[], maxPoints: number): RaidPoint[] {
  if (points.length <= maxPoints) return points;
  if (maxPoints <= 2) return [points[0], points[points.length - 1]];

  const result: RaidPoint[] = [points[0]];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let i = 1; i < maxPoints - 1; i++) {
    result.push(points[Math.round(i * step)]);
  }
  result.push(points[points.length - 1]);
  return result;
}

/**
 * 送信前に点列を間引く。
 *
 * 直前に採用した点からの移動距離が小さく、かつ進行方向もほとんど変わっていない点を捨てる。
 * 直線部分は大きく削られ、カーブは形が保たれる。始点と終点は常に残す。
 */
export function thinPoints(
  points: RaidPoint[],
  maxPoints: number = RAID_MAX_POINTS_PER_MSG
): RaidPoint[] {
  if (points.length <= 2) return [...points];

  const kept: RaidPoint[] = [points[0]];
  let lastAngle: number | null = null;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = kept[kept.length - 1];
    const dx = points[i].x - prev.x;
    const dy = points[i].y - prev.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) continue;

    const angle = Math.atan2(dy, dx);
    const turned = lastAngle === null
      ? Infinity
      : Math.abs(normalizeAngle(angle - lastAngle));

    if (distance >= RAID_THIN_DISTANCE_PX || turned >= THIN_ANGLE_RAD) {
      kept.push(points[i]);
      lastAngle = angle;
    }
  }

  kept.push(points[points.length - 1]);
  return decimate(kept, maxPoints);
}

/** メッセージを DataChannel に流せる文字列にする */
export function serializeRaidMessage(message: RaidMessage): string {
  return JSON.stringify(message);
}

function isRaidPoint(value: unknown): value is RaidPoint {
  if (typeof value !== 'object' || value === null) return false;
  const { x, y, t } = value as { x?: unknown; y?: unknown; t?: unknown };
  return (
    typeof x === 'number' && Number.isFinite(x) &&
    typeof y === 'number' && Number.isFinite(y) &&
    typeof t === 'number' && Number.isFinite(t)
  );
}

/**
 * 受信文字列をメッセージに戻す。
 * 壊れた入力や未知の種別は null を返す（相手の実装バージョン違いで落ちないため）。
 */
export function parseRaidMessage(raw: string): RaidMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;

  const msg = parsed as Record<string, unknown>;
  switch (msg.kind) {
    case 'stroke': {
      if (typeof msg.strokeId !== 'number' || !Array.isArray(msg.points)) return null;
      if (!msg.points.every(isRaidPoint)) return null;
      return { kind: 'stroke', strokeId: msg.strokeId, points: msg.points };
    }
    case 'strokeEnd': {
      if (typeof msg.strokeId !== 'number') return null;
      return { kind: 'strokeEnd', strokeId: msg.strokeId };
    }
    case 'ping': {
      if (typeof msg.pingId !== 'number' || typeof msg.sentAt !== 'number') return null;
      return { kind: 'ping', pingId: msg.pingId, sentAt: msg.sentAt };
    }
    case 'pong': {
      if (
        typeof msg.pingId !== 'number' ||
        typeof msg.sentAt !== 'number' ||
        typeof msg.repliedAt !== 'number'
      ) return null;
      return { kind: 'pong', pingId: msg.pingId, sentAt: msg.sentAt, repliedAt: msg.repliedAt };
    }
    case 'hello': {
      if (typeof msg.name !== 'string') return null;
      return { kind: 'hello', name: msg.name };
    }
    case 'bye':
      return { kind: 'bye' };
    default:
      return null;
  }
}
