'use client';

/**
 * レイド魔法陣: 複数人の筆を重ねて描くキャンバス
 *
 * 描画を2層に分けている。
 *   確定層 … 描き終えたストロークを保持する。ストローク完了時にだけ描き込む
 *   ライブ層 … 表示用。毎フレーム確定層を転写し、その上に進行中の筆だけを描く
 *
 * 既存の単独プレイ（useMagicCircle）は毎フレーム全ストロークを描き直しているが、
 * 4人分の筆を重ねるとその方式では破綻するため、レイドでは層を分けている。
 */

import { useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import {
  RAID_CANVAS_SIZE,
  RAID_JITTER_BUFFER_MS,
  RAID_SEND_INTERVAL_MS,
} from '@/lib/raidConstants';
import { thinPoints, type RaidPoint } from '@/lib/raidProtocol';
import type { RaidPeer } from '@/lib/raidTypes';

/** 進行中のストローク（自分・他人共通） */
interface LiveStroke {
  strokeId: number;
  color: string;
  lineWidth: number;
  points: { x: number; y: number; visibleAt: number }[];
  ended: boolean;
}

export interface RaidCanvasHandle {
  /** 他の参加者から届いた点を取り込む */
  applyRemoteStroke: (peerId: string, strokeId: number, points: RaidPoint[]) => void;
  /** 他の参加者がひと筆描き終えた */
  applyRemoteStrokeEnd: (peerId: string, strokeId: number) => void;
  /** 参加者の描画をすべて消す */
  removePeer: (peerId: string) => void;
  /** 全員分の描画を消す */
  clear: () => void;
}

interface RaidCanvasProps {
  /** 自分を含む参加者一覧（色の割り当てに使う） */
  peers: RaidPeer[];
  selfId: string;
  onStroke: (strokeId: number, points: RaidPoint[]) => void;
  onStrokeEnd: (strokeId: number) => void;
  /** true の間は描画を受け付けない */
  disabled?: boolean;
  ref?: React.Ref<RaidCanvasHandle>;
}

const SELF_LINE_WIDTH = 4;
const PEER_LINE_WIDTH = 3;

/**
 * Catmull-Rom スプラインを3次ベジェに変換して滑らかに描く。
 * 20Hz + 間引きで届く点は粗いため、そのまま直線で結ぶとカクつく。
 */
function drawSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  color: string,
  lineWidth: number
): void {
  if (points.length < 2) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] ?? points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] ?? p2;
      ctx.bezierCurveTo(
        p1.x + (p2.x - p0.x) / 6,
        p1.y + (p2.y - p0.y) / 6,
        p2.x - (p3.x - p1.x) / 6,
        p2.y - (p3.y - p1.y) / 6,
        p2.x,
        p2.y
      );
    }
  }
  ctx.stroke();
}

