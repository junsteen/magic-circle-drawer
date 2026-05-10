'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPresetPattern, type MagicCirclePattern } from '@/lib/patterns';
import { getAllCompletions, type CompletionRecord } from '@/lib/completionDB';
import { getAllHistories } from '@/lib/historyDB';
import type { MagicCircleHistory } from '@/lib/types';
import { ACHIEVEMENTS } from '@/lib/achievements';
import {
  checkAndUnlockAchievements,
  getUnlockedAchievementIds,
} from '@/lib/achievementDB';
import { TITLES, getEquippedTitleId, saveEquippedTitleId } from '@/lib/titles';
import { CHALLENGES } from '@/lib/challenges';
import MagicCircleCard from '@/components/grimoire/MagicCircleCard';
import AchievementCard from '@/components/grimoire/AchievementCard';
import TitleCard from '@/components/grimoire/TitleCard';
import ChallengeCard from '@/components/grimoire/ChallengeCard';

const PATTERN_CANVAS_SIZE = 350;

type TabId = 'circles' | 'achievements' | 'titles' | 'challenges';

const TABS: { id: TabId; label: string }[] = [
  { id: 'circles', label: '魔法陣' },
  { id: 'achievements', label: 'アチーブメント' },
  { id: 'titles', label: 'タイトル' },
  { id: 'challenges', label: 'チャレンジ' },
];

export default function GrimoirePage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('circles');
  const [patterns, setPatterns] = useState<MagicCirclePattern[]>([]);
  const [completions, setCompletions] = useState<CompletionRecord[]>([]);
  const [histories, setHistories] = useState<MagicCircleHistory[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [justUnlockedIds, setJustUnlockedIds] = useState<Set<string>>(new Set());
  const [equippedTitleId, setEquippedTitleId] = useState<string | null>(null);

  useEffect(() => {
    setPatterns(createPresetPattern(PATTERN_CANVAS_SIZE));
    setEquippedTitleId(getEquippedTitleId());
    getAllCompletions()
      .then(setCompletions)
      .catch((e) => console.error('Failed to load completions:', e));
    getAllHistories()
      .then(setHistories)
      .catch((e) => console.error('Failed to load histories:', e));
    checkAndUnlockAchievements()
      .then(async (newlyUnlocked) => {
        setJustUnlockedIds(new Set(newlyUnlocked));
        const all = await getUnlockedAchievementIds();
        setUnlockedIds(all);
      })
      .catch((e) => console.error('Failed to check achievements:', e));
  }, []);

  const handleEquip = useCallback((id: string | null) => {
    saveEquippedTitleId(id);
    setEquippedTitleId(id);
  }, []);

  const completionMap = new Map(completions.map((c) => [c.patternName, c]));

  return (
    <div
      className="grimoire-fade-in min-h-screen"
      style={{ background: '#050505', color: '#e0e0ff' }}
    >
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
        {tab === 'titles' && (
          <TitleGrid
            unlockedIds={unlockedIds}
            equippedTitleId={equippedTitleId}
            onEquip={handleEquip}
          />
        )}
        {tab === 'challenges' && (
          <ChallengeGrid histories={histories} completions={completions} />
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

function TitleGrid({
  unlockedIds,
  equippedTitleId,
  onEquip,
}: {
  unlockedIds: Set<string>;
  equippedTitleId: string | null;
  onEquip: (id: string | null) => void;
}) {
  return (
    <div
      className="grid grid-flow-col grid-rows-2 gap-3 overflow-x-auto pb-2"
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {TITLES.map((t) => (
        <TitleCard
          key={t.id}
          title={t}
          unlocked={unlockedIds.has(t.achievementId)}
          equipped={equippedTitleId === t.id}
          onEquip={onEquip}
        />
      ))}
    </div>
  );
}

function ChallengeGrid({
  histories,
  completions,
}: {
  histories: MagicCircleHistory[];
  completions: CompletionRecord[];
}) {
  return (
    <div
      className="grid grid-flow-col grid-rows-2 gap-3 overflow-x-auto pb-2"
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {CHALLENGES.map((c) => (
        <ChallengeCard
          key={c.id}
          challenge={c}
          progress={c.getProgress({ histories, completions })}
        />
      ))}
    </div>
  );
}
