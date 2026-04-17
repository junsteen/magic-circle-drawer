'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { calculateScore, type ScoringResult } from '@/lib/scoring';
import { useVoiceActivation } from '@/hooks/useVoiceActivation';
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
import { compressForUrlOptimized } from '@/lib/shareUtils';

const CANVAS_SIZE = 350;

/**
 * 描画ストロークをリプレイ用に変換（相対タイムスタンプに変換）
 * @param strokes 描画ストロークの配列
 * @returns 相対タイムスタンプに変換された描画イベントの配列
 */
function createReplayDrawLogs(strokes: DrawStroke[]): DrawEvent[][] {
  return strokes.map((stroke) => {
    if (stroke.length === 0) return [];
    const t0 = stroke[0].t;
    return stroke.map((e) => ({ ...e, t: e.t - t0 }));
  });
}

/**
 * useMagicCircleフックの戻り値の型定義
 */
export interface UseMagicCircleReturn {
  /** キャンバス要素への参照 */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** キャンバスサイズ（ピクセル） */
  canvasSize: number;
  /** 描画中かどうかのフラグ */
  isDrawing: boolean;
  /** ユーザーの描画軌跡点群 */
  userPath: { x: number; y: number }[];
  /** 残り時間（秒） */
  timeLeft: number;
  /** アクティブ状態（タイマー動作中）フラグ */
  isActive: boolean;
  /** 結果表示フラグ */
  showResult: boolean;
  /** スコアリング結果 */
  scoreResult: ScoringResult | null;
  /** デバッグメッセージ */
  debugMsg: string;
  /** デバッグメッセージを設定する関数 */
  setDebugMsg: (msg: string) => void;
  /** 描画開始点の座標 */
  startPoint: { x: number; y: number };
  /** 現在のパターン名 */
  patternName: string;
  /** 現在のパターンインデックス */
  currentIndex: number;
  /** 総パターン数 */
  totalPatterns: number;
  /** 現在の難易度 */
  difficulty: Difficulty;
  /** 現在の難易度ラベル */
  difficultyLabel: string;
  /** 評価を実行する関数 */
  handleEvaluate: () => void;
  /** リセットを実行する関数 */
  handleReset: () => void;
  /** 次のパターンに進む関数 */
  handleNext: () => void;
  /** 前のパターンに戻る関数 */
  handlePrevious: () => void;
  /** 難易度を変更する関数 */
  changeDifficulty: (d: Difficulty) => void;
  /** ランクに対応する色を取得する関数 */
  getRankColor: (rank: string) => string;
  /** ポインターダウンイベントハンドラー */
  onPointerDown: (e: React.PointerEvent) => void;
  /** ポインタームーブイベントハンドラー */
  onPointerMove: (e: React.PointerEvent) => void;
  /** ポインタアップイベントハンドラー */
  onPointerUp: () => void;
  // リプレイ関連
  /** 描画ログ（リプレイ用） */
  drawLogs: DrawStroke[];
  /** 保存された魔法陣データ */
  savedMagicData: MagicCircleData | null;
  /** リプレイ中フラグ */
  isReplaying: boolean;
  /** リプレイを実行する関数 */
  handleReplay: () => void;
  /** 魔法陣データを保存する関数 */
  handleSaveData: () => MagicCircleData | null;
  /** 魔法陣データを読み込む関数 */
  handleLoadData: (data: MagicCircleData) => void;
  // 完了追跡
  /** 完了状況（完了数/総数） */
  completionStatus: { completed: number; total: number } | null;
  // 音声検知
  /** 音声検知の状態 */
  voiceActivation: {
    /** マイクアクセス可能かどうか */
    isMicAccessible: boolean;
    /** 現在リスニング中かどうか */
    isListening: boolean;
    /** リスニング開始関数 */
    startListening: () => Promise<void>;
    /** リスニング停止関数 */
    stopListening: () => void;
  } | null;
  /** 音声検知状態を設定する関数 */
  setVoiceActivation: (activation: {
    isMicAccessible: boolean;
    isListening: boolean;
    startListening: () => Promise<void>;
    stopListening: () => void;
  } | null) => void;
}

