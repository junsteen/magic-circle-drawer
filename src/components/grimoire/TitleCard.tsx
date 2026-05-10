'use client';

import type { Title } from '@/lib/titles';

interface TitleCardProps {
  title: Title;
  unlocked: boolean;
  equipped: boolean;
  onEquip: (id: string | null) => void;
}

export default function TitleCard({
  title,
  unlocked,
  equipped,
  onEquip,
}: TitleCardProps) {
  return (
    <div
      className="grimoire-card relative flex flex-col"
      style={{
        width: 144,
        aspectRatio: '9 / 16',
        background: '#0A0A0A',
        border: `1px solid ${equipped ? 'rgba(0,229,255,0.8)' : 'rgba(0,229,255,0.4)'}`,
        borderRadius: 6,
        flexShrink: 0,
        scrollSnapAlign: 'start',
        overflow: 'hidden',
        boxShadow: equipped ? '0 0 12px rgba(0,229,255,0.3)' : 'none',
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2">
        <span
          className="text-5xl"
          style={{
            color: unlocked ? '#00e5ff' : '#1a1a2a',
            textShadow: unlocked ? '0 0 8px rgba(0,229,255,0.4)' : 'none',
          }}
          aria-hidden
        >
          {title.emblem}
        </span>
        <div
          className="text-center text-xs font-bold tracking-wider"
          style={{ color: unlocked ? '#e0e0ff' : '#3a3a5a' }}
        >
          {unlocked ? title.name : '???'}
        </div>
      </div>

      <div
        className="flex flex-col gap-2 px-2 py-2"
        style={{ borderTop: '1px solid rgba(0, 229, 255, 0.15)' }}
      >
        <div
          className="text-center text-[10px] leading-tight"
          style={{ color: unlocked ? '#7676aa' : '#2a2a4a' }}
        >
          {unlocked ? title.condition : '未解除'}
        </div>
        {unlocked && (
          <button
            onClick={(e) => { e.stopPropagation(); onEquip(equipped ? null : title.id); }}
            className="w-full py-1 text-[10px] font-bold tracking-wider transition-colors"
            style={{
              background: equipped
                ? 'rgba(0,229,255,0.2)'
                : 'rgba(0,229,255,0.08)',
              border: '1px solid rgba(0,229,255,0.4)',
              borderRadius: 3,
              color: '#00e5ff',
            }}
          >
            {equipped ? '装備中' : '装備する'}
          </button>
        )}
      </div>

      {!unlocked && (
        <div className="grimoire-seal" aria-hidden />
      )}
    </div>
  );
}
