'use client';

import type { AkashicListItem } from '@/lib/akashicTypes';

interface AkashicCardProps {
  item: AkashicListItem;
  downloaded: boolean;
}

export default function AkashicCard({ item, downloaded }: AkashicCardProps) {
  return (
    <div
      style={{
        width: 144,
        aspectRatio: '9 / 16',
        background: '#0A0A0A',
        border: `1px solid ${downloaded ? 'rgba(118,255,3,0.5)' : 'rgba(0, 229, 255, 0.4)'}`,
        borderRadius: 6,
        flexShrink: 0,
        scrollSnapAlign: 'start',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* サムネイル or プレースホルダー */}
      <div
        className="flex flex-1 items-center justify-center"
        style={{ position: 'relative' }}
      >
        {item.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail}
            alt={item.name}
            style={{ width: '80%', height: '80%', objectFit: 'contain' }}
          />
        ) : (
          <div style={{ color: '#4a4a6a', fontSize: 32 }}>✦</div>
        )}
        {downloaded && (
          <div
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              background: 'rgba(118,255,3,0.2)',
              border: '1px solid rgba(118,255,3,0.6)',
              borderRadius: 4,
              padding: '1px 4px',
              fontSize: 9,
              color: '#76ff03',
              fontWeight: 'bold',
            }}
          >
            済
          </div>
        )}
      </div>

      {/* 情報 */}
      <div
        className="px-2 py-2 text-center"
        style={{ borderTop: '1px solid rgba(0, 229, 255, 0.15)' }}
      >
        <div
          className="truncate text-xs font-bold tracking-wider"
          style={{ color: '#e0e0ff' }}
        >
          {item.name}
        </div>
        <div className="mt-1 text-[10px]" style={{ color: '#7676aa' }}>
          ↓ {item.downloads.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
