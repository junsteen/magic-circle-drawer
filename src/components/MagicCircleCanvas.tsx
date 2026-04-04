'use client';

import { useState } from 'react';
import type { ScoringResult } from '@/lib/scoring';
import HelpModal from './HelpModal';

export default function MagicCircleCanvas({
  onScore,
  onReset,
}: {
  onScore: (result: ScoringResult) => void;
  onReset: () => void;
}) {
  const [count, setCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center gap-8 p-10 rounded-2xl border-2 border-cyan-500" style={{ background: '#1a1a2e' }}>
      <h2 className="text-xl font-bold text-cyan-400">最小機能テスト</h2>

      <p className="text-4xl font-mono text-white">
        CLICK: {count}
      </p>

      <button
        onClick={() => {
          setCount((c) => c + 1);
          alert('ボタンが押されました！');
        }}
        className="rounded-full p-8 text-2xl font-bold text-black active:scale-95 transition-transform"
        style={{ touchAction: 'manipulation', background: '#00e5ff' }}
      >
        ここをタップ
      </button>

      <button
        onClick={() => alert('HELP OK')}
        className="rounded-full p-4 text-lg font-bold text-cyan-400"
        style={{ border: '1px solid rgba(0,229,255,0.5)' }}
      >
        ヘルプテスト
      </button>

      <div className="text-xs text-gray-500">
        これが動かない場合、ブラウザがJSイベントをブロックしています
      </div>
    </div>
  );
}
