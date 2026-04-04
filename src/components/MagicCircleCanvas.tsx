'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { calculateScore, ScoringResult } from '@/lib/scoring';

interface MagicCircleCanvasProps {
  onScore: (result: ScoringResult) => void;
  onReset: () => void;
}

export default function MagicCircleCanvas({ onScore, onReset }: MagicCircleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasSize = 350;
  const [isDrawing, setIsDrawing] = useState(false);
  const [userPath, setUserPath] = useState<{ x: number; y: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState(5);
  const [isActive, setIsActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoringResult | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const drawTemplate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = canvasSize / 2;
    const cy = canvasSize / 2;
    const r = canvasSize * 0.35;

    // Clear
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Outer circle
    ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
    ctx.stroke();

    // Inner circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Triangle
    ctx.strokeStyle = 'rgba(100, 100, 150, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      const angle = (Math.PI * 2 * (i % 3)) / 3 - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, []);

  const drawUserPath = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || userPath.length < 2) return;

    // Redraw template first
    drawTemplate();

    // Draw user path with glow
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

    // Draw dots at start
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff4081';
    ctx.beginPath();
    ctx.arc(userPath[0].x, userPath[0].y, 6, 0, Math.PI * 2);
    ctx.fill();
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
  }, [isActive]);

  const startDrawing = (x: number, y: number) => {
    if (!isActive && !showResult) {
      setIsActive(true);
    }
    setIsDrawing(true);
    setUserPath([{ x, y }]);
  };

  const draw = (x: number, y: number) => {
    if (!isDrawing) return;
    setUserPath((prev) => [...prev, { x, y }]);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

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

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    startDrawing(pos.x, pos.y);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    draw(pos.x, pos.y);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const pos = getPos(e);
    startDrawing(pos.x, pos.y);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    draw(pos.x, pos.y);
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
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="rounded-lg border-2 border-gray-700 touch-none"
          style={{ background: '#0a0a14' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={stopDrawing}
          onMouseDown={onMouseDown}
          onMouseMove={(e) => isDrawing && onMouseDown(e)}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />

        {showResult && scoreResult && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              background: 'rgba(13, 13, 26, 0.85)',
              animation: 'glow-pulse 2s ease-in-out infinite',
            }}
          >
            <div className="text-6xl font-bold" style={{ color: getRankColor(scoreResult.rank) }}>
              {scoreResult.rank}
            </div>
            <div className="text-2xl mt-2">{scoreResult.score}点</div>
            <div className="text-lg mt-1" style={{ color: '#00e5ff' }}>
              威力: {scoreResult.damageMultiplier}
            </div>
          </div>
        )}

        {isActive && (
          <div className="absolute top-2 right-2 bg-black/60 px-3 py-1 rounded-md text-xl font-mono">
            {timeLeft}s
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-4">
        {!isActive && !isDrawing && (
          <div className="text-gray-400 text-sm">
            {timeLeft === 0 ? '詠唱終了！' : '魔法陣をなぞってください'}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleEvaluate}
          disabled={userPath.length < 10 || showResult}
          className="px-6 py-2 rounded-md font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #00e5ff, #7c4dff)',
            color: '#000',
          }}
        >
          詠唱完了！
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-2 rounded-md font-bold border-2 border-gray-600 hover:bg-gray-800"
        >
          リセット
        </button>
      </div>
    </div>
  );
}
