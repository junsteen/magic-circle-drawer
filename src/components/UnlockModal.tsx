'use client';

interface Props {
  onClose: () => void;
}

export default function UnlockModal({ onClose }: Props) {
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
        <div className="text-6xl mb-4 animate-bounce">✨</div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: '#ffd700' }}>
          コンボモード 解放！
        </h2>
        <p className="text-gray-300 mb-2 text-sm">
          制限時間より早く、高精度で3回クリアを達成しました。
        </p>
        <p className="text-xs mb-6" style={{ color: '#00e5ff' }}>
          モード選択画面でコンボモードが選べるようになりました。
        </p>
        <button
          onClick={onClose}
          className="px-8 py-3 rounded-lg font-bold text-black transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #ffd700, #ff9100)' }}
        >
          解放する！
        </button>
      </div>
    </div>
  );
}
