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
import type { DrawEvent, DrawStroke, MagicCircleData, MagicCircleHistory } from '@/lib/types';
import { addHistory } from '@/lib/historyDB';
import { updateCompletion, isPatternCompleted, getCompletedCount, getTotalPatternsCount } from '@/lib/completionDB';

const CANVAS_SIZE = 350;

function createReplayDrawLogs(strokes: DrawStroke[]): DrawEvent[][] {
  return strokes.map((stroke) => {
    if (stroke.length === 0) return [];
    const t0 = stroke[0].t;
    return stroke.map((e) => ({ ...e, t: e.t - t0 }));
  });
}

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
  // リプレイ関連
  drawLogs: DrawStroke[];
  savedMagicData: MagicCircleData | null;
  isReplaying: boolean;
  handleReplay: () => void;
  handleSaveData: () => MagicCircleData | null;
  handleLoadData: (data: MagicCircleData) => void;
  // 完了追跡
  completionStatus: { completed: number; total: number } | null;
}

/** 魔法陣Canvasの全ロジック（描画・タッチ・タイマー・スコア） */
export function useMagicCircle(
  onScore: (result: ScoringResult) => void,
  onReset: () => void,
  onCompletionUpdate?: (status: { completed: number; total: number } | null) => void
): UseMagicCircleReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [userPath, setUserPath] = useState<{ x: number; y: number }[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoringResult | null>(null);
  const [debugMsg, setDebugMsg] = useState('タップ待ち - Canvasを触ってください');
  const [completionStatus, setCompletionStatus] = useState<{ completed: number; total: number } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── 描画ログ記録 ───
  const [drawLogs, setDrawLogs] = useState<DrawStroke[]>([]);
  const drawLogRef = useRef<DrawEvent[]>([]);
  const strokeStartTimeRef = useRef<number>(0);

  // ─── リプレイ状態 ───
  const [isReplaying, setIsReplaying] = useState(false);
  const replayAnimRef = useRef<number | null>(null);
  const [savedMagicData, setSavedMagicData] = useState<MagicCircleData | null>(null);

  // use a ref to sync replay state so userPath effect won't clear canvas during animation
  const isReplayingRef = useRef(false);

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

  // Update completion status when patterns change
  useEffect(() => {
    let isMounted = true;
    async function loadCompletionStatus() {
      try {
        const [completedCount, totalCount] = await Promise.all([
          getCompletedCount(),
          getTotalPatternsCount()
        ]);
        if (isMounted) {
          const status = { completed: completedCount, total: totalCount };
          setCompletionStatus(status);
          // 親コンポーネントに完了状況を通知
          if (onCompletionUpdate) {
            onCompletionUpdate(status);
          }
        }
      } catch (e) {
        console.error('Failed to load completion status:', e);
        if (isMounted && onCompletionUpdate) {
          onCompletionUpdate(null);
        }
      }
    }
    loadCompletionStatus();
    return () => { isMounted = false; };
  }, []);

  // 完了状況の変更を親に通知する別のエフェクト
  useEffect(() => {
    if (onCompletionUpdate) {
      onCompletionUpdate(completionStatus);
    }
  }, [completionStatus, onCompletionUpdate]);

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
  useEffect(() => {
    if (userPath.length > 0 && !isReplayingRef.current) {
      drawUserPath();
    }
  }, [userPath, drawUserPath]);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }, []);

  const startDrawing = useCallback((pos: { x: number; y: number }) => {
    if (showResult || isReplaying) return;
    if (!isActive) setIsActive(true);
    setIsDrawing(true);
    setUserPath([{ x: pos.x, y: pos.y }]);
    // 描画ログ記録: start タイミングで新しいストロークを開始
    strokeStartTimeRef.current = performance.now();
    drawLogRef.current = [{ x: pos.x, y: pos.y, t: 0, type: 'start' }];
    setDebugMsg('描画中...');
  }, [showResult, isActive, isReplaying]);

  const draw = useCallback((pos: { x: number; y: number }) => {
    if (!isDrawing || showResult || isReplaying) return;
    setUserPath((prev) => [...prev, { x: pos.x, y: pos.y }]);
    // 描画ログ記録: move イベント
    const elapsed = performance.now() - strokeStartTimeRef.current;
    drawLogRef.current.push({ x: pos.x, y: pos.y, t: elapsed, type: 'move' });
  }, [isDrawing, showResult, isReplaying]);

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
      // 描画ログ記録: end イベントでストロークを保存
      const elapsed = performance.now() - strokeStartTimeRef.current;
      const lastPoint = drawLogRef.current[drawLogRef.current.length - 1];
      drawLogRef.current.push({ x: lastPoint.x, y: lastPoint.y, t: elapsed, type: 'end' });
      setDrawLogs((prev) => [...prev, [...drawLogRef.current]]);
      drawLogRef.current = [];
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

    // ─── 作成後自動保存 (履歴に保存) ───
    const data: MagicCircleData = {
      seed: Math.floor(Math.random() * 1e9),
      pattern: {
        name: currentPattern.name,
        vertices: currentPattern.vertices,
        edges: currentPattern.edges,
        circles: currentPattern.circles,
      },
      drawLogs: drawLogs.map((stroke) => [...stroke]),
      timestamp: Date.now(),
    };

    // Generate thumbnail from canvas
    let thumbnail: string | undefined;
    try {
      const canvas = canvasRef.current;
      if (canvas) {
        thumbnail = canvas.toDataURL('image/png');
      }
    } catch {
      // Thumbnail generation failed, continue without it
    }

    const historyItem: MagicCircleHistory = {
      id: `history_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      data,
      score: result.score,
      rank: result.rank,
      difficulty: DIFFICULTY_LABELS[difficulty],
      difficultyMultiplier: result.difficultyMultiplier,
      damageMultiplier: result.damageMultiplier,
      thumbnail,
      createdAt: Date.now(),
    };

    addHistory(historyItem).catch((e) => console.error('Failed to save history:', e));
    
    // ─── 完了状況を更新 ───
    updateCompletion(currentPattern.name, result.score, result.rank).catch((e) => 
      console.error('Failed to update completion:', e));
  }, [userPath, currentPattern, difficulty, onScore, drawLogs, canvasRef]);

  const handleReset = useCallback(() => {
    setIsDrawing(false);
    setUserPath([]);
    setIsActive(false);
    setShowResult(false);
    setScoreResult(null);
    setActualTimeLeft(DIFFICULTY_TIME[difficulty]);
    setDebugMsg('タップ待ち - Canvasを触ってください');
    // 描画ログもクリア
    setDrawLogs([]);
    drawLogRef.current = [];
    // リプレイ中の場合は停止
    if (replayAnimRef.current !== null) {
      cancelAnimationFrame(replayAnimRef.current);
      replayAnimRef.current = null;
    }
    setIsReplaying(false);
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
    // 描画ログもクリア
    setDrawLogs([]);
    drawLogRef.current = [];
    if (replayAnimRef.current !== null) {
      cancelAnimationFrame(replayAnimRef.current);
      replayAnimRef.current = null;
    }
    setIsReplaying(false);
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

  // ─── リプレイ機能 ───
  const handleReplay = useCallback(() => {
    if (drawLogs.length === 0 || isReplayingRef.current) return;
    setIsReplaying(true);
    isReplayingRef.current = true;
    setIsActive(false);
    setShowResult(false);

    const normalizedLogs = createReplayDrawLogs(drawLogs);
    const canvas = canvasRef.current;
    if (!canvas || !currentPattern) { isReplayingRef.current = false; setIsReplaying(false); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { isReplayingRef.current = false; setIsReplaying(false); return; }

    // Flatten all strokes with intervals
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

    if (allEvents.length === 0) { isReplayingRef.current = false; setIsReplaying(false); return; }
    const totalDuration = allEvents[allEvents.length - 1].t;

    // Draw template background
    drawTemplate(currentPattern);

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;

      // Redraw background
      drawTemplate(currentPattern);

      // Collect all points up to current time
      const pts: { x: number; y: number }[] = [];
      for (const ev of allEvents) {
        if (ev.t <= elapsed) {
          pts.push({ x: ev.x, y: ev.y });
        }
      }

      if (pts.length > 1) {
        // Connect points by stroke boundaries
        // Draw each segment with glow
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
        // Replay complete
        drawTemplate(currentPattern);
        // Draw all points as final state
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
        isReplayingRef.current = false;
        setIsReplaying(false);
        return;
      }

      replayAnimRef.current = requestAnimationFrame(animate);
    };

    replayAnimRef.current = requestAnimationFrame(animate);
    setDebugMsg('🔄 リプレイ再生中...');
  }, [drawLogs, isReplaying, currentPattern, drawTemplate]);

  // ─── 魔法陣データの保存 ───
  const handleSaveData = useCallback((): MagicCircleData | null => {
    if (!currentPattern || drawLogs.length === 0) {
      setDebugMsg('⚠️ 保存する描画データがありません');
      return null;
    }

    const data: MagicCircleData = {
      seed: Math.floor(Math.random() * 1e9),
      pattern: {
        name: currentPattern.name,
        vertices: currentPattern.vertices,
        edges: currentPattern.edges,
        circles: currentPattern.circles,
      },
      drawLogs: drawLogs.map((stroke) => [...stroke]),
      timestamp: Date.now(),
    };
    setSavedMagicData(data);
    setDebugMsg(`💾 保存完了: "${data.pattern.name}" (${data.drawLogs.length}ストローク)`);
    return data;
  }, [currentPattern, drawLogs]);

  // ─── 魔法陣データの読み込み ───
  const handleLoadData = useCallback((data: MagicCircleData) => {
    setSavedMagicData(data);
    drawTemplate(currentPattern);
    setDrawLogs(data.drawLogs);
    setUserPath([]);
    drawTemplate(currentPattern);
    setDebugMsg(`📂 読込完了: "${data.pattern.name}" (${data.drawLogs.length}ストローク)`);
  }, [currentPattern, drawTemplate]);

  return {
    canvasRef, canvasSize: CANVAS_SIZE, isDrawing, userPath,
    timeLeft: actualTimeLeft, isActive, showResult, scoreResult, debugMsg,
    startPoint, patternName, currentIndex: currentIdx, totalPatterns: patterns.length,
    difficulty, difficultyLabel: DIFFICULTY_LABELS[difficulty],
    handleEvaluate, handleReset, handleNext, changeDifficulty, getRankColor,
    onPointerDown, onPointerMove, onPointerUp,
    drawLogs, savedMagicData, isReplaying, handleReplay, handleSaveData, handleLoadData,
    // 完了追跡
    completionStatus
  };
}
