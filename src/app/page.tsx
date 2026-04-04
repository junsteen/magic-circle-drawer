'use client';

import MagicCircleCanvas from '@/components/MagicCircleCanvas';
import { Difficulty, DIFFICULTY_MULTIPLIER } from '@/lib/patterns';
import { ScoringResult } from '@/lib/scoring';
import { useState } from 'react';

export default function Home() {
  const [lastResult, setLastResult] = useState<ScoringResult | null>(null);

  const handleScore = (result: ScoringResult) => {
    setLastResult(result);
  };

  const handleReset = () => {
    setLastResult(null);
  };

  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

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

      {/* 難易度セレクター */}
      <DifficultySelector currentDifficulty={difficulty} onChange={setDifficulty} />

      <MagicCircleCanvas onScore={handleScore} onReset={handleReset} initialDifficulty={difficulty} />

      {lastResult && (
        <div className="mt-4 text-center">
          <div className="text-lg" style={{ color: '#7c4dff' }}>
            前回の結果: <span className="font-bold">{lastResult.rank}</span>{' '}
            (スコア: {lastResult.score}, 倍率: {lastResult.difficultyMultiplier ?? 1}x, {lastResult.damageMultiplier}ダメージ)
          </div>
        </div>
      )}
    </div>
  );
}

interface DifficultySelectorProps {
  currentDifficulty: Difficulty;
  onChange: (d: Difficulty) => void;
}

function DifficultySelector({ currentDifficulty, onChange }: DifficultySelectorProps) {
  const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'expert'];
  const colorMap: Record<Difficulty, string> = {
    easy: '#76ff03',
    normal: '#00e5ff',
    hard: '#ff9100',
    expert: '#ff4081',
  };

  return (
    <div className="mb-3 flex gap-2">
      {difficulties.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`rounded-md px-4 py-1.5 text-sm font-bold transition-all ${
            currentDifficulty === d ? 'scale-110' : 'opacity-50 hover:opacity-75'
          }`}
          style={{
            borderColor: colorMap[d],
            borderWidth: 2,
            borderStyle: 'solid',
            color: currentDifficulty === d ? colorMap[d] : '#999',
            background: currentDifficulty === d ? `${colorMap[d]}18` : 'transparent',
          }}
        >
          {d.toUpperCase()}
          <span className="ml-1 text-xs opacity-75">(×{DIFFICULTY_MULTIPLIER[d]})</span>
        </button>
      ))}
    </div>
  );
}
