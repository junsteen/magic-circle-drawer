'use client';

import React, { useState } from 'react';

interface HelpModalProps {
  onClose: () => void;
}

/** ヘルプモーダル */
export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center tutorial-overlay"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="mx-4 max-w-sm rounded-xl p-6"
        style={{ background: '#1a1a2e', border: '1px solid rgba(0,229,255,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-bold" style={{ color: '#00e5ff' }}>
          🔮 ヘルプ
        </h2>
        <ol className="space-y-3 text-sm" style={{ color: '#c0c0e0' }}>
          <li className="flex gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 font-bold text-white">1</span>
            <span>グレーの<strong>魔法陣のお手本</strong>が表示されます</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 font-bold text-white">2</span>
            <span><strong>赤い点の位置</strong>から指でなぞり始めてください</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 font-bold text-white">3</span>
            <span>線に沿って<strong>一周</strong>してください（制限時間: 難易度により変動）</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 font-bold text-white">4</span>
            <span><strong>詠唱完了！</strong>ボタンでスコア判定されます</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 font-bold text-white">5</span>
            <span><strong>次の魔法陣 →</strong>ボタンでランダム生成された新しい魔法陣に挑戦</span>
          </li>
        </ol>
        <hr className="my-4" style={{ borderColor: 'rgba(0,229,255,0.2)' }} />
        <div className="text-xs" style={{ color: '#7676aa' }}>
          <p className="mb-1"><strong>スコア一覧：</strong></p>
          <p><span style={{ color: '#ffd700' }}>Sランク 120%ダメージ</span> (90点以上)</p>
          <p><span style={{ color: '#00e5ff' }}>Aランク 100%ダメージ</span> (70点以上)</p>
          <p><span style={{ color: '#76ff03' }}>Bランク 70%ダメージ</span> (50点以上)</p>
          <p><span style={{ color: '#ff4081' }}>Cランク 失敗</span> (50点未満)</p>
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-md py-2 font-bold text-black transition-opacity hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #00e5ff, #7c4dff)' }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
