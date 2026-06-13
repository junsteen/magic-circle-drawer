'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';
import type { DrawStroke } from '@/lib/types';

const CANVAS_SIZE = 350;
const FADE_DURATION_MS = 1000; // 10ステップ × 100ms = 1秒でフェードアウト
const INTER_ROUND_DELAY_MS = 400;

export interface ReplayRound {
  drawLogs: DrawStroke[];
  patternName: string;
  rank: string;
  score: number;
}

interface Props {
  rounds: ReplayRound[];
  onClose: () => void;
}

interface CompletedLayer {
  strokes: DrawStroke[]; // 相対タイムスタンプ済み
  fadeStartTime: number;
}

type AnimState =
  | { phase: 'animating'; roundIndex: number; startTime: number }
  | { phase: 'waiting'; nextRoundIndex: number; waitUntil: number }
  | { phase: 'done' };

function relativizeStrokes(strokes: DrawStroke[]): DrawStroke[] {
  const all = strokes.flat();
  if (all.length === 0) return strokes;
  const t0 = all.reduce((min, e) => Math.min(min, e.t), Infinity);
  return strokes.map(s => s.map(e => ({ ...e, t: e.t - t0 })));
}

function getMaxT(strokes: DrawStroke[]): number {
  let max = 0;
  for (const stroke of strokes) {
    for (const e of stroke) {
      if (e.t > max) max = e.t;
    }
  }
  return max;
}

export default function MultiModeReplay({ rounds, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const animStateRef = useRef<AnimState>({ phase: 'animating', roundIndex: 0, startTime: 0 });
  const completedLayersRef = useRef<CompletedLayer[]>([]);
  const relRoundsRef = useRef<DrawStroke[][]>([]);

  // 有効なラウンド（描画データあり）だけを対象にする
  const validRounds = useMemo(
    () => rounds.filter(r => r.drawLogs.length > 0 && r.drawLogs.some(s => s.length > 0)),
    [rounds]
  );

  useEffect(() => {
    relRoundsRef.current = validRounds.map(r => relativizeStrokes(r.drawLogs));
  }, [validRounds]);

  const drawStrokes = useCallback((
    ctx: CanvasRenderingContext2D,
    strokes: DrawStroke[],
    elapsed: number,
    alpha: number,
  ) => {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokes) {
      if (stroke.length === 0) continue;
      ctx.beginPath();
      let started = false;
      for (const event of stroke) {
        if (event.t > elapsed) break;
        if (!started) {
          ctx.moveTo(event.x, event.y);
          started = true;
        } else {
          ctx.lineTo(event.x, event.y);
        }
      }
      if (started) ctx.stroke();
    }
    ctx.restore();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || validRounds.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    completedLayersRef.current = [];
    const now = performance.now();
    animStateRef.current = { phase: 'animating', roundIndex: 0, startTime: now };

    const tick = (ts: number) => {
      const state = animStateRef.current;

      // ステートマシン遷移
      if (state.phase === 'animating') {
        const relStrokes = relRoundsRef.current[state.roundIndex];
        if (relStrokes) {
          const maxT = getMaxT(relStrokes);
          const elapsed = ts - state.startTime;
          if (elapsed >= maxT + 200) {
            completedLayersRef.current.push({ strokes: relStrokes, fadeStartTime: ts });
            const nextIndex = state.roundIndex + 1;
            if (nextIndex >= validRounds.length) {
              animStateRef.current = { phase: 'done' };
            } else {
              animStateRef.current = {
                phase: 'waiting',
                nextRoundIndex: nextIndex,
                waitUntil: ts + INTER_ROUND_DELAY_MS,
              };
            }
          }
        } else {
          animStateRef.current = { phase: 'done' };
        }
      } else if (state.phase === 'waiting') {
        if (ts >= state.waitUntil) {
          animStateRef.current = {
            phase: 'animating',
            roundIndex: state.nextRoundIndex,
            startTime: ts,
          };
        }
      }

      // 描画
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // 完了済みレイヤーをフェードしながら描画
      for (const layer of completedLayersRef.current) {
        const progress = (ts - layer.fadeStartTime) / FADE_DURATION_MS;
        // 10%ステップで不透明度を下げる (1.0 → 0.9 → ... → 0.0)
        const step = Math.ceil(Math.min(progress, 1) * 10);
        const alpha = Math.max(0, (10 - step) / 10);
        drawStrokes(ctx, layer.strokes, Infinity, alpha);
      }

      // 現在アニメーション中のラウンドを描画
      const cur = animStateRef.current;
      if (cur.phase === 'animating') {
        const relStrokes = relRoundsRef.current[cur.roundIndex];
        if (relStrokes) {
          drawStrokes(ctx, relStrokes, ts - cur.startTime, 1.0);
        }
      }

      // 全て完了 & フェード終了したらループ終了
      const allFaded = completedLayersRef.current.every(
        l => ts - l.fadeStartTime >= FADE_DURATION_MS
      );
      if (animStateRef.current.phase !== 'done' || !allFaded) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [validRounds, drawStrokes]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(13,13,26,0.97)' }}
    >
      <div className="flex flex-col items-center gap-4 p-6 max-w-sm w-full">
        <h2 className="text-xl font-bold" style={{ color: '#00e5ff' }}>
          🎬 マルチモード リプレイ
        </h2>
        <p className="text-sm text-gray-400">
          {validRounds.length}枚の魔法陣
        </p>

        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="rounded-lg border-2 border-gray-700 w-full max-w-[350px]"
          style={{ background: '#0a0a14' }}
        />

        <div className="w-full space-y-1 max-h-32 overflow-y-auto">
          {validRounds.map((r, i) => (
            <div key={i} className="flex justify-between text-xs px-2">
              <span className="text-gray-400">
                {i + 1}. {r.patternName}
              </span>
              <span className="font-bold" style={{
                color: r.rank === 'S' ? '#ffd700' : r.rank === 'A' ? '#00e5ff' : r.rank === 'B' ? '#76ff03' : '#aaaaaa'
              }}>
                {r.rank} {r.score}点
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full px-8 py-3 rounded-lg font-bold text-black transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #7c4dff, #00e5ff)' }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
