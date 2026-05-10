'use client';

import type { Achievement } from '@/lib/achievements';

interface AchievementCardProps {
  achievement: Achievement;
  unlocked: boolean;
  /** 直近のチェックで初めて解除されたか（解除アニメーションの再生用） */
  justUnlocked?: boolean;
}

/**
 * 魔導書 - アチーブメントカード（9:16縦長）
 * 未解除時は「シール」で覆い、解除済みはアイコンと条件説明を表示する。
 * `justUnlocked` が true の場合、シールが破れる解除アニメーションを再生する。
 */
export default function AchievementCard({
  achievement,
  unlocked,
  justUnlocked,
}: AchievementCardProps) {
  return (
    <div
      className="grimoire-card relative flex flex-col"
      style={{
        width: 144,
        aspectRatio: '9 / 16',
        background: '#0A0A0A',
        border: '1px solid rgba(0, 229, 255, 0.4)',
        borderRadius: 6,
        flexShrink: 0,
        scrollSnapAlign: 'start',
        overflow: 'hidden',
      }}
    >
      {/* 解除済みコンテンツ */}
      <div className="flex flex-1 items-center justify-center">
        <span
          className="text-5xl"
          style={{
            color: unlocked ? '#00e5ff' : '#1a1a2a',
            textShadow: unlocked ? '0 0 8px rgba(0,229,255,0.4)' : 'none',
          }}
          aria-hidden
        >
          {achievement.icon}
        </span>
      </div>

      <div
        className="px-2 py-2 text-center"
        style={{ borderTop: '1px solid rgba(0, 229, 255, 0.15)' }}
      >
        <div
          className="truncate text-xs font-bold tracking-wider"
          style={{ color: unlocked ? '#e0e0ff' : '#3a3a5a' }}
        >
          {unlocked ? achievement.name : '???'}
        </div>
        <div
          className="mt-1 text-[10px] leading-tight"
          style={{
            color: unlocked ? '#7676aa' : '#2a2a4a',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {unlocked ? achievement.description : '未解除'}
        </div>
      </div>

      {/* シール（未解除時、または解除アニメ中に上から被せる） */}
      {(!unlocked || justUnlocked) && (
        <div
          className={`grimoire-seal ${justUnlocked ? 'grimoire-seal-break' : ''}`}
          aria-hidden
        />
      )}
    </div>
  );
}
