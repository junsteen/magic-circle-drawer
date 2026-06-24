'use client';

import type { LocalCustomPattern } from '@/lib/customPatternDB';

const CANVAS_SIZE = 350;

interface CustomPatternCardProps {
  pattern: LocalCustomPattern;
}

export default function CustomPatternCard({ pattern }: CustomPatternCardProps) {
  return (
    <div
      style={{
        width: 144,
        aspectRatio: '9 / 16',
        background: '#0A0A0A',
        border: '1px solid rgba(118,255,3,0.4)',
        borderRadius: 6,
        flexShrink: 0,
        scrollSnapAlign: 'start',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* プレビュー */}
      <div className="flex flex-1 items-center justify-center">
        {pattern.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pattern.thumbnail}
            alt={pattern.name}
            style={{ width: '80%', height: '80%', objectFit: 'contain' }}
          />
        ) : (
          <svg
            className="grimoire-rotate"
            viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
            width="80%"
            height="80%"
            aria-hidden
          >
            {pattern.data.circles.map((c, i) => (
              <circle
                key={`c-${i}`}
                cx={c.cx * CANVAS_SIZE}
                cy={c.cy * CANVAS_SIZE}
                r={c.radius}
                fill="none"
                stroke="rgba(118,255,3,0.45)"
                strokeWidth={3}
              />
            ))}
            {pattern.data.edges.map((e, i) => {
              const a = pattern.data.vertices[e.from];
              const b = pattern.data.vertices[e.to];
              if (!a || !b) return null;
              return (
                <line
                  key={`e-${i}`}
                  x1={a.x} y1={a.y}
                  x2={b.x} y2={b.y}
                  stroke="rgba(118,255,3,0.7)"
                  strokeWidth={3}
                />
              );
            })}
          </svg>
        )}
      </div>

      {/* 情報 */}
      <div
        className="px-2 py-2 text-center"
        style={{ borderTop: '1px solid rgba(118,255,3,0.15)' }}
      >
        <div
          className="truncate text-xs font-bold tracking-wider"
          style={{ color: '#e0e0ff' }}
        >
          {pattern.name}
        </div>
        <div className="mt-1 text-[10px]" style={{ color: '#76ff03' }}>
          ↓ ダウンロード済み
        </div>
      </div>
    </div>
  );
}
