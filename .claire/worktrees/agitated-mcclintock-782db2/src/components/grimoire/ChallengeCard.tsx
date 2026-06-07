'use client';

import type { Challenge } from '@/lib/challenges';

interface ChallengeCardProps {
  challenge: Challenge;
  progress: number;
}

export default function ChallengeCard({
  challenge,
  progress,
}: ChallengeCardProps) {
  const completed = progress >= challenge.target;
  const pct = Math.min(100, Math.round((progress / challenge.target) * 100));

  return (
    <div
      className={`grimoire-card relative flex flex-col ${completed ? 'grimoire-challenge-complete' : ''}`}
      style={{
        width: 144,
        aspectRatio: '9 / 16',
        background: '#0A0A0A',
        border: `1px solid ${completed ? 'rgba(0,229,255,0.8)' : 'rgba(0,229,255,0.4)'}`,
        borderRadius: 6,
        flexShrink: 0,
        scrollSnapAlign: 'start',
        overflow: 'hidden',
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-3">
        <div
          className="text-center text-xs font-bold tracking-wider"
          style={{ color: completed ? '#00e5ff' : '#e0e0ff' }}
        >
          {challenge.title}
        </div>
        <div
          className="text-center text-[10px] leading-tight"
          style={{ color: '#7676aa' }}
        >
          {challenge.description}
        </div>
      </div>

      <div
        className="flex flex-col gap-2 px-3 py-3"
        style={{ borderTop: '1px solid rgba(0, 229, 255, 0.15)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: '#7676aa' }}>
            {progress} / {challenge.target}
          </span>
          <span
            className="text-[10px] font-bold"
            style={{ color: completed ? '#00e5ff' : '#4a4a6a' }}
          >
            {completed ? '達成' : `${pct}%`}
          </span>
        </div>
        <div
          style={{
            height: 4,
            background: '#1a1a2a',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: completed
                ? 'linear-gradient(90deg, #00e5ff, #80f0ff)'
                : 'linear-gradient(90deg, #00b4cc, #00e5ff)',
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}
