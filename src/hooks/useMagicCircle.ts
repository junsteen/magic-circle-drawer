'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { calculateScore, type ScoringResult } from '@/lib/scoring';

const CANVAS_SIZE = 350;

export interface UseMagicCircleReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasSize: number;
  isDrawing: boolean;
  userPath: { x: number; y: number }[];
  timeLeft: number;
  isActive: boolean;
  showResult: boolean;
  scoreResult: ScoringResult | null;
  debugMsg: string;
  startPoint: { x: number; y: number };
  handleEvaluate: () => void;
  handleReset: () => void;
  getRankColor: (rank: string) => string;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
}

/** 魔法陣Canvasの全ロジック（描画・タッチ・タイマー・スコア） */
export function useMagicCircle(
  onScore: (result: ScoringResult) => void,
  onReset: () => void,
): UseMagicCircleReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [userPath, setUserPath] = useState<{ x: number; y: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState(5);
  const [isActive, setIsActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoringResult | null>(null);
  const [debugMsg, setDebugMsg] = useState('タップ待ち - Canvasを触ってください');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cx = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE / 2;
  const r = CANVAS_SIZE * 0.35;
  const startPoint = { x: cx + r * Math.cos(-Math.PI / 2), y: cy + r * Math.sin(-Math.PI / 2) };

  const drawTemplate = useCallback((highlight = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
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
  }, [cx, cy, r]);

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
    for (let i = 1; i < userPath.length; i++) ctx.lineTo(userPath[i].x, userPath[i].y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [userPath, drawTemplate]);

  useEffect(() => { drawTemplate(); }, [drawTemplate]);
  useEffect(() => { if (userPath.length > 0) drawUserPath(); }, [userPath, drawUserPath]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => { if (prev <= 1) { setIsActive(false); return 0; } return prev - 1; });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, timeLeft]);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    setDebugMsg(`TouchStart: ${e.touches.length}本`);
    if (showResult) return;
    const touch = e.touches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    if (!isActive) setIsActive(true);
    setIsDrawing(true);
    setUserPath([{ x: pos.x, y: pos.y }]);
  }, [showResult, isActive, getCanvasPos]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    setDebugMsg('TouchMove: ...');
    if (!isDrawing || showResult) return;
    const touch = e.touches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    setUserPath((prev) => [...prev, { x: pos.x, y: pos.y }]);
  }, [isDrawing, showResult, getCanvasPos]);

  const handleTouchEnd = useCallback(() => setIsDrawing(false), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const opt: AddEventListenerOptions = { passive: false };
    canvas.addEventListener('touchstart', handleTouchStart, opt);
    canvas.addEventListener('touchmove', handleTouchMove, opt);
    canvas.addEventListener('touchend', handleTouchEnd, opt);
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const startDrawing = useCallback((pos: { x: number; y: number }) => {
    if (showResult) return;
    if (!isActive) setIsActive(true);
    setIsDrawing(true);
    setUserPath([{ x: pos.x, y: pos.y }]);
  }, [showResult, isActive]);

  const draw = useCallback((pos: { x: number; y: number }) => {
    if (!isDrawing || showResult) return;
    setUserPath((prev) => [...prev, { x: pos.x, y: pos.y }]);
  }, [isDrawing, showResult]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    startDrawing(getCanvasPos(e.clientX, e.clientY));
  }, [startDrawing, getCanvasPos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (isDrawing) draw(getCanvasPos(e.clientX, e.clientY));
  }, [isDrawing, draw, getCanvasPos]);

  const onPointerUp = useCallback(() => setIsDrawing(false), []);

  const handleEvaluate = useCallback(() => {
    const result = calculateScore(userPath, CANVAS_SIZE, CANVAS_SIZE);
    setScoreResult(result);
    setShowResult(true);
    onScore(result);
  }, [userPath, onScore]);

  const handleReset = useCallback(() => {
    setIsDrawing(false); setUserPath([]); setIsActive(false);
    setTimeLeft(5); setShowResult(false); setScoreResult(null);
    onReset(); drawTemplate();
  }, [onReset, drawTemplate]);

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'S': return '#ffd700';
      case 'A': return '#00e5ff';
      case 'B': return '#76ff03';
      default: return '#ff4081';
    }
  };

  return {
    canvasRef, canvasSize: CANVAS_SIZE, isDrawing, userPath,
    timeLeft, isActive, showResult, scoreResult, debugMsg,
    startPoint, handleEvaluate, handleReset, getRankColor,
    onPointerDown, onPointerMove, onPointerUp,
  };
}
