'use client';

import { useEffect, useState } from 'react';
import { isComboModeUnlocked, getQualifyCount } from '@/lib/unlocks';
import type { Difficulty } from '@/lib/patterns';

export type GameMode = 'single' | 'multi' | 'combo';

const DIFFICULTIES: { value: Difficulty; label: string; color: string }[] = [
  { value: 'easy',   label: 'EASY',   color: '#76ff03' },
  { value: 'normal', label: 'NORMAL', color: '#00e5ff' },
  { value: 'hard',   label: 'HARD',   color: '#ff9100' },
  { value: 'expert', label: 'EXPERT', color: '#ff4081' },
];

interface Props {
  onSelect: (mode: GameMode, difficulty?: Difficulty) => void;
}

export default function ModeSelectScreen({ onSelect }: Props) {
  const [comboUnlocked, setComboUnlocked] = useState(false);
  const [qualifyCount, setQualifyCount] = useState(0);
  const [pendingMode, setPendingMode] = useState<GameMode | null>(null);

  useEffect(() => {
    setComboUnlocked(isComboModeUnlocked());
    setQualifyCount(getQualifyCount());
  }, []);

  // シングルモードは難易度選択なし（ゲーム内で変更可）
  if (pendingMode === 'single') {
    onSelect('single');
    return null;
  }

  // マルチ/コンボモードの難易度選択
  if (pendingMode === 'multi' || pendingMode === 'combo') {
    return (
      <div className="flex flex-col items-center gap-4 p-4 w-full max-w-sm">
        <button
          onClick={() => setPendingMode(null)}
          className="self-start text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← 戻る
        </button>
        <p className="text-sm text-gray-400">難易度を選択</p>
        {DIFFICULTIES.map(({ value, label, color }) => (
          <button
            key={value}
            onClick={() => onSelect(pendingMode, value)}
            className="w-full rounded-xl border-2 p-4 text-left transition-all hover:scale-105 active:scale-95"
            style={{ borderColor: color, background: `${color}10` }}
          >
            <span className="text-lg font-bold" style={{ color }}>{label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full max-w-sm">
      <p className="text-sm text-gray-400">ゲームモードを選択</p>

      {/* シングルモード */}
      <button
        onClick={() => setPendingMode('single')}
        className="w-full rounded-xl border-2 p-5 text-left transition-all hover:scale-105 active:scale-95"
        style={{ borderColor: '#00e5ff', background: 'rgba(0,229,255,0.05)' }}
      >
        <div className="text-xl font-bold mb-1" style={{ color: '#00e5ff' }}>⚔️ シングルモード</div>
        <p className="text-sm text-gray-400">1枚の魔法陣を丁寧に詠唱する</p>
      </button>

      {/* マルチモード */}
      <button
        onClick={() => setPendingMode('multi')}
        className="w-full rounded-xl border-2 p-5 text-left transition-all hover:scale-105 active:scale-95"
        style={{ borderColor: '#7c4dff', background: 'rgba(124,77,255,0.05)' }}
      >
        <div className="text-xl font-bold mb-1" style={{ color: '#7c4dff' }}>⚡ マルチモード</div>
        <p className="text-sm text-gray-400">時間制限内に何枚もの魔法陣を詠唱する</p>
        {!comboUnlocked && qualifyCount > 0 && (
          <p className="text-xs mt-1" style={{ color: '#ffd700' }}>
            コンボ解放まであと {3 - qualifyCount} 回
          </p>
        )}
      </button>

      {/* コンボモード（解放済み or 施錠表示） */}
      {comboUnlocked ? (
        <button
          onClick={() => setPendingMode('combo')}
          className="w-full rounded-xl border-2 p-5 text-left transition-all hover:scale-105 active:scale-95"
          style={{ borderColor: '#ffd700', background: 'rgba(255,215,0,0.05)' }}
        >
          <div className="text-xl font-bold mb-1" style={{ color: '#ffd700' }}>🔥 コンボモード</div>
          <p className="text-sm text-gray-400">連続高得点でコンボ倍率アップ！（Coming soon）</p>
        </button>
      ) : (
        <div
          className="w-full rounded-xl border-2 p-5 opacity-40 cursor-not-allowed select-none"
          style={{ borderColor: '#555', background: 'rgba(85,85,85,0.05)' }}
        >
          <div className="text-xl font-bold mb-1 text-gray-500">🔒 ???</div>
          <p className="text-sm text-gray-600">マルチモードで腕を磨くと解放される</p>
        </div>
      )}
    </div>
  );
}
