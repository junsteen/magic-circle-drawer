'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPresetPattern, type MagicCirclePattern } from '@/lib/patterns';
import { getAllCompletions, type CompletionRecord } from '@/lib/completionDB';
import { ACHIEVEMENTS } from '@/lib/achievements';
import {
  checkAndUnlockAchievements,
  getUnlockedAchievementIds,
} from '@/lib/achievementDB';
import MagicCircleCard from '@/components/grimoire/MagicCircleCard';
import AchievementCard from '@/components/grimoire/AchievementCard';

const PATTERN_CANVAS_SIZE = 350;

type TabId = 'circles' | 'achievements' | 'titles' | 'challenges';

const TABS: { id: TabId; label: string }[] = [
  { id: 'circles', label: '魔法陣' },
  { id: 'achievements', label: 'アチーブメント' },
  { id: 'titles', label: 'タイトル' },
  { id: 'challenges', label: 'チャレンジ' },
];

/**
 * 魔導書ページ
 * 4タブ構成（魔法陣 / アチーブメント / タイトル / チャレンジ）。
 * 現状は魔法陣タブのみ実装（T2）。他タブはT3以降のサブタスクで本実装する。
 */
export default function GrimoirePage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('circles');
  const [patterns, setPatterns] = useState<MagicCirclePattern[]>([]);
  const [completions, setCompletions] = useState<CompletionRecord[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [justUnlockedIds, setJustUnlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPatterns(createPresetPattern(PATTERN_CANVAS_SIZE));
    getAllCompletions()
      .then(setCompletions)
      .catch((e) => console.error('Failed to load completions:', e));
    // 履歴・完了データから条件を再評価し新規解除分を保存
    checkAndUnlockAchievements()
      .then(async (newlyUnlocked) => {
        setJustUnlockedIds(new Set(newlyUnlocked));
        const all = await getUnlockedAchievementIds();
        setUnlockedIds(all);
      })
      .catch((e) => console.error('Failed to check achievements:', e));
  }, []);

  const completionMap = new Map(completions.map((c) => [c.patternName, c]));

  return (
    <div
      className="grimoire-fade-in min-h-screen"
      style={{ background: '#050505', color: '#e0e0ff' }}
    >
      {/* ヘッダー */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{
          background: '#050505',
          borderBottom: '1px solid rgba(0,229,255,0.15)',
        }}
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

      {/* タブ */}
      <nav
        className="flex"
        style={{ borderBottom: '1px solid rgba(0,229,255,0.15)' }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-3 text-xs font-bold tracking-wider transition-colors"
            style={{
              color: tab === t.id ? '#00e5ff' : '#7676aa',
              borderBottom:
                tab === t.id
                  ? '1px solid #00e5ff'
                  : '1px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* コンテンツ */}
      <main className="px-4 py-6">
        {tab === 'circles' && (
          <CircleGrid patterns={patterns} completionMap={completionMap} />
        )}
        {tab === 'achievements' && (
          <AchievementGrid
            unlockedIds={unlockedIds}
            justUnlockedIds={justUnlockedIds}
          />
        )}
        {(tab === 'titles' || tab === 'challenges') && (
          <p
            className="text-center text-xs"
            style={{ color: '#4a4a6a' }}
          >
            (T5以降のタスクで実装予定)
          </p>
        )}
      </main>
    </div>
  );
}

function CircleGrid({
  patterns,
  completionMap,
}: {
  patterns: MagicCirclePattern[];
  completionMap: Map<string, CompletionRecord>;
}) {
  if (patterns.length === 0) {
    return (
      <p className="text-center text-xs" style={{ color: '#4a4a6a' }}>
        読み込み中…
      </p>
    );
  }
  return (
    <div
      className="grid grid-flow-col grid-rows-2 gap-3 overflow-x-auto pb-2"
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {patterns.map((p) => (
        <MagicCircleCard
          key={p.name}
          pattern={p}
          completion={completionMap.get(p.name)}
        />
      ))}
    </div>
  );
}

function AchievementGrid({
  unlockedIds,
  justUnlockedIds,
}: {
  unlockedIds: Set<string>;
  justUnlockedIds: Set<string>;
}) {
  return (
    <div
      className="grid grid-flow-col grid-rows-2 gap-3 overflow-x-auto pb-2"
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {ACHIEVEMENTS.map((a) => (
        <AchievementCard
          key={a.id}
          achievement={a}
          unlocked={unlockedIds.has(a.id)}
          justUnlocked={justUnlockedIds.has(a.id)}
        />
      ))}
    </div>
  );
}
