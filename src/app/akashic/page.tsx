'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AkashicListItem } from '@/lib/akashicTypes';
import { fetchAkashicList } from '@/lib/akashicApi';
import { isDownloaded } from '@/lib/customPatternDB';
import AkashicCard from '@/components/akashic/AkashicCard';
import AkashicDetailModal from '@/components/akashic/AkashicDetailModal';

type SortMode = 'new' | 'popular';

export default function AkashicPage() {
  const router = useRouter();
  const [sort, setSort] = useState<SortMode>('new');
  const [patterns, setPatterns] = useState<AkashicListItem[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<AkashicListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPatterns = useCallback(async (sortMode: SortMode) => {
    setLoading(true);
    setError(null);
    const result = await fetchAkashicList({ sort: sortMode });
    if (!result) {
      setError('データの読み込みに失敗しました');
      setPatterns([]);
    } else {
      setPatterns(result.patterns);
      // ダウンロード済みIDをチェック
      const checks = await Promise.all(
        result.patterns.map(async (p) => [p.id, await isDownloaded(p.id)] as const)
      );
      setDownloadedIds(new Set(checks.filter(([, dl]) => dl).map(([id]) => id)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPatterns(sort);
  }, [sort, loadPatterns]);

  const handleDownloaded = useCallback((id: string) => {
    setDownloadedIds((prev) => new Set([...prev, id]));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#050505', color: '#e0e0ff' }}>
      {/* ヘッダー */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ background: '#050505', borderBottom: '1px solid rgba(0,229,255,0.15)' }}
      >
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-base transition-colors hover:bg-white/5"
          style={{ border: '1px solid rgba(0,229,255,0.4)', color: '#00e5ff' }}
          aria-label="戻る"
        >
          ←
        </button>
        <h1 className="text-base font-bold tracking-widest" style={{ color: '#00e5ff' }}>
          アカシックレコード
        </h1>
        {/* 並び替えトグル */}
        <div
          className="flex rounded-lg overflow-hidden text-xs font-bold"
          style={{ border: '1px solid rgba(0,229,255,0.3)' }}
        >
          {(['new', 'popular'] as SortMode[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className="px-3 py-1.5 transition-colors"
              style={{
                background: sort === s ? 'rgba(0,229,255,0.15)' : 'transparent',
                color: sort === s ? '#00e5ff' : '#7676aa',
              }}
            >
              {s === 'new' ? '新着' : '人気'}
            </button>
          ))}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: '#7676aa' }}>
            読み込み中…
          </div>
        )}

        {!loading && error && (
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{
              background: 'rgba(255,64,129,0.15)',
              border: '1px solid rgba(255,64,129,0.5)',
              color: '#ff4081',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && patterns.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-sm" style={{ color: '#7676aa' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
            まだパターンが登録されていません
          </div>
        )}

        {!loading && !error && patterns.length > 0 && (
          <div
            className="grid grid-flow-col grid-rows-2 gap-3 overflow-x-auto pb-2"
            style={{ scrollSnapType: 'x mandatory', touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
          >
            {patterns.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                style={{ display: 'block', cursor: 'pointer', background: 'none', border: 'none', padding: 0, touchAction: 'manipulation' }}
              >
                <AkashicCard item={item} downloaded={downloadedIds.has(item.id)} />
              </button>
            ))}
          </div>
        )}
      </main>

      {/* 詳細モーダル */}
      {selected && (
        <AkashicDetailModal
          item={selected}
          downloaded={downloadedIds.has(selected.id)}
          onClose={() => setSelected(null)}
          onDownloaded={(id) => { handleDownloaded(id); }}
        />
      )}
    </div>
  );
}
