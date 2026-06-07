'use client';

import { useRouter } from 'next/navigation';

export function AppInfo() {
  const router = useRouter();
  const version = process.env.NEXT_PUBLIC_APP_VERSION || 'unknown';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ background: '#0d0d1a' }}>
      <div className="max-w-md w-full p-8 rounded-xl border relative" style={{ borderColor: 'rgba(0,229,255,0.3)', background: 'rgba(13,13,26,0.97)' }}>
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors hover:bg-white/5"
          style={{
            border: '1px solid rgba(0,229,255,0.4)',
            color: '#00e5ff',
          }}
          aria-label="戻る"
        >
          ←
        </button>

        <h1 className="text-3xl font-bold text-center mb-6" style={{ color: '#00e5ff', textShadow: '0 0 20px rgba(0, 229, 255, 0.5)' }}>
          🔮 Arcane Tracer
        </h1>

        <div className="space-y-4 text-center">
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1">アプリケーション情報</p>
            <p className="text-lg font-bold" style={{ color: '#7c4dff' }}>
              Arcane Tracer
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 mb-1">バージョン</p>
            <p className="text-lg font-bold" style={{ color: '#00e5ff' }}>
              {version}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 mb-1">説明</p>
            <p className="text-sm text-gray-400">
              詠唱の正確さが威力になる<br />
              画面上の魔法陣をなぞって精度を競うアプリケーション
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(0,229,255,0.2)' }}>
          <p className="text-xs text-gray-500 text-center">
            PWA対応 • オフライン利用可能
          </p>
        </div>
      </div>
    </div>
  );
}
