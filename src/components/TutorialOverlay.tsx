'use client';

import { useState } from 'react';
import TutorialCanvasAnimation from './TutorialCanvasAnimation';

interface TutorialOverlayProps {
  onStart: () => void;
}

const steps = [
  {
    title: '🔮 Arcane Tracerへようこそ！',
    body: '魔法陣をお手本通りになぞって、正確さを競うアプリです。',
    showCanvas: false,
  },
  {
    title: '📐 手順',
    body: '画面に表示される灰色の魔法陣を、赤い点の位置から指でなぞってください。\n\n制限時間は難易度により異なります。',
    showCanvas: false,
  },
  {
    title: '✨ お手本アニメーション',
    body: '以下のように光りながら描画されます。STARTの位置から始めて、番号順に辺をなぞってください！',
    showCanvas: true,
  },
  {
    title: '⚡ 詠唱完了！',
    body: '描き終わったら「詠唱完了！」ボタンを押してスコア判定を受けましょう。\n\nS/A/B/Cランクで評価され、正確さに応じてスコアが決定します！\n\nよい魔力を！',
    showCanvas: false,
  },
];

/** チュートリアルオーバーレイ（初回表示+アニメーション） */
export default function TutorialOverlay({ onStart }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);

  const nextStep = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onStart();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center tutorial-overlay"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <div
        className="mx-4 max-w-sm rounded-xl p-6 text-center"
        style={{ background: '#1a1a2e', border: '1px solid rgba(0,229,255,0.3)' }}
      >
        <h2 className="mb-3 text-xl font-bold" style={{ color: '#00e5ff' }}>
          {steps[step].title}
        </h2>
        <p className="mb-4 whitespace-pre-line text-sm" style={{ color: '#c0c0e0' }}>
          {steps[step].body}
        </p>

        {steps[step].showCanvas && (
          <div className="mb-4">
            <TutorialCanvasAnimation />
          </div>
        )}

        <div className="mb-4 flex justify-center gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full transition-all"
              style={{ background: i <= step ? '#00e5ff' : '#333366' }}
            />
          ))}
        </div>
        <button
          onClick={nextStep}
          className="w-full rounded-md py-2 font-bold text-black transition-opacity hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #00e5ff, #7c4dff)' }}
        >
          {step < steps.length - 1 ? '次へ →' : '始める ✨'}
        </button>
      </div>
    </div>
  );
}
