'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import MagicCircleCanvas from '@/components/MagicCircleCanvas';
import ModeSelectScreen, { type GameMode } from '@/components/ModeSelectScreen';
import MultiModeGame from '@/components/MultiModeGame';
import { ScoringResult } from '@/lib/scoring';
import type { Difficulty } from '@/lib/patterns';

type AppScreen =
  | { type: 'mode-select' }
  | { type: 'single' }
  | { type: 'multi'; difficulty: Difficulty }
  | { type: 'combo'; difficulty: Difficulty };

function HomeContent() {
  const searchParams = useSearchParams();
  const patternParam = searchParams.get('pattern');
  const initialPatternName = patternParam ? decodeURIComponent(patternParam) : undefined;

  // 再編集URLからの遷移は直接シングルモードへ
  const [screen, setScreen] = useState<AppScreen>(
    initialPatternName ? { type: 'single' } : { type: 'mode-select' }
  );

  const [lastResult, setLastResult] = useState<ScoringResult | null>(null);
  const [completionStatus, setCompletionStatus] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  const handleModeSelect = (mode: GameMode, difficulty?: Difficulty) => {
    if (mode === 'single') {
      setScreen({ type: 'single' });
    } else if (mode === 'multi') {
      setScreen({ type: 'multi', difficulty: difficulty ?? 'normal' });
    } else if (mode === 'combo') {
      setScreen({ type: 'combo', difficulty: difficulty ?? 'normal' });
    }
  };

  const goToModeSelect = () => {
    setLastResult(null);
    setScreen({ type: 'mode-select' });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: '#0d0d1a' }}
    >
      <header className="mb-4 text-center">
        <h1
          className="text-4xl font-bold tracking-wide"
          style={{
            textShadow:
              '0 0 20px rgba(0, 229, 255, 0.5), 0 0 40px rgba(0, 229, 255, 0.3)',
            color: '#00e5ff',
          }}
        >
          🔮 Arcane Tracer
        </h1>
        <p className="text-gray-400 mt-2 text-sm">詠唱の正確さが威力になる</p>
      </header>

      {/* モード選択 */}
      {screen.type === 'mode-select' && (
        <ModeSelectScreen onSelect={handleModeSelect} />
      )}

      {/* シングルモード */}
      {screen.type === 'single' && (
        <>
          <button
            onClick={goToModeSelect}
            className="mb-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← モード選択に戻る
          </button>
          <MagicCircleCanvas
            onScore={setLastResult}
            onReset={() => setLastResult(null)}
            onCompletionUpdate={setCompletionStatus}
            initialPatternName={initialPatternName}
          />
          {lastResult && (
            <div className="mt-4 text-center">
              <div className="text-lg" style={{ color: '#7c4dff' }}>
                前回の結果:{' '}
                <span className="font-bold">{lastResult.rank}</span>{' '}
                (スコア: {lastResult.score}, 倍率:{' '}
                {lastResult.difficultyMultiplier}x, {lastResult.damageMultiplier}
                ダメージ)
              </div>
            </div>
          )}
          {completionStatus && (
            <div className="mt-4 text-center text-sm text-gray-400">
              魔法陣修得: {completionStatus.completed} / {completionStatus.total}
              {completionStatus.completed === completionStatus.total && (
                <span className="text-lg font-bold text-green-500 ml-2">
                  🎉 全制覇！
                </span>
              )}
            </div>
          )}
        </>
      )}

      {/* マルチモード / コンボモード（現時点はコンボもマルチと同じゲームロジック） */}
      {(screen.type === 'multi' || screen.type === 'combo') && (
        <MultiModeGame
          difficulty={screen.difficulty}
          onExit={goToModeSelect}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex flex-col items-center justify-center p-4"
          style={{ background: '#0d0d1a' }}
        >
          <div className="text-gray-400">読み込み中...</div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
