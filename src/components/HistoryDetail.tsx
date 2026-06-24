'use client';

import { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import type { MagicCircleHistory } from '@/lib/types';
import type { MagicCirclePattern } from '@/lib/patterns';
import { getOuterCircle } from '@/lib/patterns';
import { getRankColor } from '@/lib/scoring';
import type { DrawEvent } from '@/lib/types';
import { compressForUrlOptimized as compressForUrl } from '@/lib/shareUtils';
import { ShareModal } from '@/components/ShareModal';

// drawLogsから全イベント配列を構築（タイミング計算用）
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

// ユーザーストロークをキャンバスに描画（ストローク間を繋げない）
function drawStrokesOnCanvas(ctx: CanvasRenderingContext2D, events: DrawEvent[]) {
  if (events.length < 1) return;

  ctx.shadowBlur = 2;
  ctx.shadowColor = '#00e5ff';
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let currentStroke: { x: number; y: number }[] = [];
  for (const ev of events) {
    if (ev.type === 'start') {
      if (currentStroke.length > 0) {
        ctx.beginPath();
        ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
        for (let i = 1; i < currentStroke.length; i++) ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
        ctx.stroke();
      }
      currentStroke = [{ x: ev.x, y: ev.y }];
    } else if (ev.type === 'move') {
      currentStroke.push({ x: ev.x, y: ev.y });
    } else if (ev.type === 'end') {
      currentStroke.push({ x: ev.x, y: ev.y });
      if (currentStroke.length > 1) {
        ctx.beginPath();
        ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
        for (let i = 1; i < currentStroke.length; i++) ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
        ctx.stroke();
      }
      currentStroke = [];
    }
  }
  if (currentStroke.length > 1) {
    ctx.beginPath();
    ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
    for (let i = 1; i < currentStroke.length; i++) ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

// 外周円を progress (0-1) まで弧として描画し、先端座標を返す
function drawOuterCircleArc(
  ctx: CanvasRenderingContext2D,
  pattern: Pick<MagicCirclePattern, 'circles' | 'edges' | 'vertices'>,
  progress: number,
  canvasSize: number
): { x: number; y: number } | null {
  if (progress <= 0) return null;
  const { cx, cy, radius } = getOuterCircle(pattern as MagicCirclePattern, canvasSize);
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.PI * 2 * Math.min(1, progress);

  ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#00e5ff';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (progress < 1) {
    return { x: cx + radius * Math.cos(endAngle), y: cy + radius * Math.sin(endAngle) };
  }
  return null;
}

// drawLogsから全イベント配列を構築（タイミング計算用）
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

// ユーザーストロークをキャンバスに描画（ストローク間を繋げない）
function drawStrokesOnCanvas(ctx: CanvasRenderingContext2D, events: DrawEvent[]) {
  if (events.length < 1) return;

  ctx.shadowBlur = 2;
  ctx.shadowColor = '#00e5ff';
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let currentStroke: { x: number; y: number }[] = [];
  for (const ev of events) {
    if (ev.type === 'start') {
      if (currentStroke.length > 0) {
        ctx.beginPath();
        ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
        for (let i = 1; i < currentStroke.length; i++) ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
        ctx.stroke();
      }
      currentStroke = [{ x: ev.x, y: ev.y }];
    } else if (ev.type === 'move') {
      currentStroke.push({ x: ev.x, y: ev.y });
    } else if (ev.type === 'end') {
      currentStroke.push({ x: ev.x, y: ev.y });
      if (currentStroke.length > 1) {
        ctx.beginPath();
        ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
        for (let i = 1; i < currentStroke.length; i++) ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
        ctx.stroke();
      }
      currentStroke = [];
    }
  }
  if (currentStroke.length > 1) {
    ctx.beginPath();
    ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
    for (let i = 1; i < currentStroke.length; i++) ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

// 外周円を progress (0-1) まで弧として描画し、先端座標を返す
function drawOuterCircleArc(
  ctx: CanvasRenderingContext2D,
  pattern: Pick<MagicCirclePattern, 'circles' | 'edges' | 'vertices'>,
  progress: number,
  canvasSize: number
): { x: number; y: number } | null {
  if (progress <= 0) return null;
  const { cx, cy, radius } = getOuterCircle(pattern as MagicCirclePattern, canvasSize);
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.PI * 2 * Math.min(1, progress);

  ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#00e5ff';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (progress < 1) {
    return { x: cx + radius * Math.cos(endAngle), y: cy + radius * Math.sin(endAngle) };
  }
  return null;
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
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const canvasReadyRef = useRef(false);

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
        const allEvents: DrawEvent[] = [];
        for (const stroke of history.data.drawLogs) {
          for (const ev of stroke) allEvents.push(ev);
        }
        if (allEvents.length >= 1) drawStrokesOnCanvas(ctx, allEvents);
        drawOuterCircleArc(ctx, history.data.pattern, 1, CANVAS_SIZE);
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
    const { events: allEvents, totalDuration: dur } = buildAllEventsFromLogs(history.data.drawLogs, STROKE_INTERVAL_MS);
    if (dur === 0) return;
    setTotalDuration(dur);

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

      // レイヤー1: ユーザー描画（elapsed時刻まで）
      const ptsWithType = allEvents.filter(ev => ev.t <= elapsed);
      if (ptsWithType.length > 1) {
        drawStrokesOnCanvas(ctx, ptsWithType);

        // ユーザー描画の先端グロー
        const lastPt = ptsWithType[ptsWithType.length - 1];
        ctx.shadowBlur = 2;
        ctx.shadowColor = '#00e5ff';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lastPt.x, lastPt.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 1;
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.arc(lastPt.x, lastPt.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // レイヤー2: 外周円弧（elapsed / dur で進行度を計算）
      const arcProgress = elapsed / dur;
      const arcTip = drawOuterCircleArc(ctx, history.data.pattern, arcProgress, CANVAS_SIZE);

      // 外周円の先端グロー
      if (arcTip) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00e5ff';
        ctx.fillStyle = 'rgba(0, 229, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(arcTip.x, arcTip.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (elapsed >= dur) {
        drawTemplate(history.data.pattern);
        drawStrokesOnCanvas(ctx, allEvents);
        drawOuterCircleArc(ctx, history.data.pattern, 1, CANVAS_SIZE);
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

    const STROKE_INTERVAL_MS = 500;
    const { events: allEvents } = buildAllEventsFromLogs(history.data.drawLogs, STROKE_INTERVAL_MS);

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

        const ptsWithType = allEvents.filter(ev => ev.t <= elapsed);
        if (ptsWithType.length > 1) {
          drawStrokesOnCanvas(ctx, ptsWithType);
          const lastPt = ptsWithType[ptsWithType.length - 1];
          ctx.shadowBlur = 2;
          ctx.shadowColor = '#00e5ff';
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(lastPt.x, lastPt.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 1;
          ctx.fillStyle = '#00e5ff';
          ctx.beginPath();
          ctx.arc(lastPt.x, lastPt.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        const arcTip = drawOuterCircleArc(ctx, history.data.pattern, elapsed / totalDuration, CANVAS_SIZE);
        if (arcTip) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#00e5ff';
          ctx.fillStyle = 'rgba(0, 229, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(arcTip.x, arcTip.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        if (elapsed >= totalDuration) {
          drawTemplate(history.data.pattern);
          drawStrokesOnCanvas(ctx, allEvents);
          drawOuterCircleArc(ctx, history.data.pattern, 1, CANVAS_SIZE);
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
      const ptsWithType = allEvents.filter(ev => ev.t <= clampedTime);
      if (ptsWithType.length >= 1) drawStrokesOnCanvas(ctx, ptsWithType);
      drawOuterCircleArc(ctx, history.data.pattern, clampedTime / totalDuration, CANVAS_SIZE);
    }
  }, [history, isPlaying, totalDuration, drawTemplate]);

  const handleShare = useCallback(() => {
    if (!history?.data?.drawLogs) return;
    const shareData = {
      pattern: history.data.pattern,
      drawLogs: history.data.drawLogs,
      score: history.score,
      rank: history.rank,
      difficulty: history.difficulty,
      difficultyMultiplier: history.difficultyMultiplier,
      damageMultiplier: history.damageMultiplier,
      createdAt: history.createdAt,
    };
    const compressed = compressForUrl(shareData);
    if (!compressed) return;
    setShareUrl(`${window.location.origin}/replay?data=${compressed}`);
  }, [history]);

  if (!history) return null;

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
      {shareUrl && (
        <ShareModal
          longUrl={shareUrl}
          title={`Arcane Tracer - ${history.data?.pattern?.name ?? ''}`}
          text={`私の魔法陣詠唱結果: ${history.rank}ランク (${history.score}点)`}
          onClose={() => setShareUrl(null)}
        />
      )}
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
                {history.createdAt != null && history.createdAt !== 0 ? formatDate(history.createdAt) : '日時不明'}
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
