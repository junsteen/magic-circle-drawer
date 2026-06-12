'use client';

import { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import type { MagicCircleHistory } from '@/lib/types';
import type { MagicCirclePattern } from '@/lib/patterns';
import type { DrawEvent } from '@/lib/types';
import { compressForUrlOptimized as compressForUrl } from '@/lib/shareUtils';

// アニメーションスケジュールの要素型
type AnimElement =
  | { kind: 'circle'; cx: number; cy: number; radius: number; startTime: number; endTime: number }
  | { kind: 'edge'; x1: number; y1: number; x2: number; y2: number; startTime: number; endTime: number };

// drawLogsから全イベント配列を構築（totalDuration計算用）
function buildAllEventsFromLogs(
  drawLogs: MagicCircleHistory['data']['drawLogs'],
  strokeIntervalMs: number
): { events: DrawEvent[]; totalDuration: number } {
  const allEvents: DrawEvent[] = [];
  let timeOffset = 0;
  for (const stroke of drawLogs) {
    if (stroke.length === 0) continue;
    const t0 = stroke[0].t;
    for (const ev of stroke) {
      allEvents.push({ x: ev.x, y: ev.y, t: ev.t - t0 + timeOffset, type: ev.type });
    }
    if (allEvents.length > 0) {
      timeOffset = allEvents[allEvents.length - 1].t + strokeIntervalMs;
    }
  }
  const totalDuration = allEvents.length > 0 ? allEvents[allEvents.length - 1].t + strokeIntervalMs : 0;
  return { events: allEvents, totalDuration };
}

// パターン要素のアニメーションスケジュールを構築
function buildAnimSchedule(
  pattern: Pick<MagicCirclePattern, 'circles' | 'edges' | 'vertices'>,
  totalDuration: number,
  canvasSize: number
): AnimElement[] {
  const shapes: AnimElement[] = [];
  const allShapes = [
    ...pattern.circles.map(c => ({ kind: 'circle' as const, data: c })),
    ...pattern.edges.map(e => ({ kind: 'edge' as const, data: e })),
  ];
  const count = allShapes.length;
  if (count === 0) return [];
  const elemDuration = totalDuration / count;

  allShapes.forEach((shape, i) => {
    const startTime = i * elemDuration;
    const endTime = (i + 1) * elemDuration;
    if (shape.kind === 'circle') {
      shapes.push({
        kind: 'circle',
        cx: shape.data.cx * canvasSize,
        cy: shape.data.cy * canvasSize,
        radius: shape.data.radius,
        startTime,
        endTime,
      });
    } else {
      const a = pattern.vertices[shape.data.from];
      const b = pattern.vertices[shape.data.to];
      shapes.push({ kind: 'edge', x1: a.x, y1: a.y, x2: b.x, y2: b.y, startTime, endTime });
    }
  });
  return shapes;
}

// パターンを指定時刻まで描画し、描画中の先端座標を返す
function drawPatternAtTime(
  ctx: CanvasRenderingContext2D,
  schedule: AnimElement[],
  elapsed: number
): { x: number; y: number } | null {
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#00e5ff';

  let tip: { x: number; y: number } | null = null;

  for (const elem of schedule) {
    if (elapsed < elem.startTime) break;
    const progress = Math.min(1, (elapsed - elem.startTime) / (elem.endTime - elem.startTime));

    if (elem.kind === 'circle') {
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * progress;
      ctx.beginPath();
      ctx.arc(elem.cx, elem.cy, elem.radius, startAngle, endAngle);
      ctx.stroke();
      if (progress < 1) {
        tip = {
          x: elem.cx + elem.radius * Math.cos(endAngle),
          y: elem.cy + elem.radius * Math.sin(endAngle),
        };
      }
    } else {
      const endX = elem.x1 + (elem.x2 - elem.x1) * progress;
      const endY = elem.y1 + (elem.y2 - elem.y1) * progress;
      ctx.beginPath();
      ctx.moveTo(elem.x1, elem.y1);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      if (progress < 1) {
        tip = { x: endX, y: endY };
      }
    }
  }

  ctx.shadowBlur = 0;
  return tip;
}

// パターンを完全に描画（最終状態表示用）
function drawPatternFull(
  ctx: CanvasRenderingContext2D,
  pattern: Pick<MagicCirclePattern, 'circles' | 'edges' | 'vertices'>,
  canvasSize: number
) {
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#00e5ff';

  for (const circle of pattern.circles) {
    ctx.beginPath();
    ctx.arc(circle.cx * canvasSize, circle.cy * canvasSize, circle.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const edge of pattern.edges) {
    const a = pattern.vertices[edge.from];
    const b = pattern.vertices[edge.to];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
}

/**
 * 履歴詳細コンポーネントのプロパティ
 */
interface HistoryDetailProps {
  /** 表示する履歴データ（nullの場合は何も表示しない） */
  history: MagicCircleHistory | null;
  /** モーダルを閉じるコールバック関数 */
  onClose: () => void;
  /** 再編集を開始するコールバック関数 */
  onReEdit: (data: Pick<MagicCircleHistory, 'data'>) => void;
}

const CANVAS_SIZE = 350;

/**
 * 描画ストロークをリプレイ用に変換（相対タイムスタンプに変換）
 * @param strokes 履歴データの描画ログ
 * @returns 相対タイムスタンプに変換された描画イベントの配列
 */


/**
 * 履歴詳細モーダルコンポーネント
 * 選択された履歴の詳細情報を表示し、リプレイ再生、共有、再編集機能を提供
 * @param history - 表示する履歴データ
 * @param onClose - モーダルを閉じるコールバック関数
 * @param onReEdit - 再編集を開始するコールバック関数
 * @returns 履歴詳細モーダルのJSX要素
 */
export default function HistoryDetail({ history, onClose, onReEdit }: HistoryDetailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const replayAnimRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [debugMsg, setDebugMsg] = useState('');
  const canvasReadyRef = useRef(false);
  const animScheduleRef = useRef<AnimElement[]>([]);

  const drawTemplate = useCallback((pattern: Pick<MagicCirclePattern, 'circles' | 'edges' | 'vertices' | 'name'>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw circles
    for (const circle of pattern.circles) {
      ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(circle.cx * CANVAS_SIZE, circle.cy * CANVAS_SIZE, circle.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw edges
    ctx.strokeStyle = 'rgba(100, 100, 150, 0.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    for (const edge of pattern.edges) {
      const a = pattern.vertices[edge.from];
      const b = pattern.vertices[edge.to];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }, []);

  // Draw template AND stroke when history changes or canvas becomes available
  useLayoutEffect(() => {
    if (!history) return;
    canvasReadyRef.current = false;
  }, [history]);

  // Callback ref ensures we draw as soon as canvas is available
  const handleCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    if (node && history && !canvasReadyRef.current) {
      canvasReadyRef.current = true;
      if (!history.data?.drawLogs) return;
      drawTemplate(history.data.pattern);
      const ctx = node.getContext('2d');
      if (ctx) {
        drawPatternFull(ctx, history.data.pattern, CANVAS_SIZE);
      }
    }
  }, [history, drawTemplate]);

  // Cleanup replay animation on unmount
  useEffect(() => {
    return () => {
      if (replayAnimRef.current !== null) {
        cancelAnimationFrame(replayAnimRef.current);
        replayAnimRef.current = null;
      }
    };
  }, []);

  // history が変わるたびに再生状態をリセット（null → 別アイテムも含む）
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setTotalDuration(0);
    if (replayAnimRef.current !== null) {
      cancelAnimationFrame(replayAnimRef.current);
      replayAnimRef.current = null;
    }
  }, [history]);

  // Auto-play ref: always points to the latest handlePlay to avoid stale closure
  const handlePlayRef = useRef<() => void>(() => {});

  // Auto-play when a history item is opened
  useEffect(() => {
    if (!history?.data?.drawLogs?.length) return;
    // setTimeout(0) defers until after the reset effect and re-render settle
    const id = setTimeout(() => { handlePlayRef.current(); }, 0);
    return () => clearTimeout(id);
  }, [history]);

  const handlePlay = useCallback(() => {
    if (!history || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!history.data?.drawLogs) return;

    const STROKE_INTERVAL_MS = 500;
    const { totalDuration: dur } = buildAllEventsFromLogs(history.data.drawLogs, STROKE_INTERVAL_MS);
    if (dur === 0) return;
    setTotalDuration(dur);

    const schedule = buildAnimSchedule(history.data.pattern, dur, CANVAS_SIZE);
    animScheduleRef.current = schedule;

    // 再生完了後に再度押した場合は最初から再生する
    const startFrom = currentTime >= dur ? 0 : currentTime;
    if (startFrom === 0) setCurrentTime(0);
    const startTime = performance.now() - startFrom;
    setIsPlaying(true);
    setDebugMsg('🔄 再生中...');

    const animate = (now: number) => {
      const elapsed = now - startTime;
      setCurrentTime(Math.min(elapsed, dur));

      if (!history.data) return;
      drawTemplate(history.data.pattern);
      const tip = drawPatternAtTime(ctx, animScheduleRef.current, elapsed);

      // 描画中の先端グロー
      if (tip) {
        ctx.shadowBlur = 2;
        ctx.shadowColor = '#00e5ff';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 1;
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (elapsed >= dur) {
        drawTemplate(history.data.pattern);
        drawPatternFull(ctx, history.data.pattern, CANVAS_SIZE);
        setDebugMsg('🔄 リプレイ完了！');
        replayAnimRef.current = null;
        setIsPlaying(false);
        setCurrentTime(dur);
        return;
      }

      replayAnimRef.current = requestAnimationFrame(animate);
    };

    replayAnimRef.current = requestAnimationFrame(animate);
  }, [history, currentTime, drawTemplate]);

  // Keep ref in sync with latest handlePlay every render
  handlePlayRef.current = handlePlay;

  const handlePause = useCallback(() => {
    if (replayAnimRef.current !== null) {
      cancelAnimationFrame(replayAnimRef.current);
      replayAnimRef.current = null;
    }
    setIsPlaying(false);
    setDebugMsg('');
  }, []);

  const handleSeek = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(time, totalDuration));
    setCurrentTime(clampedTime);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !history?.data?.drawLogs) return;

    // スケジュールがなければ構築
    if (animScheduleRef.current.length === 0 && totalDuration > 0) {
      animScheduleRef.current = buildAnimSchedule(history.data.pattern, totalDuration, CANVAS_SIZE);
    }

    if (isPlaying) {
      if (replayAnimRef.current !== null) {
        cancelAnimationFrame(replayAnimRef.current);
        replayAnimRef.current = null;
      }

      const startTime = performance.now() - clampedTime;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        setCurrentTime(Math.min(elapsed, totalDuration));

        if (!history.data) return;
        drawTemplate(history.data.pattern);
        const tip = drawPatternAtTime(ctx, animScheduleRef.current, elapsed);

        if (tip) {
          ctx.shadowBlur = 2;
          ctx.shadowColor = '#00e5ff';
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 1;
          ctx.fillStyle = '#00e5ff';
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        if (elapsed >= totalDuration) {
          drawTemplate(history.data.pattern);
          drawPatternFull(ctx, history.data.pattern, CANVAS_SIZE);
          setDebugMsg('🔄 リプレイ完了！');
          replayAnimRef.current = null;
          setIsPlaying(false);
          setCurrentTime(totalDuration);
          return;
        }

        replayAnimRef.current = requestAnimationFrame(animate);
      };

      replayAnimRef.current = requestAnimationFrame(animate);
    } else {
      // 一時停止中にシークした場合、その時刻の状態を即時描画
      drawTemplate(history.data.pattern);
      drawPatternAtTime(ctx, animScheduleRef.current, clampedTime);
    }
  }, [history, isPlaying, totalDuration, drawTemplate]);

  const handleShare = useCallback(async () => {
    if (!history?.data?.drawLogs) return;
    try {
      const shareData = {
        pattern: history.data.pattern,
        drawLogs: history.data.drawLogs,
        score: history.score,
        rank: history.rank,
        difficulty: history.difficulty,
        difficultyMultiplier: history.difficultyMultiplier,
        damageMultiplier: history.damageMultiplier,
      };
      const compressed = compressForUrl(shareData);
      if (!compressed) throw new Error('Failed to compress data');
      const shareUrl = `${window.location.origin}/replay?data=${compressed}`;
      if (navigator.share) {
        await navigator.share({
          title: `Arcane Tracer - ${history.data.pattern.name}`,
          text: `私の魔法陣詠唱結果: ${history.rank}ランク (${history.score}点)`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setDebugMsg('📤 共有リンクをクリップボードにコピーしました！');
        setTimeout(() => setDebugMsg(''), 3000);
      }
    } catch (err) {
      console.error('Failed to share:', err);
      setDebugMsg('共有に失敗しました');
      setTimeout(() => setDebugMsg(''), 3000);
    }
  }, [history]);

  if (!history) return null;

  const getRankColor = (rank: string): string => {
    switch (rank) {
      case 'S': return '#ffd700';
      case 'A': return '#00e5ff';
      case 'B': return '#76ff03';
      default: return '#ff4081';
    }
  };

  const formatDate = (ts: number): string => {
    // 秒単位（10 桁）の場合はミリ秒に変換、ミリ秒単位（13 桁以上）はそのまま使用
    const tsMs = ts < 1e12 ? ts * 1000 : ts;
    const d = new Date(tsMs);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${date} ${hours}:${minutes}:${seconds}`;
  };

  const formatTime = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${s}:${String(cs).padStart(2, '0')}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      {/* Modal */}
      <div
        className="fixed inset-4 z-50 flex flex-col overflow-auto rounded-2xl"
        style={{ background: '#0d0d1a', border: '1px solid rgba(0,229,255,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h2 className="text-lg font-bold" style={{ color: '#00e5ff' }}>📜 履歴詳細</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4 sm:flex-row">
          {/* Canvas Area */}
          <div className="flex w-full flex-col items-center sm:w-1/2">
            {/* Canvasとオーバーレイのラッパー */}
            <div className="relative w-full max-w-[350px]">
              <canvas
                ref={handleCanvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="w-full rounded-lg border-2 border-gray-700 block"
                style={{ background: '#0a0a14' }}
              />

              {/* 中央の再生/停止オーバーレイ */}
              <button
                className="absolute inset-0 flex items-center justify-center cursor-pointer rounded-lg"
                onClick={() => isPlaying ? handlePause() : handlePlay()}
                aria-label={isPlaying ? '⏹️ 停止' : '▶️ 再生'}
                disabled={!history.data?.drawLogs?.length}
                style={{
                  background: isPlaying ? 'transparent' : 'rgba(0,0,0,0.15)',
                  border: 'none',
                  padding: 0,
                }}
              >
                {!isPlaying && !!history.data?.drawLogs?.length && (
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 64,
                      height: 64,
                      background: 'rgba(0,0,0,0.65)',
                      border: '2px solid rgba(0,229,255,0.6)',
                      boxShadow: '0 0 20px rgba(0,229,255,0.3)',
                    }}
                  >
                    <div style={{
                      width: 0,
                      height: 0,
                      borderTop: '12px solid transparent',
                      borderBottom: '12px solid transparent',
                      borderLeft: '20px solid #00e5ff',
                      marginLeft: 6,
                    }} />
                  </div>
                )}
              </button>

              {/* 共有ボタン（右上オーバーレイ） */}
              <button
                onClick={handleShare}
                aria-label="共有"
                className="absolute top-2 right-2 flex items-center justify-center rounded-full text-sm transition-opacity hover:opacity-80"
                style={{
                  width: 32,
                  height: 32,
                  background: 'rgba(0,0,0,0.65)',
                  border: '1px solid rgba(0,229,255,0.4)',
                  color: '#00e5ff',
                }}
              >
                📤
              </button>

              {/* 下部シークバーオーバーレイ */}
              {totalDuration > 0 && (
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-b-lg px-3 pb-2 pt-6"
                  style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}
                >
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(totalDuration)}</span>
                  </div>
                  <div className="relative">
                    <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(currentTime / totalDuration) * 100}%`,
                          background: '#00e5ff',
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={totalDuration}
                      value={currentTime}
                      onChange={(e) => {
                        const time = parseFloat(e.target.value);
                        setCurrentTime(time);
                        handleSeek(time);
                      }}
                      className="absolute w-full cursor-pointer opacity-0"
                      style={{ height: 16, top: -7, left: 0 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Debug / Status */}
            {debugMsg && (
              <div className="mt-2 rounded-lg bg-black/80 px-3 py-1 text-center text-xs font-mono text-green-400">
                {debugMsg}
              </div>
            )}
          </div>

          {/* Info Area */}
          <div className="w-full sm:w-1/2">
            {/* Result Summary */}
            <div
              className="mb-4 rounded-lg p-4 text-center"
              style={{ background: 'rgba(124, 77, 255, 0.1)', border: '1px solid rgba(124, 77, 255, 0.3)' }}
            >
              <div className="text-5xl font-bold" style={{ color: getRankColor(history.rank) }}>
                {history.rank}
              </div>
              <div className="mt-1 text-xl" style={{ color: '#7c4dff' }}>
                {history.score}点
              </div>
              <div className="mt-1 text-sm text-gray-400">
                難易度: {history.difficulty} (×{history.difficultyMultiplier})
              </div>
              <div className="mt-1 text-sm text-gray-400">
                威力: {history.damageMultiplier}
              </div>
            </div>

            {/* Pattern Info */}
            <div className="mb-4">
              <div className="text-sm text-gray-500">魔法陣</div>
              <div className="text-base font-bold" style={{ color: '#00e5ff' }}>
                {history.data.pattern.name}
              </div>
              <div className="text-xs text-gray-600">
                {history.data.drawLogs ? history.data.drawLogs.length : 0}ストローク
              </div>
            </div>

            {/* Timestamp */}
            <div className="mb-4">
              <div className="text-sm text-gray-500">作成日時</div>
              <div className="text-sm" style={{ color: '#9c9caf' }}>
                {history.createdAt ? formatDate(history.createdAt) : '日時不明'}
              </div>
            </div>

            {/* Re-edit Button */}
            <button
              onClick={() => onReEdit({ data: history.data })}
              className="cursor-pointer rounded-lg px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-105 active:scale-95 w-full"
              style={{ background: 'linear-gradient(135deg, #76ff03, #00e5ff)' }}
            >
              ✏️ この履歴で再編集
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
