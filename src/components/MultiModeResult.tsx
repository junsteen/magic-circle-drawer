'use client';

import { useEffect, useRef, useState } from 'react';
import { tryUnlock, isComboModeUnlocked, type UnlockInfo } from '@/lib/unlocks';
import UnlockModal from './UnlockModal';
import type { ScoringResult } from '@/lib/scoring';
import type { Difficulty } from '@/lib/patterns';

export interface MultiModeGameResult {
  circlesCleared: number;
  scores: ScoringResult[];
  avgScore: number;
  overallRank: string;
  timeLeftOnEnd: number;
  difficulty: Difficulty;
}

interface Props {
  result: MultiModeGameResult;
  onExit: () => void;
}

const RANK_COLORS: Record<string, string> = {
  S: '#ffd700',
  A: '#00e5ff',
  B: '#76ff03',
  C: '#aaaaaa',
};

export default function MultiModeResult({ result, onExit }: Props) {
  const [unlockInfo, setUnlockInfo] = useState<UnlockInfo | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    if (!isComboModeUnlocked()) {
      const { newlyUnlocked, info } = tryUnlock(result.timeLeftOnEnd, result.overallRank);
      if (newlyUnlocked && info) setUnlockInfo(info);
    }
  }, [result.timeLeftOnEnd, result.overallRank]);

  const rankColor = RANK_COLORS[result.overallRank] ?? '#aaaaaa';
  const totalScore = result.scores.reduce((s, r) => s + r.score, 0);
  const isQualified =
    result.timeLeftOnEnd >= 1 && (result.overallRank === 'S' || result.overallRank === 'A');
  const qualifyCount =
    typeof window !== 'undefined'
      ? parseInt(localStorage.getItem('arcane_multi_qualify_count') ?? '0', 10)
      : 0;

  return (
    <>
      {unlockInfo && <UnlockModal unlock={unlockInfo} onClose={() => setUnlockInfo(null)} />}

      <div className="flex flex-col items-center gap-5 p-6 max-w-sm w-full">
        <h2 className="text-lg font-bold" style={{ color: '#7c4dff' }}>⚡ マルチモード 結果</h2>

        <div className="text-8xl font-bold" style={{ color: rankColor }}>
          {result.overallRank}
        </div>

        <div
          className="w-full rounded-xl border p-4 space-y-3"
          style={{ borderColor: 'rgba(0,229,255,0.2)', background: 'rgba(0,229,255,0.03)' }}
        >
          <Row label="クリア枚数" value={`${result.circlesCleared}枚`} />
          <Row label="平均スコア" value={`${Math.round(result.avgScore)}点`} />
          <Row label="合計スコア" value={`${totalScore}点`} />
          <Row label="難易度" value={result.difficulty.toUpperCase()} valueColor="#00e5ff" />
          {result.timeLeftOnEnd > 0 && (
            <Row label="残り時間" value={`${result.timeLeftOnEnd}秒`} valueColor="#76ff03" />
          )}
        </div>

        {!isComboModeUnlocked() && isQualified && (
          <p className="text-sm text-center px-2" style={{ color: '#ffd700' }}>
            ✨ 条件クリア！（{Math.min(qualifyCount, 3)} / 3 回達成）
          </p>
        )}

        <button
          onClick={onExit}
          className="w-full px-8 py-3 rounded-lg font-bold text-black transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #7c4dff, #00e5ff)' }}
        >
          ホームに戻る
        </button>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  valueColor = '#ffffff',
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="font-bold" style={{ color: valueColor }}>{value}</span>
    </div>
  );
}
