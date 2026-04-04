'use client';

import { useState } from 'react';

interface TutorialOverlayProps {
  onStart: () => void;
}

const steps = [
  {
    title: '🔮 Arcane Tracerへようこそ！',
    body: '魔法陣をお手本通りになぞって、正確さを競うアプリです。',
  },
  {
    title: '📐 手順',
    body: '画面に表示される灰色の三角形を、赤い点の位置から指でなぞってください。制限時間は5秒です。\n\n正確さによってS〜Cランクのスコアが出ます！',
  },
  {
    title: '✨ 詠唱完了！',
    body: '描き終わったら「詠唱完了！」ボタンを押してスコア判定を受けましょう。\n\nよい魔力を！',
  },
];

/** チュートリアルオーバーレイ（初回表示） */
export default function TutorialOverlay({ onStart }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);

  const nextStep = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onStart();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center tutorial-overlay"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <div
        className="mx-4 max-w-sm rounded-xl p-6 text-center"
        style={{ background: '#1a1a2e', border: '1px solid rgba(0,229,255,0.3)' }}
      >
        <h2 className="mb-3 text-xl font-bold" style={{ color: '#00e5ff' }}>
          {steps[step].title}
        </h2>
        <p className="mb-6 whitespace-pre-line text-sm" style={{ color: '#c0c0e0' }}>
          {steps[step].body}
        </p>
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
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            nextStep();
          }}
          className="w-full rounded-md py-2 font-bold text-black transition-opacity hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #00e5ff, #7c4dff)' }}
        >
          {step < steps.length - 1 ? '次へ →' : '始める ✨'}
        </button>
      </div>
    </div>
  );
}
