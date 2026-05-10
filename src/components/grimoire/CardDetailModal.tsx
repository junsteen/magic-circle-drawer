'use client';

import type { MagicCirclePattern } from '@/lib/patterns';
import type { CompletionRecord } from '@/lib/completionDB';
import type { Achievement } from '@/lib/achievements';
import type { Title } from '@/lib/titles';
import type { Challenge } from '@/lib/challenges';

const PATTERN_CANVAS_SIZE = 350;

export type SelectedCard =
  | { type: 'circle'; pattern: MagicCirclePattern; completion?: CompletionRecord }
  | { type: 'achievement'; achievement: Achievement; unlocked: boolean }
  | { type: 'title'; title: Title; unlocked: boolean }
  | { type: 'challenge'; challenge: Challenge; progress: number };

interface CardDetailModalProps {
  card: SelectedCard;
  onClose: () => void;
  onEquip?: (id: string | null) => void;
  equippedTitleId?: string | null;
}

export default function CardDetailModal({
  card,
  onClose,
  onEquip,
  equippedTitleId,
}: CardDetailModalProps) {
  return (
    <div
      className="grimoire-detail-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.85)',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 300,
          background: '#080810',
          border: '1px solid rgba(0,229,255,0.4)',
          borderRadius: 12,
          padding: '28px 20px 20px',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalBackground />

        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: '1px solid rgba(0,229,255,0.3)',
            borderRadius: '50%',
            color: '#00e5ff',
            fontSize: 14,
            cursor: 'pointer',
          }}
          aria-label="閉じる"
        >
          ×
        </button>

        <div style={{ position: 'relative' }}>
          {card.type === 'circle' && <CircleDetail card={card} />}
          {card.type === 'achievement' && <AchievementDetail card={card} />}
          {card.type === 'title' && (
            <TitleDetail
              card={card}
              equipped={equippedTitleId === card.title.id}
              onEquip={onEquip}
            />
          )}
          {card.type === 'challenge' && <ChallengeDetail card={card} />}
        </div>
      </div>
    </div>
  );
}

function ModalBackground() {
  return (
    <svg
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 280,
        height: 280,
        opacity: 0.06,
        pointerEvents: 'none',
      }}
      viewBox="0 0 300 300"
      aria-hidden
    >
      <circle cx="150" cy="150" r="140" stroke="#00e5ff" strokeWidth="1" fill="none" />
      <circle cx="150" cy="150" r="100" stroke="#00e5ff" strokeWidth="1" fill="none" />
      <circle cx="150" cy="150" r="60" stroke="#00e5ff" strokeWidth="0.5" fill="none" />
      <polygon
        points="150,10 267,80 267,220 150,290 33,220 33,80"
        stroke="#00e5ff"
        strokeWidth="0.5"
        fill="none"
      />
      <polygon
        points="150,70 220,110 220,190 150,230 80,190 80,110"
        stroke="#00e5ff"
        strokeWidth="0.5"
        fill="none"
      />
    </svg>
  );
}

function CircleDetail({
  card,
}: {
  card: Extract<SelectedCard, { type: 'circle' }>;
}) {
  const { pattern, completion } = card;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <svg
          className="grimoire-rotate"
          viewBox={`0 0 ${PATTERN_CANVAS_SIZE} ${PATTERN_CANVAS_SIZE}`}
          width={180}
          height={180}
          aria-hidden
        >
          {pattern.circles.map((c, i) => (
            <circle
              key={`c-${i}`}
              cx={c.cx * PATTERN_CANVAS_SIZE}
              cy={c.cy * PATTERN_CANVAS_SIZE}
              r={c.radius}
              fill="none"
              stroke="rgba(0,229,255,0.45)"
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
                stroke="rgba(0,229,255,0.7)"
                strokeWidth={3}
              />
            );
          })}
        </svg>
      </div>
      <div
        style={{
          textAlign: 'center',
          color: '#e0e0ff',
          fontSize: 16,
          fontWeight: 'bold',
          letterSpacing: '0.1em',
          marginBottom: 16,
        }}
      >
        {pattern.name}
      </div>
      {completion ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <StatBox
            label="ベストランク"
            value={completion.bestRank}
            color={getRankColor(completion.bestRank)}
          />
          <StatBox label="ベストスコア" value={`${completion.bestScore}点`} />
          <StatBox label="Sクリア数" value={`${completion.completionCount}回`} />
          <StatBox label="最終挑戦" value={formatDate(completion.lastAttempted)} />
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#4a4a6a', fontSize: 12 }}>未挑戦</p>
      )}
    </div>
  );
}