export default function RaidCanvas({
  peers,
  selfId,
  onStroke,
  onStrokeEnd,
  disabled = false,
  ref,
}: RaidCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /** 確定層。DOM には追加しない */
  const committedRef = useRef<HTMLCanvasElement | null>(null);
  /** 参加者ID -> 進行中のストローク */
  const liveRef = useRef<Map<string, LiveStroke>>(new Map());
  /** 参加者ID -> 描画色 */
  const colorsRef = useRef<Map<string, string>>(new Map());

  const isDrawingRef = useRef(false);
  const strokeIdRef = useRef(0);
  const strokeStartedAtRef = useRef(0);
  /** まだ送信していない自分の点 */
  const pendingRef = useRef<RaidPoint[]>([]);
  const disabledRef = useRef(disabled);
  const onStrokeRef = useRef(onStroke);
  const onStrokeEndRef = useRef(onStrokeEnd);

  // ポインタ操作と描画ループから最新の props を参照するため ref に写す
  useEffect(() => {
    disabledRef.current = disabled;
    onStrokeRef.current = onStroke;
    onStrokeEndRef.current = onStrokeEnd;
  });

  useEffect(() => {
    colorsRef.current = new Map(peers.map((p) => [p.deviceId, p.color]));
  }, [peers]);

  /** 確定層を用意する（初回のみ生成） */
  const getCommitted = useCallback((): HTMLCanvasElement | null => {
    if (committedRef.current) return committedRef.current;
    if (typeof document === 'undefined') return null;
    const layer = document.createElement('canvas');
    layer.width = RAID_CANVAS_SIZE;
    layer.height = RAID_CANVAS_SIZE;
    committedRef.current = layer;
    return layer;
  }, []);

  /** 描き終えたストロークを確定層へ焼き付ける */
  const commitStroke = useCallback((stroke: LiveStroke) => {
    const layer = getCommitted();
    const ctx = layer?.getContext('2d');
    if (!ctx) return;
    drawSmoothPath(ctx, stroke.points, stroke.color, stroke.lineWidth);
  }, [getCommitted]);

  useImperativeHandle(ref, (): RaidCanvasHandle => ({
    applyRemoteStroke(peerId, strokeId, points) {
      // ジッタを吸収するため、受信した点は少し先の時刻から見えるようにする
      const visibleAt = Date.now() + RAID_JITTER_BUFFER_MS;
      const existing = liveRef.current.get(peerId);

      if (!existing || existing.strokeId !== strokeId) {
        // 前のストロークが終了通知を取りこぼしていた場合はここで確定させる
        if (existing) commitStroke(existing);
        liveRef.current.set(peerId, {
          strokeId,
          color: colorsRef.current.get(peerId) ?? '#ffffff',
          lineWidth: PEER_LINE_WIDTH,
          points: points.map((p) => ({ x: p.x, y: p.y, visibleAt })),
          ended: false,
        });
        return;
      }

      // 終了済みのストロークに遅れて届いた点は捨てる
      if (existing.ended) return;
      for (const p of points) existing.points.push({ x: p.x, y: p.y, visibleAt });
    },

    applyRemoteStrokeEnd(peerId, strokeId) {
      const existing = liveRef.current.get(peerId);
      if (!existing || existing.strokeId !== strokeId) return;
      existing.ended = true;
    },

    removePeer(peerId) {
      liveRef.current.delete(peerId);
    },

    clear() {
      liveRef.current.clear();
      const ctx = committedRef.current?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, RAID_CANVAS_SIZE, RAID_CANVAS_SIZE);
    },
  }), [commitStroke]);

  // 表示ループ: 確定層を転写してから進行中の筆を重ねる
  useEffect(() => {
    let frame = 0;

    const render = () => {
      frame = requestAnimationFrame(render);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, RAID_CANVAS_SIZE, RAID_CANVAS_SIZE);
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(0, 0, RAID_CANVAS_SIZE, RAID_CANVAS_SIZE);

      const committed = committedRef.current;
      if (committed) ctx.drawImage(committed, 0, 0);

      const now = Date.now();
      for (const [peerId, stroke] of liveRef.current) {
        const visible = stroke.points.filter((p) => p.visibleAt <= now);
        drawSmoothPath(ctx, visible, stroke.color, stroke.lineWidth);

        // 終了済みで、遅延分もすべて表示し終えたら確定層へ移す
        if (stroke.ended && visible.length === stroke.points.length) {
          commitStroke(stroke);
          liveRef.current.delete(peerId);
        }
      }
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [commitStroke]);

  // 自分の点を一定間隔でまとめて送る
  useEffect(() => {
    const timer = setInterval(() => {
      if (pendingRef.current.length === 0) return;
      const batch = thinPoints(pendingRef.current);
      pendingRef.current = [];
      onStrokeRef.current(strokeIdRef.current, batch);
    }, RAID_SEND_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  // ポインタ操作。既存モードと同様に canvas へ直接リスナを張る
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const toCanvasPos = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (RAID_CANVAS_SIZE / rect.width),
        y: (clientY - rect.top) * (RAID_CANVAS_SIZE / rect.height),
      };
    };

    const appendLocalPoint = (x: number, y: number) => {
      const t = performance.now() - strokeStartedAtRef.current;
      pendingRef.current.push({ x, y, t });

      const stroke = liveRef.current.get(selfId);
      if (stroke) stroke.points.push({ x, y, visibleAt: 0 });
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (disabledRef.current) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);

      isDrawingRef.current = true;
      strokeIdRef.current += 1;
      strokeStartedAtRef.current = performance.now();
      pendingRef.current = [];

      // 自分の筆は遅延なしで即座に見せる（visibleAt = 0）
      liveRef.current.set(selfId, {
        strokeId: strokeIdRef.current,
        color: colorsRef.current.get(selfId) ?? '#ffffff',
        lineWidth: SELF_LINE_WIDTH,
        points: [],
        ended: false,
      });

      const { x, y } = toCanvasPos(e.clientX, e.clientY);
      appendLocalPoint(x, y);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const { x, y } = toCanvasPos(e.clientX, e.clientY);
      appendLocalPoint(x, y);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      isDrawingRef.current = false;

      // 送り残した点を吐き出してから終了を伝える
      if (pendingRef.current.length > 0) {
        const batch = thinPoints(pendingRef.current);
        pendingRef.current = [];
        onStrokeRef.current(strokeIdRef.current, batch);
      }
      onStrokeEndRef.current(strokeIdRef.current);

      const stroke = liveRef.current.get(selfId);
      if (stroke) stroke.ended = true;
    };

    canvas.addEventListener('pointerdown', handlePointerDown, true);
    canvas.addEventListener('pointermove', handlePointerMove, true);
    canvas.addEventListener('pointerup', handlePointerUp, true);
    canvas.addEventListener('pointerleave', handlePointerUp, true);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown, true);
      canvas.removeEventListener('pointermove', handlePointerMove, true);
      canvas.removeEventListener('pointerup', handlePointerUp, true);
      canvas.removeEventListener('pointerleave', handlePointerUp, true);
    };
  }, [selfId]);

  return (
    <canvas
      ref={canvasRef}
      width={RAID_CANVAS_SIZE}
      height={RAID_CANVAS_SIZE}
      className="rounded-lg border-2 border-gray-700 w-full h-auto touch-none"
      style={{
        background: '#0a0a14',
        display: 'block',
        touchAction: 'none',
        cursor: disabled ? 'not-allowed' : 'crosshair',
      }}
    />
  );
}
