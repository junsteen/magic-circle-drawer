'use client';

import { useState } from 'react';
import type { AkashicListItem } from '@/lib/akashicTypes';
import { downloadFromAkashic } from '@/lib/akashicApi';
import { saveCustomPattern } from '@/lib/customPatternDB';

interface AkashicDetailModalProps {
  item: AkashicListItem;
  downloaded: boolean;
  onClose: () => void;
  onDownloaded: (id: string) => void;
}

export default function AkashicDetailModal({
  item,
  downloaded,
  onClose,
  onDownloaded,
}: AkashicDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await downloadFromAkashic(item.id);
      if (!detail) {
        setError('ダウンロードに失敗しました');
        return;
      }
      await saveCustomPattern({
        id: detail.id,
        name: detail.name,
        data: detail.data,
        thumbnail: detail.thumbnail,
        downloadedAt: Date.now(),
      });
      onDownloaded(detail.id);
    } catch {
      setError('ダウンロードに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const dateStr = new Date(item.created_at * 1000).toLocaleDateString('ja-JP');

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-xl p-5"
        style={{ background: '#0d0d1a', border: '1px solid rgba(0,229,255,0.4)' }}
      >
        {/* サムネイル */}
        <div
          className="mx-auto mb-4 flex items-center justify-center rounded-lg"
          style={{
            width: 160,
            height: 160,
            background: '#0a0a0a',
            border: '1px solid rgba(0,229,255,0.2)',
          }}
        >
          {item.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnail}
              alt={item.name}
              style={{ width: '85%', height: '85%', objectFit: 'contain' }}
            />
          ) : (
            <div style={{ color: '#4a4a6a', fontSize: 48 }}>✦</div>
          )}
        </div>

        {/* 情報 */}
        <h2
          className="mb-3 text-center text-base font-bold tracking-wider"
          style={{ color: '#00e5ff' }}
        >
          {item.name}
        </h2>
        <div className="mb-4 grid grid-cols-2 gap-2 text-center text-xs">
          <div style={{ color: '#7676aa' }}>
            <div style={{ color: '#e0e0ff', fontWeight: 'bold' }}>
              {item.downloads.toLocaleString()}
            </div>
            ダウンロード
          </div>
          <div style={{ color: '#7676aa' }}>
            <div style={{ color: '#e0e0ff', fontWeight: 'bold' }}>{dateStr}</div>
            投稿日
          </div>
        </div>

        {error && (
          <p className="mb-3 text-center text-xs" style={{ color: '#ff4081' }}>{error}</p>
        )}

        {/* ボタン */}
        <button
          onClick={downloaded ? undefined : handleDownload}
          disabled={downloaded || loading}
          className="w-full rounded-lg py-3 text-sm font-bold transition-all"
          style={{
            background: downloaded
              ? 'rgba(118,255,3,0.1)'
              : loading
              ? 'rgba(0,229,255,0.1)'
              : 'rgba(0,229,255,0.15)',
            border: `1px solid ${downloaded ? 'rgba(118,255,3,0.5)' : 'rgba(0,229,255,0.5)'}`,
            color: downloaded ? '#76ff03' : '#00e5ff',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {downloaded ? '✓ 魔導書に追加済み' : loading ? 'ダウンロード中…' : '魔導書にダウンロード'}
        </button>

        <button
          onClick={onClose}
          className="mt-2 w-full rounded-lg py-2 text-xs transition-colors hover:bg-white/5"
          style={{ color: '#7676aa' }}
        >
          閉じる
        </button>
      </div>
    </>
  );
}