function AchievementDetail({
  card,
}: {
  card: Extract<SelectedCard, { type: 'achievement' }>;
}) {
  const { achievement, unlocked } = card;
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <span
          style={{
            fontSize: 64,
            color: unlocked ? '#00e5ff' : '#1a1a2a',
            textShadow: unlocked ? '0 0 16px rgba(0,229,255,0.5)' : 'none',
          }}
          aria-hidden
        >
          {achievement.icon}
        </span>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div
          style={{
            color: unlocked ? '#e0e0ff' : '#3a3a5a',
            fontSize: 15,
            fontWeight: 'bold',
            marginBottom: 8,
          }}
        >
          {unlocked ? achievement.name : '???'}
        </div>
        <div
          style={{
            color: unlocked ? '#7676aa' : '#2a2a4a',
            fontSize: 11,
            lineHeight: 1.6,
          }}
        >
          {unlocked ? achievement.description : '未解除のアチーブメント'}
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <StatusBadge active={unlocked} label={unlocked ? '解除済み' : '未解除'} />
      </div>
    </div>
  );
}

function TitleDetail({
  card,
  equipped,
  onEquip,
}: {
  card: Extract<SelectedCard, { type: 'title' }>;
  equipped: boolean;
  onEquip?: (id: string | null) => void;
}) {
  const { title, unlocked } = card;
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <span
          style={{
            fontSize: 64,
            color: unlocked ? '#00e5ff' : '#1a1a2a',
            textShadow: unlocked ? '0 0 16px rgba(0,229,255,0.5)' : 'none',
          }}
          aria-hidden
        >
          {title.emblem}
        </span>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div
          style={{
            color: unlocked ? '#e0e0ff' : '#3a3a5a',
            fontSize: 15,
            fontWeight: 'bold',
            marginBottom: 8,
          }}
        >
          {unlocked ? title.name : '???'}
        </div>
        <div style={{ color: '#7676aa', fontSize: 11 }}>
          {unlocked ? title.condition : '未解除'}
        </div>
      </div>
      {unlocked && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => onEquip?.(equipped ? null : title.id)}
            style={{
              padding: '8px 28px',
              background: equipped ? 'rgba(0,229,255,0.2)' : 'rgba(0,229,255,0.08)',
              border: '1px solid rgba(0,229,255,0.5)',
              borderRadius: 6,
              color: '#00e5ff',
              fontSize: 12,
              fontWeight: 'bold',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            {equipped ? '装備中（外す）' : '装備する'}
          </button>
        </div>
      )}
    </div>
  );
}

function ChallengeDetail({
  card,
}: {
  card: Extract<SelectedCard, { type: 'challenge' }>;
}) {
  const { challenge, progress } = card;
  const completed = progress >= challenge.target;
  const pct = Math.min(100, Math.round((progress / challenge.target) * 100));
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div
          style={{
            color: completed ? '#00e5ff' : '#e0e0ff',
            fontSize: 15,
            fontWeight: 'bold',
            marginBottom: 8,
          }}
        >
          {challenge.title}
        </div>
        <div style={{ color: '#7676aa', fontSize: 11, lineHeight: 1.6 }}>
          {challenge.description}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
            fontSize: 11,
          }}
        >
          <span style={{ color: '#7676aa' }}>進捗</span>
          <span style={{ color: completed ? '#00e5ff' : '#7676aa', fontWeight: 'bold' }}>
            {progress} / {challenge.target}
          </span>
        </div>
        <div
          style={{
            height: 8,
            background: '#1a1a2a',
            borderRadius: 4,
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
              borderRadius: 4,
            }}
          />
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <StatusBadge active={completed} label={completed ? '達成済み' : `${pct}%`} />
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: 'rgba(0,229,255,0.04)',
        border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: 6,
        padding: '8px 10px',
        textAlign: 'center',
      }}
    >
      <div style={{ color: '#4a4a6a', fontSize: 9, marginBottom: 4 }}>{label}</div>
      <div style={{ color: color ?? '#e0e0ff', fontSize: 13, fontWeight: 'bold' }}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 14px',
        background: active ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 20,
        fontSize: 10,
        color: active ? '#00e5ff' : '#4a4a6a',
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </span>
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

function formatDate(timestamp: number): string {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
