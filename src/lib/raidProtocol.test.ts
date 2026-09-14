import { describe, it, expect } from 'vitest';
import {
  parseRaidMessage,
  serializeRaidMessage,
  thinPoints,
  type RaidMessage,
  type RaidPoint,
} from './raidProtocol';

/** 指定した2点間を等間隔に刻んだ点列を作る */
function line(from: RaidPoint, to: RaidPoint, steps: number): RaidPoint[] {
  const points: RaidPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const r = i / steps;
    points.push({
      x: from.x + (to.x - from.x) * r,
      y: from.y + (to.y - from.y) * r,
      t: from.t + (to.t - from.t) * r,
    });
  }
  return points;
}

describe('thinPoints', () => {
  // ─── 基本動作 ───────────────────────────────────────────────────────────────
  describe('基本動作', () => {
    it('点が2つ以下ならそのまま返す', () => {
      const two: RaidPoint[] = [
        { x: 0, y: 0, t: 0 },
        { x: 1, y: 1, t: 10 },
      ];
      expect(thinPoints(two)).toEqual(two);
      expect(thinPoints([two[0]])).toEqual([two[0]]);
      expect(thinPoints([])).toEqual([]);
    });

    it('始点と終点は必ず残る', () => {
      const points = line({ x: 0, y: 0, t: 0 }, { x: 100, y: 0, t: 500 }, 100);
      const result = thinPoints(points, 8);
      expect(result[0]).toEqual(points[0]);
      expect(result[result.length - 1]).toEqual(points[points.length - 1]);
    });

    it('指定した最大点数を超えない', () => {
      const points = line({ x: 0, y: 0, t: 0 }, { x: 300, y: 300, t: 1000 }, 200);
      expect(thinPoints(points, 8).length).toBeLessThanOrEqual(8);
      expect(thinPoints(points, 3).length).toBeLessThanOrEqual(3);
    });
  });

  // ─── 間引きの質 ─────────────────────────────────────────────────────────────
  describe('間引きの質', () => {
    it('直線上の細かい点は大きく削られる', () => {
      // 1px 刻みの直線。閾値 2px 未満かつ方向変化なしの点は捨てられる
      const points = line({ x: 0, y: 0, t: 0 }, { x: 100, y: 0, t: 500 }, 100);
      const result = thinPoints(points, 1000);
      expect(result.length).toBeLessThan(points.length * 0.6);
    });

    it('方向が激しく変わる点列は距離が短くても多くの点が残る', () => {
      // ジグザグ。隣接距離は約1.4pxで閾値未満だが、方向は毎点90度変わる
      const zigzag: RaidPoint[] = [];
      for (let i = 0; i <= 20; i++) {
        zigzag.push({ x: i, y: i % 2 === 0 ? 0 : 1, t: i * 10 });
      }
      const straight = line({ x: 0, y: 0, t: 0 }, { x: 20, y: 0, t: 200 }, 20);

      expect(thinPoints(zigzag, 1000).length)
        .toBeGreaterThan(thinPoints(straight, 1000).length);
    });

    it('同じ座標が続いても壊れない', () => {
      const points: RaidPoint[] = [
        { x: 5, y: 5, t: 0 },
        { x: 5, y: 5, t: 10 },
        { x: 5, y: 5, t: 20 },
        { x: 5, y: 5, t: 30 },
      ];
      const result = thinPoints(points);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0]).toEqual(points[0]);
    });
  });
});

describe('serializeRaidMessage / parseRaidMessage', () => {
  // ─── 往復一致 ───────────────────────────────────────────────────────────────
  describe('往復一致', () => {
    const cases: RaidMessage[] = [
      {
        kind: 'stroke',
        strokeId: 3,
        points: [
          { x: 1.5, y: 2.5, t: 0 },
          { x: 10, y: 20, t: 50 },
        ],
      },
      { kind: 'strokeEnd', strokeId: 3 },
      { kind: 'ping', pingId: 7, sentAt: 1234 },
      { kind: 'pong', pingId: 7, sentAt: 1234, repliedAt: 1250 },
      { kind: 'hello', name: '術士A' },
      { kind: 'bye' },
    ];

    for (const message of cases) {
      it(`${message.kind} を変換して元に戻せる`, () => {
        const restored = parseRaidMessage(serializeRaidMessage(message));
        expect(restored).toEqual(message);
      });
    }
  });

  // ─── 異常入力 ───────────────────────────────────────────────────────────────
  describe('異常入力', () => {
    it('JSONとして壊れていれば null を返す', () => {
      expect(parseRaidMessage('{')).toBeNull();
      expect(parseRaidMessage('')).toBeNull();
    });

    it('オブジェクト以外なら null を返す', () => {
      expect(parseRaidMessage('42')).toBeNull();
      expect(parseRaidMessage('null')).toBeNull();
      expect(parseRaidMessage('"stroke"')).toBeNull();
    });

    it('未知の種別なら null を返す', () => {
      expect(parseRaidMessage(JSON.stringify({ kind: 'attack' }))).toBeNull();
      expect(parseRaidMessage(JSON.stringify({ foo: 1 }))).toBeNull();
    });

    it('必須フィールドの型が違えば null を返す', () => {
      expect(parseRaidMessage(JSON.stringify({ kind: 'strokeEnd', strokeId: '3' }))).toBeNull();
      expect(parseRaidMessage(JSON.stringify({ kind: 'ping', pingId: 1 }))).toBeNull();
      expect(parseRaidMessage(JSON.stringify({ kind: 'hello' }))).toBeNull();
    });

    it('座標に数値でない値が混ざっていれば null を返す', () => {
      const broken = JSON.stringify({
        kind: 'stroke',
        strokeId: 1,
        points: [{ x: 1, y: 2, t: 3 }, { x: 'a', y: 2, t: 3 }],
      });
      expect(parseRaidMessage(broken)).toBeNull();
    });

    it('座標に NaN や Infinity が入っていれば null を返す', () => {
      // JSON では NaN / Infinity は null になるため、その形を直接検証する
      const broken = '{"kind":"stroke","strokeId":1,"points":[{"x":null,"y":2,"t":3}]}';
      expect(parseRaidMessage(broken)).toBeNull();
    });
  });
});
