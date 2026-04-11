'use client';

import { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import type { MagicCircleHistory } from '@/lib/types';
import type { MagicCirclePattern } from '@/lib/patterns';
import type { DrawEvent } from '@/lib/types';
import { compressForUrlOptimized as compressForUrl } from '@/lib/shareUtils';

interface HistoryDetailProps {
  history: MagicCircleHistory | null;
  onClose: () => void;
  onReEdit: (data: Pick<MagicCircleHistory, 'data'>) => void;
}

const CANVAS_SIZE = 350;

function createReplayDrawLogs(strokes: MagicCircleHistory['data']['drawLogs']): DrawEvent[][] {
  return strokes.map((stroke) => {
    if (stroke.length === 0) return [];
    const t0 = stroke[0].t;
    return stroke.map((e) => ({ ...e, t: e.t - t0 }));
  });
}

export default function HistoryDetail({ history, onClose, onReEdit }: HistoryDetailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const replayAnimRef = useRef<number | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [debugMsg, setDebugMsg] = useState('');
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

  const drawAllStroke = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !history) return;
    drawTemplate(history.data.pattern);

    const allPoints: { x: number; y: number }[] = [];
    for (const stroke of history.data.drawLogs) {
      for (const ev of stroke) {
        allPoints.push({ x: ev.x, y: ev.y });
      }
    }
    if (allPoints.length > 1) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00e5ff';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(allPoints[0].x, allPoints[0].y);
      for (let i = 1; i < allPoints.length; i++) {
        ctx.lineTo(allPoints[i].x, allPoints[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    setDebugMsg('');
  }, [history, drawTemplate]);

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
      // Draw template + final state immediately
      drawTemplate(history.data.pattern);
      const allPoints: { x: number; y: number }[] = [];
      for (const stroke of history.data.drawLogs) {
        for (const ev of stroke) {
          allPoints.push({ x: ev.x, y: ev.y });
        }
      }
      if (allPoints.length > 1) {
        const ctx = node.getContext('2d');
        if (ctx) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#00e5ff';
          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(allPoints[0].x, allPoints[0].y);
          for (let i = 1; i < allPoints.length; i++) {
            ctx.lineTo(allPoints[i].x, allPoints[i].y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
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

  const handleReplay = useCallback(() => {
    if (!history || isReplaying || !canvasRef.current) return;
    setIsReplaying(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setIsReplaying(false); return; }

    const drawLogs = history.data.drawLogs;
    const normalizedLogs = createReplayDrawLogs(drawLogs);
    const STROKE_INTERVAL_MS = 500;
    const allEvents: DrawEvent[] = [];
    let timeOffset = 0;
    for (const stroke of normalizedLogs) {
      if (stroke.length === 0) continue;
      for (const ev of stroke) {
        allEvents.push({ x: ev.x, y: ev.y, t: ev.t + timeOffset, type: ev.type });
      }
      if (allEvents.length > 0) {
        timeOffset = allEvents[allEvents.length - 1].t + STROKE_INTERVAL_MS;
      }
    }

    if (allEvents.length === 0) { setIsReplaying(false); return; }
    const totalDuration = allEvents[allEvents.length - 1].t;

    drawTemplate(history.data.pattern);

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      drawTemplate(history.data.pattern);

      const pts: { x: number; y: number }[] = [];
      for (const ev of allEvents) {
        if (ev.t <= elapsed) {
          pts.push({ x: ev.x, y: ev.y });
        }
      }

      if (pts.length > 1) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00e5ff';
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Leading glow
        const last = pts[pts.length - 1];
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00e5ff';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.arc(last.x, last.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (elapsed >= totalDuration) {
        drawTemplate(history.data.pattern);
        if (pts.length > 1) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#00e5ff';
          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        setDebugMsg('🔄 リプレイ完了！');
        replayAnimRef.current = null;
        setIsReplaying(false);
        return;
      }

      replayAnimRef.current = requestAnimationFrame(animate);
    };

    replayAnimRef.current = requestAnimationFrame(animate);
    setDebugMsg('🔄 リプレイ再生中...');
  }, [history, isReplaying, drawTemplate]);

  const handleCancelReplay = useCallback(() => {
    if (replayAnimRef.current !== null) {
      cancelAnimationFrame(replayAnimRef.current);
      replayAnimRef.current = null;
    }
    setIsReplaying(false);
    setDebugMsg('');
    if (history) drawTemplate(history.data.pattern);
  }, [history, drawTemplate]);

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
    const d = new Date(ts);
    return d.toLocaleString('ja-JP');
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
            <canvas
              ref={handleCanvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="w-full max-w-[350px] rounded-lg border-2 border-gray-700"
              style={{ background: '#0a0a14', display: 'block' }}
            />

            {/* Debug / Status */}
            {debugMsg && (
              <div className="mt-2 rounded-lg bg-black/80 px-3 py-1 text-center text-xs font-mono text-green-400">
                {debugMsg}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-3 flex gap-2 flex-wrap justify-center">
              <button
                onClick={handleReplay}
                disabled={isReplaying}
                className="cursor-pointer rounded-md px-4 py-2 text-sm font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #ffd700, #ff9100)' }}
              >
                {isReplaying ? '再生中...' : '🔄 リプレイ'}
              </button>
              {isReplaying && (
                <button
                  onClick={handleCancelReplay}
                  className="cursor-pointer rounded-md border-2 border-gray-600 px-4 py-2 text-sm font-bold transition-colors hover:bg-gray-800"
                >
                  停止
                </button>
              )}
              <button
                onClick={drawAllStroke}
                className="cursor-pointer rounded-md border-2 border-gray-600 px-4 py-2 text-sm font-bold transition-colors hover:bg-gray-800"
                style={{ borderColor: 'rgba(0,229,255,0.3)', color: '#00e5ff' }}
              >
                👁️ 最終描画
              </button>
              {/* Share Button */}
              <button
                onClick={async () => {
                  if (history && history.data) {
                    try {
                      // Compress the data for URL sharing (only essential data to keep URL short)
                      const shareData = {
                        pattern: history.data.pattern,
                        drawLogs: history.data.drawLogs,
                        // Include minimal metadata for proper scoring
                        score: history.score,
                        rank: history.rank,
                        difficulty: history.difficulty,
                        difficultyMultiplier: history.difficultyMultiplier,
                        damageMultiplier: history.damageMultiplier
                      };
                      
                      const compressed = compressForUrl(shareData);
                      if (!compressed) {
                        throw new Error('Failed to compress data');
                      }
                      
                      // Create shareable URL
                      const shareUrl = `${window.location.origin}/replay?data=${compressed}`;
                      
                      // Try to use the Web Share API if available
                      if (navigator.share) {
                        await navigator.share({
                          title: `Arcane Tracer - ${history.data.pattern.name}`,
                          text: `私の魔法陣詠唱結果: ${history.rank}ランク (${history.score}点)`,
                          url: shareUrl
                        });
                      } else {
                        // Fallback: copy to clipboard
                        await navigator.clipboard.writeText(shareUrl);
                        
                        // Show success message
                        const originalMsg = debugMsg;
                        setDebugMsg('📤 共有リンクをクリップボードにコピーしました！');
                        setTimeout(() => setDebugMsg(originalMsg), 3000);
                      }
                    } catch (err) {
                      console.error('Failed to share:', err);
                      const originalMsg = debugMsg;
                      setDebugMsg('共有に失敗しました');
                      setTimeout(() => setDebugMsg(originalMsg), 3000);
                    }
                  }
                }}
                className="cursor-pointer rounded-md px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-80"
                style={{ background: 'linear-gradient(135deg, #00e5ff, #76ff03)' }}
              >
                📤 共有
              </button>
            </div>
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
                {history.data.drawLogs.length}ストローク
              </div>
            </div>

            {/* Timestamp */}
            <div className="mb-4">
              <div className="text-sm text-gray-500">作成日時</div>
              <div className="text-sm" style={{ color: '#9c9caf' }}>
                {formatDate(history.createdAt)}
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
