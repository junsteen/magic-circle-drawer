'use client';

import type { MagicCirclePattern } from '@/lib/patterns';
import type { CompletionRecord } from '@/lib/completionDB';

const PATTERN_CANVAS_SIZE = 350;

interface MagicCircleCardProps {
  pattern: MagicCirclePattern;
  completion?: CompletionRecord;
}

/**
 * 魔導書 - 魔法陣カード（9:16縦長）
 * 中央に魔法陣プレビュー（微回転）、下部にステータス（ベストランク・スコア・クリア回数）を表示する
 */
export default function MagicCircleCard({ pattern, completion }: MagicCircleCardProps) {
  return (
    <div
      className="grimoire-card flex flex-col"
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
      {/* プレビュー（微回転） */}
      <div className="flex flex-1 items-center justify-center">
        <svg
          className="grimoire-rotate"
          viewBox={`0 0 ${PATTERN_CANVAS_SIZE} ${PATTERN_CANVAS_SIZE}`}
          width="80%"
          height="80%"
          aria-hidden
        >
          {pattern.circles.map((c, i) => (
            <circle
              key={`c-${i}`}
              cx={c.cx * PATTERN_CANVAS_SIZE}
              cy={c.cy * PATTERN_CANVAS_SIZE}
              r={c.radius}
              fill="none"
              stroke="rgba(0, 229, 255, 0.45)"
              strokeWidth={3}
            />
          ))}
          {pattern.edges.map((e, i) => {
            const a = pattern.vertices[e.from];
            const b = pattern.vertices[e.to];
            return (
              <line
                key={`e-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="rgba(0, 229, 255, 0.7)"
                strokeWidth={3}
              />
            );
          })}
        </svg>
      </div>

      {/* ステータス */}
      <div
        className="px-2 py-2 text-center"
        style={{ borderTop: '1px solid rgba(0, 229, 255, 0.15)' }}
      >
        <div
          className="truncate text-xs font-bold tracking-wider"
          style={{ color: '#e0e0ff' }}
        >
          {pattern.name}
        </div>
        {completion ? (
          <div className="mt-1 text-[10px] leading-tight" style={{ color: '#7676aa' }}>
            <span style={{ color: getRankColor(completion.bestRank) }}>
              {completion.bestRank}
            </span>{' '}
            {completion.bestScore}点
            <div className="mt-0.5">✦ {completion.completionCount}回</div>
          </div>
        ) : (
          <div className="mt-1 text-[10px]" style={{ color: '#4a4a6a' }}>
            未挑戦
          </div>
        )}
      </div>
    </div>
  );
}

function getRankColor(rank: string): string {
  switch (rank) {
    case 'S':
      return '#ffd700';
    case 'A':
      return '#00e5ff';
    case 'B':
      return '#76ff03';
    default:
      return '#ff4081';
  }
}
