'use client';

import type { UnlockInfo } from '@/lib/unlocks';

interface Props {
  unlock: UnlockInfo;
  onClose: () => void;
}

export default function UnlockModal({ unlock, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <div
        className="relative max-w-sm w-full rounded-2xl border-2 p-8 text-center"
        style={{
          background: 'linear-gradient(135deg, #0d0d2a, #1a0a2e)',
          borderColor: '#ffd700',
          boxShadow: '0 0 40px rgba(255,215,0,0.3)',
        }}
      >
        <div className="text-6xl mb-4 animate-bounce">{unlock.icon}</div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: '#ffd700' }}>
          {unlock.title}
        </h2>
        <p className="text-sm text-gray-300 mb-6">{unlock.description}</p>
        <button
          onClick={onClose}
          className="px-8 py-3 rounded-lg font-bold text-black transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #ffd700, #ff9100)' }}
        >
          OK！
        </button>
      </div>
    </div>
  );
}
