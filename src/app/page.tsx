'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import MagicCircleCanvas from '@/components/MagicCircleCanvas';
import MultiModeGame from '@/components/MultiModeGame';
import UnlockModal from '@/components/UnlockModal';
import { ScoringResult } from '@/lib/scoring';
import type { Difficulty } from '@/lib/patterns';
import {
  getAllUnlockStatus,
  checkPlayBasedUnlocks,
  type UnlockInfo,
} from '@/lib/unlocks';
import { getAllHistories } from '@/lib/historyDB';

type AppScreen =
  | { type: 'single' }
  | { type: 'multi'; difficulty: Difficulty }
  | { type: 'combo'; difficulty: Difficulty };

function HomeContent() {
  const searchParams = useSearchParams();
  const patternParam = searchParams.get('pattern');
  const initialPatternName = patternParam ? decodeURIComponent(patternParam) : undefined;

  const [screen, setScreen] = useState<AppScreen>({ type: 'single' });
  const [lastResult, setLastResult] = useState<ScoringResult | null>(null);
  const [completionStatus, setCompletionStatus] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [unlocks, setUnlocks] = useState(() => getAllUnlockStatus());
  const [unlockQueue, setUnlockQueue] = useState<UnlockInfo[]>([]);
  const initCheckedRef = useRef(false);

  // 初回マウント時: 既存プレイ数でアンロックを付与（既存ユーザー対応）
  useEffect(() => {
    if (initCheckedRef.current) return;
    initCheckedRef.current = true;
    getAllHistories().then((histories) => {
      const newUnlocks = checkPlayBasedUnlocks(histories.length);
      if (newUnlocks.length > 0) {
        setUnlockQueue((q) => [...q, ...newUnlocks]);
        setUnlocks(getAllUnlockStatus());
      }
    }).catch(() => { /* ignore */ });
  }, []);

  const handleScore = useCallback(async (result: ScoringResult) => {
    setLastResult(result);
    try {
      const histories = await getAllHistories();
      const newUnlocks = checkPlayBasedUnlocks(histories.length);
      if (newUnlocks.length > 0) {
        setUnlockQueue((q) => [...q, ...newUnlocks]);
        setUnlocks(getAllUnlockStatus());
      }
    } catch { /* ignore */ }
  }, []);

  const handleSwitchMode = useCallback((mode: 'multi' | 'combo', difficulty: Difficulty) => {
    setLastResult(null);
    setScreen({ type: mode, difficulty });
  }, []);

  const handleMultiExit = useCallback(() => {
    // マルチモード終了時にアンロック状態を再取得（コンボ解放反映）
    setUnlocks(getAllUnlockStatus());
    setScreen({ type: 'single' });
  }, []);

  const dismissUnlock = useCallback(() => {
    setUnlockQueue((q) => q.slice(1));
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: '#0d0d1a' }}
    >
      {/* アンロック通知（キュー先頭を表示） */}
      {unlockQueue.length > 0 && (
        <UnlockModal unlock={unlockQueue[0]} onClose={dismissUnlock} />
      )}

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

      {/* シングルモード */}
      {screen.type === 'single' && (
        <>
          <MagicCircleCanvas
            onScore={handleScore}
            onReset={() => setLastResult(null)}
            onCompletionUpdate={setCompletionStatus}
            initialPatternName={initialPatternName}
            unlocks={unlocks}
            onSwitchMode={handleSwitchMode}
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

      {/* マルチモード / コンボモード */}
      {(screen.type === 'multi' || screen.type === 'combo') && (
        <MultiModeGame
          difficulty={screen.difficulty}
          onExit={handleMultiExit}
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
