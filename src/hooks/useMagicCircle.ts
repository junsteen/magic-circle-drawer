'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { calculateScore, type ScoringResult } from '@/lib/scoring';
import { useVoiceActivation } from '@/hooks/useVoiceActivation';
import {
  type MagicCirclePattern,
  type Difficulty,
  createPresetPattern,
  generateRandomPattern,
  DIFFICULTY_TIME,
  DIFFICULTY_MULTIPLIER,
  DIFFICULTY_TOLERANCE,
  DIFFICULTY_LABELS,
  getOuterCircle,
} from '@/lib/patterns';
import type { DrawEvent, DrawStroke, MagicCircleData, MagicCircleHistory } from '@/lib/types';
import { addHistory } from '@/lib/historyDB';
import { updateCompletion, getCompletedCount, getTotalPatternsCount } from '@/lib/completionDB';
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
  onPointerUp: (e?: React.PointerEvent) => void;
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
 * @param initialPatternName - 再編集用の初期パターン名（オプション）
 * @returns 魔法陣Canvasの状態と制御関数を含むオブジェクト
 */
export function useMagicCircle(
  onScore: (result: ScoringResult) => void,
  onReset: () => void,
  onCompletionUpdate?: (status: { completed: number; total: number } | null) => void,
  initialPatternName?: string
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
  const bgAnimRef = useRef<number | null>(null);
  const [savedMagicData, setSavedMagicData] = useState<MagicCircleData | null>(null);

  // リプレイ状態を同期するためのref（userPathエフェクトがアニメーション中にキャンバスクリアしないように）
  const isReplayingRef = useRef(false);

  // stale closure回避用ref: React再レンダリング前にポインターイベントで参照するため
  const isDrawingRef = useRef(false);
  const showResultRef = useRef(false);
  // handleEvaluateはこの位置より後で定義されるため、refで前方参照する
  const handleEvaluateRef = useRef<(() => void) | null>(null);

  // チャージアニメーション用ref
  const chargeAnimRef = useRef<number | null>(null);
  const chargeStartTimeRef = useRef<number | null>(null);
  // チャージアニメーション内のstale closure回避用ref
  const drawLogsRef = useRef<DrawStroke[]>([]);
  const userPathRef = useRef<{ x: number; y: number }[]>([]);

  // onCompletionUpdateはレンダリング毎に新しい参照になるためrefで保持（ループ防止）
  const onCompletionUpdateRef = useRef(onCompletionUpdate);
  onCompletionUpdateRef.current = onCompletionUpdate;

  // 音声検知コールバックをrefで保持（安定した参照を提供してレンダリングループを防止）
  const onVoiceDetectedRef = useRef<() => void>(() => {});
  onVoiceDetectedRef.current = () => {
    if (isActive && !showResult && userPath.length >= 10) {
      handleEvaluateRef.current?.();
      setDebugMsg('🔊 音声検知により自動評価を実行しました');
    }
  };
  const stableOnVoiceDetected = useCallback(() => onVoiceDetectedRef.current(), []);

  // 音声検知フックを初期化（コンポーネントレベルで呼び出し）
  const voiceHook = useVoiceActivation(stableOnVoiceDetected, {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceHook?.isMicAccessible, voiceHook?.isListening, voiceHook?.startListening, voiceHook?.stopListening]);

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

    // 再編集用の初期パターンが指定されている場合は該当パターンに切り替え
    if (initialPatternName) {
      const foundIdx = preset.findIndex(p => p.name === initialPatternName);
      setCurrentIdx(foundIdx !== -1 ? foundIdx : 0);
    } else {
      setCurrentIdx(0);
    }
  }, [initialPatternName]);

  // マウント時に完了状況を読み込み（refを使用してループを防止）
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
          onCompletionUpdateRef.current?.(status);
        }
      } catch (e) {
        console.error('Failed to load completion status:', e);
        if (isMounted) {
          onCompletionUpdateRef.current?.(null);
        }
      }
    }
    loadCompletionStatus();
    return () => { isMounted = false; };
  }, []);

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
  }, []);

  /**
   * チャージ演出を描画
   * 時間制限の進行度に応じて、魔法陣外周に魔力チャージ演出を表示
   * @param pattern 魔法陣パターン
   * @param progress 進行度（0-1: 0=開始、1=完了）
   * @param currentTime アニメーション用の現在時刻（ミリ秒）
   */
  const drawChargeEffect = useCallback(
    (pattern: MagicCirclePattern | null, progress: number, currentTime: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !pattern) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 外周円の情報を取得
      const { cx, cy, radius } = getOuterCircle(pattern, CANVAS_SIZE);

      // 進行度を0-1の範囲に制限
      const normalizedProgress = Math.max(0, Math.min(1, progress));

      // 終了角度（0 → 2π）
      const endAngle = Math.PI * 2 * normalizedProgress;

      // 開始角度（-π/2 で上から開始）
      const startAngle = -Math.PI / 2;

      // ─── 微振動エフェクト ───
      // 進行度に応じて振動幅を増加（±30%まで広がる）
      const vibrationAmount = Math.sin(currentTime / 80) * (normalizedProgress * 0.3);
      const baseLineWidth = 1.5;
      const lineWidth = Math.max(0.5, baseLineWidth * (1 + vibrationAmount));

      // ─── メイン円弧の描画 ───
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + endAngle, false);
      ctx.stroke();

      // ─── 終端の光点（魔力の集束） ───
      if (normalizedProgress > 0.05) {
        const endPointAngle = startAngle + endAngle;
        const endX = cx + radius * Math.cos(endPointAngle);
        const endY = cy + radius * Math.sin(endPointAngle);

        // 発光効果
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00e5ff';
        ctx.fillStyle = 'rgba(0, 229, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(endX, endY, 5 + normalizedProgress * 3, 0, Math.PI * 2);
        ctx.fill();

        // 外側の光輪
        ctx.shadowBlur = 8;
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(endX, endY, 8 + normalizedProgress * 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ─── チャージ完了時のフラッシュ ───
      if (normalizedProgress >= 0.98) {
        // フラッシュの透明度を計算（完了に近づくほど明るく）
        const flashIntensity = Math.max(0, (normalizedProgress - 0.98) / 0.02);
        const flashAlpha = flashIntensity * 0.3;

        // 完了時の白い円弧フラッシュ
        ctx.strokeStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.lineWidth = 6;
        ctx.shadowBlur = 16;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, startAngle + endAngle, false);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
    },
    []
  );

  const drawStrokes = useCallback((strokes: { x: number; y: number }[][], offset: { x: number; y: number } = { x: 0, y: 0 }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.shadowBlur = 2;
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

  // ─── チャージアニメーションループ ───
  useEffect(() => {
    if (!isActive || !currentPattern) {
      if (chargeAnimRef.current !== null) {
        cancelAnimationFrame(chargeAnimRef.current);
        chargeAnimRef.current = null;
      }
      chargeStartTimeRef.current = null;
      return;
    }

    const maxTime = DIFFICULTY_TIME[difficulty];
    chargeStartTimeRef.current = performance.now();

    const animate = (now: number) => {
      if (!chargeStartTimeRef.current || !currentPattern) return;

      // 経過時間から進行度を計算
      const elapsed = now - chargeStartTimeRef.current;
      const progress = Math.min(1, elapsed / (maxTime * 1000));

      // 毎フレームキャンバスを再描画して重ね塗りによる線の太さ蓄積を防ぐ
      drawTemplate(currentPattern);
      if (drawLogsRef.current.length > 0) {
        drawStrokes(drawLogsRef.current);
      }
      if (userPathRef.current.length >= 2) {
        drawStrokes([userPathRef.current]);
      }
      drawChargeEffect(currentPattern, progress, now);

      chargeAnimRef.current = requestAnimationFrame(animate);
    };

    chargeAnimRef.current = requestAnimationFrame(animate);

    return () => {
      if (chargeAnimRef.current !== null) {
        cancelAnimationFrame(chargeAnimRef.current);
        chargeAnimRef.current = null;
      }
      chargeStartTimeRef.current = null;
    };
  }, [isActive, currentPattern, difficulty, drawChargeEffect, drawTemplate, drawStrokes]);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }, []);

  const startDrawing = useCallback((pos: { x: number; y: number }) => {
    if (showResultRef.current || isReplayingRef.current) return;
    if (!isActive) setIsActive(true);
    isDrawingRef.current = true;
    setIsDrawing(true);
    setUserPath([{ x: pos.x, y: pos.y }]);
    // 描画ログ記録: start タイミングで新しいストロークを開始
    strokeStartTimeRef.current = performance.now();
    drawLogRef.current = [{ x: pos.x, y: pos.y, t: 0, type: 'start' }];
    setDebugMsg('描画中...');
  }, [isActive]);

  const draw = useCallback((pos: { x: number; y: number }) => {
    if (!isDrawingRef.current || showResultRef.current || isReplayingRef.current) return;
    setUserPath((prev) => [...prev, { x: pos.x, y: pos.y }]);
    // 描画ログ記録: move イベント
    const elapsed = performance.now() - strokeStartTimeRef.current;
    drawLogRef.current.push({ x: pos.x, y: pos.y, t: elapsed, type: 'move' });
  }, []);

  // ネイティブポインターイベントリスナーをキャンバスに直接アタッチ
  // (React合成イベントの問題を回避)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      startDrawing(getCanvasPos(e.clientX, e.clientY));
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isDrawingRef.current) {
        e.preventDefault();
        draw(getCanvasPos(e.clientX, e.clientY));
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (isDrawingRef.current) {
        e.preventDefault();
        // pointerleave の二重発火を防ぐため ref を先に false にする
        isDrawingRef.current = false;
        setIsDrawing(false);
        const elapsed = performance.now() - strokeStartTimeRef.current;
        const lastPoint = drawLogRef.current[drawLogRef.current.length - 1];
        if (lastPoint) {
          drawLogRef.current.push({ x: lastPoint.x, y: lastPoint.y, t: elapsed, type: 'end' });
        }
        const strokeToSave = [...drawLogRef.current];
        setDrawLogs((prev) => [...prev, strokeToSave]);
        drawLogRef.current = [];
        setUserPath([]);
        setDebugMsg('描画完了。スコア判定しますか？');
        canvas.releasePointerCapture(e.pointerId);
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown, true);
    canvas.addEventListener('pointermove', handlePointerMove, true);
    canvas.addEventListener('pointerup', handlePointerUp, true);
    canvas.addEventListener('pointerleave', handlePointerUp, true);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown, true);
      canvas.removeEventListener('pointermove', handlePointerMove, true);
      canvas.removeEventListener('pointerup', handlePointerUp, true);
      canvas.removeEventListener('pointerleave', handlePointerUp, true);
    };
  }, [isDrawing, startDrawing, draw, getCanvasPos]);

  useEffect(() => {
    drawLogsRef.current = drawLogs;
    userPathRef.current = userPath;
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

  // 結果表示中に背景でリプレイアニメーションをループ再生
  useEffect(() => {
    if (!showResult || drawLogs.length === 0 || !currentPattern) {
      if (bgAnimRef.current !== null) {
        cancelAnimationFrame(bgAnimRef.current);
        bgAnimRef.current = null;
      }
      return;
    }

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

    if (allEvents.length === 0) return;
    const totalDuration = allEvents[allEvents.length - 1].t + STROKE_INTERVAL_MS;

    let startTime: number | null = null;

    const animate = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = (now - startTime) % totalDuration;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      drawTemplate(currentPattern);

      // 二分探索で elapsed 以前のイベント数を O(log n) で取得
      let lo = 0, hi = allEvents.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (allEvents[mid].t <= elapsed) lo = mid + 1;
        else hi = mid;
      }
      const cutoff = lo;

      if (cutoff > 1) {
        ctx.shadowBlur = 2;
        ctx.shadowColor = '#00e5ff';
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(allEvents[0].x, allEvents[0].y);
        for (let i = 1; i < cutoff; i++) {
          ctx.lineTo(allEvents[i].x, allEvents[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        const last = allEvents[cutoff - 1];
        ctx.shadowBlur = 2;
        ctx.shadowColor = '#00e5ff';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 1;
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.arc(last.x, last.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      bgAnimRef.current = requestAnimationFrame(animate);
    };

    bgAnimRef.current = requestAnimationFrame(animate);

    return () => {
      if (bgAnimRef.current !== null) {
        cancelAnimationFrame(bgAnimRef.current);
        bgAnimRef.current = null;
      }
    };
  }, [showResult, drawLogs, currentPattern, drawTemplate]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (canvasRef.current) {
      canvasRef.current.setPointerCapture(e.pointerId);
    }
    startDrawing(getCanvasPos(e.clientX, e.clientY));
  }, [startDrawing, getCanvasPos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (isDrawingRef.current) draw(getCanvasPos(e.clientX, e.clientY));
  }, [draw, getCanvasPos]);

  const onPointerUp = useCallback((e?: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);
    // 描画ログ記録: end イベントでストロークを保存
    const elapsed = performance.now() - strokeStartTimeRef.current;
    const lastPoint = drawLogRef.current[drawLogRef.current.length - 1];
    if (lastPoint) {
      drawLogRef.current.push({ x: lastPoint.x, y: lastPoint.y, t: elapsed, type: 'end' });
    }
    // drawLogRef.current を先にキャプチャしてから clearする
    // setDrawLogs updater は React バッチ処理で遅延実行されるため、
    // その時点では drawLogRef.current が既に [] にクリアされている
    const strokeToSave = [...drawLogRef.current];
    drawLogRef.current = [];
    setDrawLogs((prev) => [...prev, strokeToSave]);
    setUserPath([]);
    setDebugMsg('描画完了。スコア判定しますか？');
    if (e && canvasRef.current) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }
  }, []);

  const handleEvaluate = useCallback(() => {
    // タイマー停止とアクティブ状態リセット
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    if (!currentPattern) return;
    
    // 難易度に応じた許容誤差を取得
    const tolerance = DIFFICULTY_TOLERANCE[difficulty];
    // drawLogs（完了済みストローク）から採点用パスを再構築
    // userPath はストローク終了後にクリアされるため、drawLogs を使用する
    const scoringPath = drawLogs.flatMap(stroke =>
      stroke.filter(e => e.type !== 'end').map(e => ({ x: e.x, y: e.y }))
    );
    // drawLogs が空の場合（ストローク完了前に評価した場合）は userPath にフォールバック
    const pathToScore = scoringPath.length >= 10 ? scoringPath : userPath;
    // スコア計算を実行
    const result = calculateScore(pathToScore, currentPattern, tolerance);

    // 難易度倍率を結果に適用
    result.difficultyMultiplier = DIFFICULTY_MULTIPLIER[difficulty];

    setScoreResult(result);
    showResultRef.current = true;
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

  // handleEvaluateRefを最新のhandleEvaluateと同期（音声検知コールバックからアクセスするため）
  useEffect(() => {
    handleEvaluateRef.current = handleEvaluate;
  });

  const handleReset = useCallback(() => {
    isDrawingRef.current = false;
    showResultRef.current = false;
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
    isDrawingRef.current = false;
    showResultRef.current = false;
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
      isDrawingRef.current = false;
      showResultRef.current = false;
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
  }, [currentIdx, difficulty, patterns]);

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

    // スコア結果がない場合はリプレイ用の履歴アイテムを作成できない
    // （リプレイボタンは showResult=true のときのみ表示されるため scoreResult は必ず存在する）
    const result: ScoringResult | null = scoreResult;
    if (!result) {
      setDebugMsg('スコアが計算されていないため、リプレイを保存できません');
      return;
    }
    
    // リプレイ状態を設定
    setIsReplaying(true);
    isReplayingRef.current = true;
    setIsActive(false);
    showResultRef.current = false;
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
      difficultyMultiplier: result.difficultyMultiplier,
      damageMultiplier: result.damageMultiplier,
      thumbnail,
      createdAt: Date.now(),
    };

    // URL圧縮用にデータを抽出（compressForUrlOptimized の期待するフラット構造）
    const dataForCompression = {
      pattern: historyItem.data.pattern,
      drawLogs: historyItem.data.drawLogs,
      score: historyItem.score,
      rank: historyItem.rank,
      difficulty: historyItem.difficulty,
      difficultyMultiplier: historyItem.difficultyMultiplier,
      damageMultiplier: historyItem.damageMultiplier,
      createdAt: historyItem.createdAt,
    };

    // 履歴データをURL用に圧縮
    const compressed = compressForUrlOptimized(dataForCompression);
    if (!compressed) {
      setDebugMsg('データの圧縮に失敗しました');
      isReplayingRef.current = false;
      setIsReplaying(false);
      return;
    }

    // IndexedDB保存はナビゲーションをブロックしない（失敗しても遷移は続行）
    addHistory(historyItem).catch(err => {
      console.error('Failed to save history:', err);
    });

    // リプレイページに遷移
    const replayUrl = `/replay?data=${compressed}`;
    router.push(replayUrl);
  }, [drawLogs, currentPattern, scoreResult, showResult, difficulty, router]);

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
