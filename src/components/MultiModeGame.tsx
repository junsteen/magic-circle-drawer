'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMagicCircle } from '@/hooks/useMagicCircle';
import type { ScoringResult } from '@/lib/scoring';
import type { Difficulty } from '@/lib/patterns';
import {
  MULTI_MODE_INITIAL_TIME,
  MULTI_MODE_BONUS_TIME,
  MULTI_MODE_RESULT_DISPLAY_MS,
  calcOverallRank,
} from '@/lib/multiModeConstants';
import MultiModeResult from './MultiModeResult';

interface Props {
  difficulty: Difficulty;
  onExit: () => void;
}

export default function MultiModeGame({ difficulty, onExit }: Props) {
  const initialTime = MULTI_MODE_INITIAL_TIME[difficulty];

  const [globalTimeLeft, setGlobalTimeLeft] = useState(initialTime);
  const [isGameRunning, setIsGameRunning] = useState(true);
  const [circlesCleared, setCirclesCleared] = useState(0);
  const [scores, setScores] = useState<ScoringResult[]>([]);
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const [gameResult, setGameResult] = useState<import('./MultiModeResult').MultiModeGameResult | null>(null);

  // stale closure 回避用 ref
  const globalTimeLeftRef = useRef(globalTimeLeft);
  const scoresRef = useRef(scores);
  const circlesClearedRef = useRef(circlesCleared);
  const gameEndedRef = useRef(false);

  useEffect(() => { globalTimeLeftRef.current = globalTimeLeft; }, [globalTimeLeft]);
  useEffect(() => { scoresRef.current = scores; }, [scores]);
  useEffect(() => { circlesClearedRef.current = circlesCleared; }, [circlesCleared]);

  // 1枚クリア時のスコアコールバック（useMagicCircle に渡す）
  const handleCircleScore = useCallback((result: ScoringResult) => {
    setScores(prev => [...prev, result]);
    setCirclesCleared(prev => prev + 1);
    // クリアボーナス加算（初期時間を上限）
    setGlobalTimeLeft(prev => Math.min(prev + MULTI_MODE_BONUS_TIME, initialTime));
    setAutoAdvancing(true);
  }, [initialTime]);

  const {
    canvasRef, canvasSize,
    timeLeft, isActive, showResult, scoreResult, userPath,
    handleNext, handleReset, handleEvaluate, changeDifficulty,
    onPointerDown, onPointerMove, onPointerUp,
    isReplaying, patternName, getRankColor,
  } = useMagicCircle(handleCircleScore, () => {});

  // 難易度を同期（generateRandomPattern が正しい難易度でパターンを生成するよう）
  useEffect(() => {
    changeDifficulty(difficulty);
  }, [difficulty, changeDifficulty]);

  // 結果表示後に自動的に次の魔法陣へ
  useEffect(() => {
    if (!autoAdvancing) return;
    const timer = setTimeout(() => {
      handleNext();
      setAutoAdvancing(false);
    }, MULTI_MODE_RESULT_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [autoAdvancing, handleNext]);

  // 1枚ごとのタイムアウト → 自動評価または自動スキップ
  useEffect(() => {
    if (timeLeft > 0 || isActive || showResult || !isGameRunning || autoAdvancing) return;
    const timer = setTimeout(() => {
      if (userPath.length > 0) {
        handleEvaluate(); // onScore → handleCircleScore → autoAdvancing
      } else {
        handleNext(); // 何も描かなかった場合はスキップ
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [timeLeft, isActive, showResult, isGameRunning, autoAdvancing, userPath.length, handleEvaluate, handleNext]);

  // グローバルタイマー
  useEffect(() => {
    if (!isGameRunning) return;
    const interval = setInterval(() => {
      setGlobalTimeLeft(prev => {
        if (prev <= 1) {
          setIsGameRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isGameRunning]);

  // グローバルタイマーが 0 → ゲーム終了
  useEffect(() => {
    if (!isGameRunning && globalTimeLeft === 0 && !gameEndedRef.current) {
      gameEndedRef.current = true;
      endGame(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameRunning, globalTimeLeft]);

  const endGame = useCallback((timeLeftOnEnd: number) => {
    const currentScores = scoresRef.current;
    const avgScore =
      currentScores.length > 0
        ? currentScores.reduce((sum, r) => sum + r.score, 0) / currentScores.length
        : 0;
    setGameResult({
      circlesCleared: circlesClearedRef.current,
      scores: currentScores,
      avgScore,
      overallRank: calcOverallRank(avgScore),
      timeLeftOnEnd,
      difficulty,
    });
  }, [difficulty]);

  const handleEndSession = useCallback(() => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    setIsGameRunning(false);
    endGame(globalTimeLeftRef.current);
  }, [endGame]);

  if (gameResult) {
    return <MultiModeResult result={gameResult} onExit={onExit} />;
  }

  const timerPercent = (globalTimeLeft / initialTime) * 100;
  const timerColor =
    timerPercent > 50 ? '#76ff03' : timerPercent > 25 ? '#ff9100' : '#ff4081';

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* グローバルタイマー HUD */}
      <div className="w-full max-w-[350px]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold tabular-nums" style={{ color: timerColor }}>
            ⏱ {globalTimeLeft}s
          </span>
          <span className="text-sm font-bold" style={{ color: '#00e5ff' }}>
            ✅ {circlesCleared}枚
          </span>
          <button
            onClick={handleEndSession}
            className="text-xs px-3 py-1 rounded-md border font-bold transition-colors hover:bg-gray-700"
            style={{ borderColor: '#ff4081', color: '#ff4081' }}
          >
            終了
          </button>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1a1a2e' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${timerPercent}%`, background: timerColor }}
          />
        </div>
      </div>

      {/* パターン名 */}
      <div className="text-sm font-bold" style={{ color: '#7c4dff' }}>
        {patternName || '準備中...'}
      </div>

      {/* キャンバス */}
      <div
        className="relative w-[350px] max-w-full"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="rounded-lg border-2 border-gray-700 w-full h-auto touch-none"
          style={{
            background: '#0a0a14',
            display: 'block',
            pointerEvents: isReplaying || autoAdvancing ? 'none' : 'auto',
            touchAction: 'none',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />

        {/* 1枚クリア時の結果オーバーレイ（自動遷移） */}
        {showResult && scoreResult && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg"
            style={{ background: 'rgba(13,13,26,0.93)' }}
          >
            <div
              className="text-7xl font-bold"
              style={{ color: getRankColor(scoreResult.rank) }}
            >
              {scoreResult.rank}
            </div>
            <div className="text-3xl font-bold text-white">{scoreResult.score}点</div>
            <div className="text-sm" style={{ color: '#76ff03' }}>
              +{MULTI_MODE_BONUS_TIME}秒 ボーナス
            </div>
            <div className="text-xs text-gray-400 animate-pulse mt-1">
              次の魔法陣へ...
            </div>
          </div>
        )}

        {/* グローバルタイマー終了オーバーレイ */}
        {!isGameRunning && globalTimeLeft === 0 && !gameResult && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-lg"
            style={{ background: 'rgba(13,13,26,0.93)' }}
          >
            <div className="text-2xl font-bold" style={{ color: '#ff4081' }}>
              ⏰ 時間終了！
            </div>
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-3">
        <button
          onClick={handleEvaluate}
          disabled={showResult || autoAdvancing || isReplaying}
          className="cursor-pointer rounded-md px-6 py-2 font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #00e5ff, #7c4dff)' }}
        >
          詠唱完了！
        </button>
        <button
          onClick={handleReset}
          disabled={autoAdvancing}
          className="cursor-pointer rounded-md border-2 border-gray-600 px-6 py-2 font-bold transition-colors hover:bg-gray-800 disabled:opacity-40"
        >
          リセット
        </button>
      </div>
    </div>
  );
}
