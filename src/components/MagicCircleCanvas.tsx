'use client';

import { useState } from 'react';
import type { ScoringResult } from '@/lib/scoring';

export default function MagicCircleCanvas({
  onScore,
  onReset,
}: {
  onScore: (result: ScoringResult) => void;
  onReset: () => void;
}) {
  const [count, setCount] = useState(0);
  const [lastEvent, setLastEvent] = useState('-');

  const handleTap = (e: React.PointerEvent) => {
    e.stopPropagation();
    setCount((c) => c + 1);
    setLastEvent(`pointerDown #${count + 1}`);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-10 rounded-2xl border-2 border-cyan-500" style={{ background: '#1a1a2e', minHeight: 300 }}>
      <h2 className="text-xl font-bold text-cyan-400">イベント検知テスト</h2>

      <p className="text-6xl font-mono select-none text-white">{count}</p>
      <p className="text-xs font-mono text-green-400">Last: {lastEvent}</p>

      <button
        onPointerDown={handleTap}
        className="rounded-full p-8 text-2xl font-bold text-black active:scale-90 transition-transform"
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          background: '#00e5ff',
          boxShadow: '0 0 20px rgba(0,229,255,0.5)',
        }}
      >
        ここをタップ
      </button>

      <p className="text-xs text-gray-400">
        アニメーションが動くなら、onPointerDownも届くはずです
      </p>
    </div>
  );
}
