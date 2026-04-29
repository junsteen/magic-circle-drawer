'use client';

import MagicCircleCanvas from '@/components/MagicCircleCanvas';
import { ScoringResult } from '@/lib/scoring';
import { useState } from 'react';

export default function Home() {
  const [lastResult, setLastResult] = useState<ScoringResult | null>(null);
  const [completionStatus, setCompletionStatus] = useState<{ completed: number; total: number } | null>(null);

  const handleScore = (result: ScoringResult) => {
    setLastResult(result);
  };

  const handleReset = () => {
    setLastResult(null);
  };

  const handleCompletionUpdate = (status: { completed: number; total: number } | null) => {
    setCompletionStatus(status);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#0d0d1a' }}>
      <header className="mb-4 text-center">
        <h1
          className="text-4xl font-bold tracking-wide"
          style={{
            textShadow: '0 0 20px rgba(0, 229, 255, 0.5), 0 0 40px rgba(0, 229, 255, 0.3)',
            color: '#00e5ff',
          }}
        >
          🔮 Arcane Tracer
        </h1>
        <p className="text-gray-400 mt-2 text-sm">詠唱の正確さが威力になる</p>
      </header>

      <MagicCircleCanvas
        onScore={handleScore}
        onReset={handleReset}
        onCompletionUpdate={handleCompletionUpdate}
      />

      {lastResult && (
        <div className="mt-4 text-center">
          <div className="text-lg" style={{ color: '#7c4dff' }}>
            前回の結果: <span className="font-bold">{lastResult.rank}</span>{' '}
            (スコア: {lastResult.score}, 倍率: {lastResult.difficultyMultiplier ?? 1}x, {lastResult.damageMultiplier}ダメージ)
          </div>
        </div>
      )}
      
      {/* 完了状況表示 */}
      {completionStatus && (
        <div className="mt-4 text-center text-sm text-gray-400">
          魔法陣修得: {completionStatus.completed} / {completionStatus.total} 
          {completionStatus.completed === completionStatus.total && 
            <span className="text-lg font-bold text-green-500 ml-2">🎉 全制覇！</span>
          }
        </div>
      )}
    </div>
  );
}