/**
 * 魔法陣Canvasの全ロジックを管理するカスタムフック
 * 描画処理、タッチイベント、タイマー制御、スコア計算、リプレイ機能などを統合
 * @param onScore - スコア計算完了時のコールバック関数
 * @param onReset - リセット時のコールバック関数
 * @param onCompletionUpdate - 完了状況更新時のコールバック関数（オプション）
 * @returns 魔法陣Canvasの状態と制御関数を含むオブジェクト
 */
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
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── 描画ログ記録 ───
  /** 描画ログの状態管理 */
  const [drawLogs, setDrawLogs] = useState<DrawStroke[]>([]);
  const drawLogRef = useRef<DrawEvent[]>([]);
  const strokeStartTimeRef = useRef<number>(0);

  // ─── リプレイ状態 ───
  /** リプレイ状態の管理 */
  const [isReplaying, setIsReplaying] = useState(false);
  const replayAnimRef = useRef<number | null>(null);
  const [savedMagicData, setSavedMagicData] = useState<MagicCircleData | null>(null);

  // リプレイ状態を同期するためのref（userPathエフェクトがアニメーション中にキャンバスクリアしないように）
  const isReplayingRef = useRef(false);

  // 音声検知フックを初期化（コンポーネントレベルで呼び出し）
  const voiceHook = useVoiceActivation(async () => {
    // 音声が検知されたときのコールバック
    // 評価ボタンを自動的に押す（ただし、アクティブで結果が表示されていない場合のみ）
    if (isActive && !showResult && userPath.length >= 10) {
      handleEvaluate();
      setDebugMsg('🔊 音声検知により自動評価を実行しました');
    }
  }, {
    threshold: 0.15, // やや高めの閾値に設定（環境ノイズ対策）
    silentTime: 800, // 0.8秒無音で音声終了と判定
    checkInterval: 100
  });

  // 音声検知の状態を管理
  const [voiceActivation, setVoiceActivation] = useState<{
    /** マイクアクセス可能かどうか */
    isMicAccessible: boolean;
    /** 現在リスニング中かどうか */
    isListening: boolean;
    /** リスニング開始関数 */
    startListening: () => Promise<void>;
    /** リスニング停止関数 */
    stopListening: () => void;
  } | null>(null);

  // 音声検知の状態を同期（フックの状態変更を監視）
  useEffect(() => {
    if (voiceHook) {
      setVoiceActivation({
        isMicAccessible: voiceHook.isMicAccessible,
        isListening: voiceHook.isListening,
        startListening: voiceHook.startListening,
        stopListening: voiceHook.stopListening
      });
    }
  }, [voiceHook?.isMicAccessible, voiceHook?.isListening]);

  // ─── パターン・難易度管理 ───
  /** 現在の難易度設定 */
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  /** 魔法陣パターンのリスト */
  const [patterns, setPatterns] = useState<MagicCirclePattern[]>([]);
  /** 現在のパターンインデックス */
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
  /** 残り時間（実際のタイマー値） */
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

  /**
   * テンプレート（お手本の魔法陣）をキャンバスに描画
   * @param pattern 描画する魔法陣パターン（nullの場合はクリアのみ）
   * @param highlight ハイライト表示するかどうか（デフォルト: false）
   */
  const drawTemplate = useCallback((pattern: MagicCirclePattern | null, highlight = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw circles (補助円)
    if (pattern) {
      for (const circle of pattern.circles) {
        ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(circle.cx * CANVAS_SIZE, circle.cy * CANVAS_SIZE, circle.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw edges (辺・線分)
    if (pattern) {
      ctx.strokeStyle = highlight ? 'rgba(0, 229, 255, 0.7)' : 'rgba(100, 100, 150, 0.5)';
      ctx.lineWidth = 3;
      ctx.setLineDash(highlight ? [] : [5, 5]); // ハイライト時は実線、通常時は点線
      for (const edge of pattern.edges) {
        const a = pattern.vertices[edge.from];
        const b = pattern.vertices[edge.to];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.setLineDash([]); // ダッシュパターンをリセット
    }
  }, [CANVAS_SIZE]);

  const drawStrokes = useCallback((strokes: { x: number; y: number }[][], offset: { x: number; y: number } = { x: 0, y: 0 }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00e5ff';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x + offset.x, stroke[0].y + offset.y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x + offset.x, stroke[i].y + offset.y);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }, []);

  const drawUserPath = useCallback(() => {
    if (userPath.length >= 2) {
      drawStrokes([userPath]);
    }
  }, [userPath, drawStrokes]);

  useEffect(() => { 
    if (currentPattern) {
      drawTemplate(currentPattern);
    }
  }, [drawTemplate, currentPattern]);
  
  useEffect(() => {
    if (!isReplayingRef.current) {
      // Draw completed strokes
      if (drawLogs.length > 0) {
        drawStrokes(drawLogs);
      }
      
      // Draw current stroke being drawn
      if (userPath.length > 0) {
        drawUserPath();
      }
    }
  }, [drawLogs, userPath, drawStrokes, drawUserPath]);

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
      setUserPath([]);
      setDebugMsg('描画完了。スコア判定しますか？');
    }
  }, [isDrawing]);

  const handleEvaluate = useCallback(() => {
    // タイマー停止とアクティブ状態リセット
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    if (!currentPattern) return;
    
    // 難易度に応じた許容誤差を取得
    const tolerance = DIFFICULTY_TOLERANCE[difficulty];
    // スコア計算を実行
    const result = calculateScore(userPath, currentPattern, tolerance);

    // 難易度倍率を結果に適用
    result.difficultyMultiplier = DIFFICULTY_MULTIPLIER[difficulty];

    setScoreResult(result);
    setShowResult(true);
    // ハプティックフィードバック（対応デバイスのみ）
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(100);
    }
    // 親コンポーネントにスコア結果を通知
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

    // キャンバスからサムネイルを生成
    let thumbnail: string | undefined;
    try {
      const canvas = canvasRef.current;
      if (canvas) {
        thumbnail = canvas.toDataURL('image/png');
      }
    } catch {
      // サムネイル生成に失敗した場合は続行
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

    // 履歴データベースに保存
    addHistory(historyItem).catch((e) => console.error('Failed to save history:', e));
    
    // ─── 完了状況を更新 ───
    // パターン完了状況をデータベースに記録
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

  const handlePrevious = useCallback(() => {
    // Go to previous pattern if available
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
      setIsDrawing(false);
      setUserPath([]);
      setIsActive(false);
      setShowResult(false);
      setScoreResult(null);
      setActualTimeLeft(DIFFICULTY_TIME[difficulty]);
      setDebugMsg(`前のパターン: ${patterns[currentIdx - 1].name}`);
      // 描画ログもクリア
      setDrawLogs([]);
      drawLogRef.current = [];
      if (replayAnimRef.current !== null) {
        cancelAnimationFrame(replayAnimRef.current);
        replayAnimRef.current = null;
      }
      setIsReplaying(false);
    }
  }, [currentIdx, difficulty]);

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
  /**
   * 描画ログのリプレイを実行
   * 評価が済んでいない場合は先に評価を行い、履歴に保存してからリプレイページに遷移
   */
  const handleReplay = useCallback(async () => {
    // リプレイ可能かチェック（描画ログがあり、リプレイ中でないこと）
    if (drawLogs.length === 0 || isReplayingRef.current) return;
    
    // 評価がまだ行われていない場合は先に評価を実行してスコアデータを取得
    let result: ScoringResult | null = scoreResult;
    if (!result && !showResult && isDrawing && userPath.length >= 10) {
      // 評価を実行してスコアを取得
      handleEvaluate();
      // 評価完了を待つ（少し遅延させて状態更新を待機）
      await new Promise(resolve => setTimeout(resolve, 100));
      result = scoreResult;
    }
    
    // スコア結果がない場合はリプレイ用の履歴アイテムを作成できない
    if (!result) {
      setDebugMsg('スコアが計算されていないため、リプレイを保存できません');
      return;
    }
    
    // リプレイ状態を設定
    setIsReplaying(true);
    isReplayingRef.current = true;
    setIsActive(false);
    setShowResult(false);

    // サムネイル画像をキャンバスから生成
    let thumbnail: string | undefined;
    try {
      const canvas = canvasRef.current;
      if (canvas) {
        thumbnail = canvas.toDataURL('image/png');
      }
    } catch {
      // サムネイル生成に失敗した場合はサムネイルなしで続行
    }

    // 履歴アイテムを作成
    const historyItem: MagicCircleHistory = {
      id: `history_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      data: {
        seed: Math.floor(Math.random() * 1e9),
        pattern: {
          name: currentPattern.name,
          vertices: currentPattern.vertices,
          edges: currentPattern.edges,
          circles: currentPattern.circles,
        },
        drawLogs: drawLogs.map((stroke) => [...stroke]),
        timestamp: Date.now(),
      },
      score: result.score,
      rank: result.rank,
      difficulty: DIFFICULTY_LABELS[difficulty],
      difficultyMultiplier: result.difficultyMultiplier ?? 1,
      damageMultiplier: result.damageMultiplier,
      thumbnail,
      createdAt: Date.now(),
    };

    // 履歴をデータベースに保存
    try {
      await addHistory(historyItem);
      
      // URL圧縮用にデータを抽出（メタデータを除いた本体部分のみ）
      const dataForCompression = {
        pattern: historyItem.data.pattern,
        drawLogs: historyItem.data.drawLogs,
        score: historyItem.score,
        rank: historyItem.rank,
        difficulty: historyItem.difficulty,
        difficultyMultiplier: historyItem.difficultyMultiplier,
        damageMultiplier: historyItem.damageMultiplier
      };
      
      // 履歴データをURL用に圧縮
      const compressed = compressForUrlOptimized(dataForCompression);
      if (!compressed) {
        throw new Error('Failed to compress history data');
      }
      
      // リプレイページに遷移
      const replayUrl = `/replay?data=${compressed}`;
      router.push(replayUrl);
    } catch (err) {
      console.error('Failed to save history for replay:', err);
      setDebugMsg('履歴の保存に失敗しました');
      // 履歴保存に失敗した場合はリプレイ状態をリセット
      isReplayingRef.current = false;
      setIsReplaying(false);
      // 元のローカルリプレイロジックについては簡略化のためここで終了
      return;
    }
  }, [drawLogs, isReplaying, currentPattern, scoreResult, showResult, isDrawing, userPath, difficulty, handleEvaluate]);

  // ─── 魔法陣データの保存 ───
  /**
   * 現在の描画データをローカル状態に保存
   * @returns 保存された魔法陣データ（保存できない場合はnull）
   */
  const handleSaveData = useCallback((): MagicCircleData | null => {
    // 現在のパターンまたは描画ログがない場合は保存不可
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
  /**
   * 魔法陣データを読み込んでキャンバスに表示
   * @param data 読み込む魔法陣データ
   */
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
    timeLeft: actualTimeLeft, isActive, showResult, scoreResult, debugMsg, setDebugMsg,
    startPoint, patternName, currentIndex: currentIdx, totalPatterns: patterns.length,
    difficulty, difficultyLabel: DIFFICULTY_LABELS[difficulty],
    handleEvaluate, handleReset, handleNext, handlePrevious, changeDifficulty, getRankColor,
    onPointerDown, onPointerMove, onPointerUp,
    drawLogs, savedMagicData, isReplaying, handleReplay, handleSaveData, handleLoadData,
    // 完了追跡
    completionStatus,
    // 音声検知
    voiceActivation,
    setVoiceActivation
  };
}
