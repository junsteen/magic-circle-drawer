'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { calculateScore, type ScoringResult } from '@/lib/scoring';
import {
  type MagicCirclePattern,
  type Difficulty,
  type Point,
  createPresetPattern,
  generateRandomPattern,
  DIFFICULTY_TIME,
  DIFFICULTY_MULTIPLIER,
  DIFFICULTY_TOLERANCE,
  DIFFICULTY_LABELS,
} from '@/lib/patterns';

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
  patternName: string;
  currentIndex: number;
  totalPatterns: number;
  difficulty: Difficulty;
  difficultyLabel: string;
  handleEvaluate: () => void;
  handleReset: () => void;
  handleNext: () => void;
  changeDifficulty: (d: Difficulty) => void;
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
  const [isActive, setIsActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoringResult | null>(null);
  const [debugMsg, setDebugMsg] = useState('タップ待ち - Canvasを触ってください');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── パターン・難易度管理 ───
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [patterns, setPatterns] = useState<MagicCirclePattern[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Initialize patterns
  useEffect(() => {
    const preset = createPresetPattern(CANVAS_SIZE);
    setPatterns(preset);
    setCurrentIdx(0);
  }, []);

  const currentPattern = patterns[currentIdx];
  const [actualTimeLeft, setActualTimeLeft] = useState(DIFFICULTY_TIME.normal);

  const patternName = currentPattern?.name ?? '';

  // Calculate start point from current pattern
  const startPoint = currentPattern
    ? (() => {
        const v0 = currentPattern.vertices[0];
        return { x: v0.x, y: v0.y };
      })()
    : { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 - CANVAS_SIZE * 0.35 };

  // Timer effect
  useEffect(() => {
    if (!currentPattern) return;
    if (!isActive || actualTimeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setActualTimeLeft((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          setDebugMsg('⏰ 時間切れ！リセットして再挑戦');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, actualTimeLeft, currentPattern]);

  // When difficulty/pattern changes, reset timer
  useEffect(() => {
    setActualTimeLeft(DIFFICULTY_TIME[difficulty]);
  }, [difficulty, currentIdx]);

  const drawTemplate = useCallback((pattern: MagicCirclePattern | null, highlight = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw circles
    if (pattern) {
      for (const circle of pattern.circles) {
        ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(circle.cx * CANVAS_SIZE, circle.cy * CANVAS_SIZE, circle.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw edges
    if (pattern) {
      ctx.strokeStyle = highlight ? 'rgba(0, 229, 255, 0.7)' : 'rgba(100, 100, 150, 0.5)';
      ctx.lineWidth = 3;
      ctx.setLineDash(highlight ? [] : [5, 5]);
      for (const edge of pattern.edges) {
        const a = pattern.vertices[edge.from];
        const b = pattern.vertices[edge.to];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }, [CANVAS_SIZE]);

  const drawUserPath = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || userPath.length < 2) return;
    drawTemplate(currentPattern);
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
  }, [userPath, drawTemplate, currentPattern]);

  useEffect(() => { if (currentPattern) drawTemplate(currentPattern); }, [drawTemplate, currentPattern]);
  useEffect(() => { if (userPath.length > 0) drawUserPath(); }, [userPath, drawUserPath]);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }, []);

  const startDrawing = useCallback((pos: { x: number; y: number }) => {
    if (showResult) return;
    if (!isActive) setIsActive(true);
    setIsDrawing(true);
    setUserPath([{ x: pos.x, y: pos.y }]);
    setDebugMsg('描画中...');
  }, [showResult, isActive]);

  const draw = useCallback((pos: { x: number; y: number }) => {
    if (!isDrawing || showResult) return;
    setUserPath((prev) => [...prev, { x: pos.x, y: pos.y }]);
  }, [isDrawing, showResult]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (canvasRef.current) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }
    startDrawing(getCanvasPos(e.clientX, e.clientY));
  }, [startDrawing, getCanvasPos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (isDrawing) draw(getCanvasPos(e.clientX, e.clientY));
  }, [isDrawing, draw, getCanvasPos]);

  const onPointerUp = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      setDebugMsg('描画完了。スコア判定しますか？');
    }
  }, [isDrawing]);

  const handleEvaluate = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    if (!currentPattern) return;
    const tolerance = DIFFICULTY_TOLERANCE[difficulty];
    const result = calculateScore(userPath, currentPattern, tolerance);

    // Apply difficulty multiplier
    result.difficultyMultiplier = DIFFICULTY_MULTIPLIER[difficulty];

    setScoreResult(result);
    setShowResult(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(100);
    }
    onScore(result);
  }, [userPath, currentPattern, difficulty, onScore]);

  const handleReset = useCallback(() => {
    setIsDrawing(false);
    setUserPath([]);
    setIsActive(false);
    setShowResult(false);
    setScoreResult(null);
    setActualTimeLeft(DIFFICULTY_TIME[difficulty]);
    setDebugMsg('タップ待ち - Canvasを触ってください');
    onReset();
    if (currentPattern) drawTemplate(currentPattern);
  }, [onReset, drawTemplate, currentPattern, difficulty]);

  const handleNext = useCallback(() => {
    // Add random pattern and advance
    const randomP = generateRandomPattern({ difficulty, canvasSize: CANVAS_SIZE });
    setPatterns((prev) => [...prev, randomP]);
    setCurrentIdx((prev) => prev + 1);
    setIsDrawing(false);
    setUserPath([]);
    setIsActive(false);
    setShowResult(false);
    setScoreResult(null);
    setActualTimeLeft(DIFFICULTY_TIME[difficulty]);
    setDebugMsg(`new pattern: ${randomP.name}`);
  }, [difficulty]);

  const changeDifficulty = useCallback((d: Difficulty) => {
    setDifficulty(d);
  }, []);

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
    timeLeft: actualTimeLeft, isActive, showResult, scoreResult, debugMsg,
    startPoint, patternName, currentIndex: currentIdx, totalPatterns: patterns.length,
    difficulty, difficultyLabel: DIFFICULTY_LABELS[difficulty],
    handleEvaluate, handleReset, handleNext, changeDifficulty, getRankColor,
    onPointerDown, onPointerMove, onPointerUp,
  };
}
