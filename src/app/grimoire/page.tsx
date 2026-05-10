'use client';

import { useRouter } from 'next/navigation';

/**
 * 魔導書ページ
 * 魔法陣・アチーブメント・タイトル・チャレンジを集約するカード図鑑UI
 * 現状はT1: エントリーポイントのみ。タブ・カードはT2以降で実装予定。
 */
export default function GrimoirePage() {
  const router = useRouter();

  return (
    <div
      className="grimoire-fade-in min-h-screen"
      style={{ background: '#050505', color: '#e0e0ff' }}
    >
      {/* ヘッダー */}
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(0,229,255,0.15)' }}
      >
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-base transition-colors hover:bg-white/5"
          style={{
            border: '1px solid rgba(0,229,255,0.4)',
            color: '#00e5ff',
          }}
          aria-label="戻る"
        >
          ←
        </button>
        <h1
          className="text-base font-bold tracking-widest"
          style={{ color: '#00e5ff' }}
        >
          魔導書
        </h1>
        <div className="h-9 w-9" />
      </header>

      {/* プレースホルダ：T2以降でタブ + カードグリッドを実装 */}
      <main className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <p className="text-sm" style={{ color: '#7676aa' }}>
          魔法陣・アチーブメント・タイトル・チャレンジ
        </p>
        <p className="mt-3 text-xs" style={{ color: '#4a4a6a' }}>
          (T2以降のタスクで本実装)
        </p>
      </main>
    </div>
  );
}
