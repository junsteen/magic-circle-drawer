'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { calculateScore, type ScoringResult } from '@/lib/scoring';

interface MagicCircleCanvasProps {
  onScore: (result: ScoringResult) => void;
  onReset: () => void;
}
import HelpModal from './HelpModal';
import TutorialOverlay from './TutorialOverlay';

export default function MagicCircleCanvas({ onScore, onReset }: MagicCircleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasSize = 350;
  const [isDrawing, setIsDrawing] = useState(false);
  const [userPath, setUserPath] = useState<{ x: number; y: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState(5);
  const [isActive, setIsActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoringResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false); // DEBUG: 無効化
  const [debugMsg, setDebugMsg] = useState("タップ待ち - Canvasを触ってください");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cx = canvasSize / 2;
  const cy = canvasSize / 2;
  const r = canvasSize * 0.35;

  const startPoint = {
    x: cx + r * Math.cos(-Math.PI / 2),
    y: cy + r * Math.sin(-Math.PI / 2),
  };

  const drawTemplate = useCallback((highlight = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = highlight ? 'rgba(0, 229, 255, 0.7)' : 'rgba(100, 100, 150, 0.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash(highlight ? [] : [5, 5]);
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      const angle = (Math.PI * 2 * (i % 3)) / 3 - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }, [cx, cy, r, canvasSize]);

  const drawUserPath = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || userPath.length < 2) return;

    drawTemplate();

    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00e5ff';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(userPath[0].x, userPath[0].y);
    for (let i = 1; i < userPath.length; i++) {
      ctx.lineTo(userPath[i].x, userPath[i].y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [userPath, drawTemplate]);

  useEffect(() => {
    drawTemplate();
  }, [drawTemplate]);

  useEffect(() => {
    if (userPath.length > 0) {
      drawUserPath();
    }
  }, [userPath, drawUserPath]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // 生のタッチイベントハンドラ
  const handleTouchStart = useCallback((e: TouchEvent) => {
    setDebugMsg(`TouchStart: ${e.touches.length}本`);
    e.preventDefault();
    if (showResult) return;
    const touch = e.touches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    if (!isActive) setIsActive(true);
    setIsDrawing(true);
    setUserPath([{ x: pos.x, y: pos.y }]);
  }, [showResult, isActive, getCanvasPos]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    setDebugMsg("TouchMove: ...");
    e.preventDefault();
    if (!isDrawing || showResult) return;
    const touch = e.touches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    setUserPath((prev) => [...prev, { x: pos.x, y: pos.y }]);
  }, [isDrawing, showResult, getCanvasPos]);

  const handleTouchEnd = useCallback((_e: TouchEvent) => {
    setIsDrawing(false);
  }, []);

  // Canvas に生のイベントリスナーを設定
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // マウスイベント（デスクトップ用）
  const startDrawing = (pos: { x: number; y: number }) => {
    if (showResult) return;
    if (!isActive) setIsActive(true);
    setIsDrawing(true);
    setUserPath([{ x: pos.x, y: pos.y }]);
  };

  const draw = (pos: { x: number; y: number }) => {
    if (!isDrawing || showResult) return;
    setUserPath((prev) => [...prev, { x: pos.x, y: pos.y }]);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDebugMsg("Mouse Down");
    startDrawing(getCanvasPos(e.clientX, e.clientY));
  }, [getCanvasPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    draw(getCanvasPos(e.clientX, e.clientY));
  }, [isDrawing, getCanvasPos]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleEvaluate = () => {
    const result = calculateScore(userPath, canvasSize, canvasSize);
    setScoreResult(result);
    setShowResult(true);
    onScore(result);
  };

  const handleReset = () => {
    setIsDrawing(false);
    setUserPath([]);
    setIsActive(false);
    setTimeLeft(5);
    setShowResult(false);
    setScoreResult(null);
    onReset();
    drawTemplate();
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'S': return '#ffd700';
      case 'A': return '#00e5ff';
      case 'B': return '#76ff03';
      default: return '#ff4081';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {showTutorial && (
        <TutorialOverlay onStart={() => setShowTutorial(false)} />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      <button
        onClick={() => setShowHelp(true)}
        className="absolute right-4 top-4 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 text-lg font-bold"
        style={{ borderColor: 'rgba(0,229,255,0.5)', color: '#00e5ff', background: 'rgba(10,10,20,0.8)' }}
        aria-label="ヘルプ"
      >
        ?
      </button>

      <div className="relative w-[350px] max-w-full">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="rounded-lg border-2 border-gray-700 w-full h-auto touch-none"
          style={{ background: '#0a0a14', display: 'block' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {!isDrawing && !showResult && (
          <div
            className="absolute tutorial-arrow"
            style={{
              left: startPoint.x - 10,
              top: startPoint.y - 10,
              width: 20,
              height: 20,
              pointerEvents: 'none',
            }}
          >
            <div className="absolute inset-0 animate-ping rounded-full bg-pink-500 opacity-75" />
            <div className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-pink-400 bg-pink-500">
              <span className="text-[10px] text-white">▶</span>
            </div>
          </div>
        )}

        {!isActive && !isDrawing && !showResult && (
          <div
            className="absolute left-0 right-0 top-2 -translate-y-full text-center text-xs"
            style={{ color: '#7676aa' }}
          >
            ▲ 赤い点から三角形をなぞってください
          </div>
        )}

        {showResult && scoreResult && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              background: 'rgba(13, 13, 26, 0.85)',
              borderRadius: '8px',
            }}
          >
            <div className="text-6xl font-bold" style={{ color: getRankColor(scoreResult.rank) }}>
              {scoreResult.rank}
            </div>
            <div className="mt-2 text-2xl">{scoreResult.score}点</div>
            <div className="mt-1 text-lg" style={{ color: '#00e5ff' }}>
              威力: {scoreResult.damageMultiplier}
            </div>
          </div>
        )}

        {isActive && (
          <div className="absolute right-2 top-2 rounded-md bg-black/60 px-3 py-1 font-mono text-xl">
            {timeLeft}s
          </div>
        )}
      </div>

      <div className="mt-1 min-h-[1.25rem] text-sm text-gray-400">
        {isActive && `⏱ 詠唱中... 残り${timeLeft}秒`}
        {!isActive && !isDrawing && timeLeft === 0 && <span style={{ color: '#ff4081' }}>⏰ 詠唱終了！リセットして再挑戦</span>}
        {!isActive && !isDrawing && timeLeft > 0 && (userPath.length > 0 ? '描画完了。スコア判定しますか？' : '▲ 赤い点から三角形をなぞってください')}
      </div>

      {/* デバッグログ表示 */}
      <div className="fixed bottom-4 left-4 right-4 z-[100] rounded-lg bg-black/80 p-2 text-center text-xs font-mono text-green-400 backdrop-blur-sm">
        {debugMsg}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleEvaluate}
          disabled={userPath.length < 10 || showResult}
          className="cursor-pointer rounded-md px-6 py-2 font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #00e5ff, #7c4dff)' }}
        >
          詠唱完了！
        </button>
        <button
          onClick={handleReset}
          className="cursor-pointer rounded-md border-2 border-gray-600 px-6 py-2 font-bold transition-colors hover:bg-gray-800"
        >
          リセット
        </button>
      </div>
    </div>
  );
}
