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
import { getUnreadTabs, clearUnreadTab, setUnreadTabsFromNewUnlocks, type UnreadState } from '@/lib/unreadDB';
import MagicCircleCard from '@/components/grimoire/MagicCircleCard';
import AchievementCard from '@/components/grimoire/AchievementCard';
import TitleCard from '@/components/grimoire/TitleCard';
import ChallengeCard from '@/components/grimoire/ChallengeCard';
import CardDetailModal, { type SelectedCard } from '@/components/grimoire/CardDetailModal';

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
  const [patterns] = useState<MagicCirclePattern[]>(() => createPresetPattern(PATTERN_CANVAS_SIZE));
  const [completions, setCompletions] = useState<CompletionRecord[]>([]);
  const [histories, setHistories] = useState<MagicCircleHistory[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [justUnlockedIds, setJustUnlockedIds] = useState<Set<string>>(new Set());
  const [equippedTitleId, setEquippedTitleId] = useState<string | null>(() => getEquippedTitleId());
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [unreadTabs, setUnreadTabs] = useState<UnreadState>({
    circles: false,
    achievements: false,
    titles: false,
    challenges: false,
  });

  useEffect(() => {
    getAllCompletions()
      .then(setCompletions)
      .catch((e) => {
        console.error('Failed to load completions:', e);
        setLoadError('魔法陣データの読み込みに失敗しました');
      });
    getAllHistories()
      .then(setHistories)
      .catch((e) => {
        console.error('Failed to load histories:', e);
        setLoadError('履歴データの読み込みに失敗しました');
      });
    checkAndUnlockAchievements()
      .then(async (newlyUnlocked) => {
        setJustUnlockedIds(new Set(newlyUnlocked));
        const all = await getUnlockedAchievementIds();
        setUnlockedIds(all);
        await setUnreadTabsFromNewUnlocks(
          new Set(newlyUnlocked.filter((id) => ACHIEVEMENTS.some((a) => a.id === id))),
          new Set(newlyUnlocked.filter((id) => TITLES.some((t) => t.achievementId === id))),
          new Set(),
        );
        const unread = await getUnreadTabs();
        setUnreadTabs(unread);
      })
      .catch((e) => {
        console.error('Failed to check achievements:', e);
        setLoadError('アチーブメントデータの読み込みに失敗しました');
      });
  }, []);

  const handleEquip = useCallback((id: string | null) => {
    saveEquippedTitleId(id);
    setEquippedTitleId(id);
  }, []);

  const handleDraw = useCallback((patternName: string) => {
    router.push(`/?pattern=${encodeURIComponent(patternName)}`);
  }, [router]);

  const handleTabChange = useCallback((newTab: TabId) => {
    setTab(newTab);
    clearUnreadTab(newTab).then(() => {
      setUnreadTabs((prev) => ({ ...prev, [newTab]: false }));
    });
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
            onClick={() => handleTabChange(t.id)}
            className="flex-1 py-3 text-xs font-bold tracking-wider transition-colors relative"
            style={{
              color: tab === t.id ? '#00e5ff' : '#7676aa',
              borderBottom:
                tab === t.id ? '1px solid #00e5ff' : '1px solid transparent',
            }}
          >
            {t.label}
            {unreadTabs[t.id] && (
              <span
                className="grimoire-unread-badge"
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 6,
                  height: 6,
                  background: '#ff4081',
                  borderRadius: '50%',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
                aria-label="未読更新あり"
              />
            )}
          </button>
        ))}
      </nav>

      {loadError && (
        <div
          role="alert"
          className="mx-4 mt-4 flex items-center justify-between rounded-lg px-4 py-3 text-sm"
          style={{
            background: 'rgba(255, 64, 129, 0.15)',
            border: '1px solid rgba(255, 64, 129, 0.5)',
            color: '#ff4081',
          }}
        >
          <span>⚠️ {loadError}</span>
          <button
            onClick={() => setLoadError(null)}
            aria-label="エラーを閉じる"
            className="ml-3 text-base leading-none hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}

      <main className="px-4 py-6">
        {tab === 'circles' && (
          <CircleGrid
            patterns={patterns}
            completionMap={completionMap}
            onSelect={setSelectedCard}
          />
        )}
        {tab === 'achievements' && (
          <AchievementGrid
            unlockedIds={unlockedIds}
            justUnlockedIds={justUnlockedIds}
            onSelect={setSelectedCard}
          />
        )}
        {tab === 'titles' && (
          <TitleGrid
            unlockedIds={unlockedIds}
            equippedTitleId={equippedTitleId}
            onEquip={handleEquip}
            onSelect={setSelectedCard}
          />
        )}
        {tab === 'challenges' && (
          <ChallengeGrid
            histories={histories}
            completions={completions}
            onSelect={setSelectedCard}
          />
        )}
      </main>

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onEquip={handleEquip}
          equippedTitleId={equippedTitleId}
          onDraw={handleDraw}
        />
      )}
    </div>
  );
}

function CircleGrid({
  patterns,
  completionMap,
  onSelect,
}: {
  patterns: MagicCirclePattern[];
  completionMap: Map<string, CompletionRecord>;
  onSelect: (card: SelectedCard) => void;
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
      style={{ scrollSnapType: 'x mandatory', touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
    >
      {patterns.map((p) => (
        <button
          key={p.name}
          onClick={() =>
            onSelect({ type: 'circle', pattern: p, completion: completionMap.get(p.name) })
          }
          style={{ display: 'block', cursor: 'pointer', background: 'none', border: 'none', padding: 0, touchAction: 'manipulation' }}
        >
          <MagicCircleCard pattern={p} completion={completionMap.get(p.name)} />
        </button>
      ))}
    </div>
  );
}

function AchievementGrid({
  unlockedIds,
  justUnlockedIds,
  onSelect,
}: {
  unlockedIds: Set<string>;
  justUnlockedIds: Set<string>;
  onSelect: (card: SelectedCard) => void;
}) {
  return (
    <div
      className="grid grid-flow-col grid-rows-2 gap-3 overflow-x-auto pb-2"
      style={{ scrollSnapType: 'x mandatory', touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
    >
      {ACHIEVEMENTS.map((a) => (
        <button
          key={a.id}
          onClick={() =>
            onSelect({ type: 'achievement', achievement: a, unlocked: unlockedIds.has(a.id) })
          }
          style={{ display: 'block', cursor: 'pointer', background: 'none', border: 'none', padding: 0, touchAction: 'manipulation' }}
        >
          <AchievementCard
            achievement={a}
            unlocked={unlockedIds.has(a.id)}
            justUnlocked={justUnlockedIds.has(a.id)}
          />
        </button>
      ))}
    </div>
  );
}

function TitleGrid({
  unlockedIds,
  equippedTitleId,
  onEquip,
  onSelect,
}: {
  unlockedIds: Set<string>;
  equippedTitleId: string | null;
  onEquip: (id: string | null) => void;
  onSelect: (card: SelectedCard) => void;
}) {
  return (
    <div
      className="grid grid-flow-col grid-rows-2 gap-3 overflow-x-auto pb-2"
      style={{ scrollSnapType: 'x mandatory', touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
    >
      {TITLES.map((t) => (
        <button
          key={t.id}
          onClick={() =>
            onSelect({ type: 'title', title: t, unlocked: unlockedIds.has(t.achievementId) })
          }
          style={{ display: 'block', cursor: 'pointer', background: 'none', border: 'none', padding: 0, touchAction: 'manipulation' }}
        >
          <TitleCard
            title={t}
            unlocked={unlockedIds.has(t.achievementId)}
            equipped={equippedTitleId === t.id}
            onEquip={onEquip}
          />
        </button>
      ))}
    </div>
  );
}

function ChallengeGrid({
  histories,
  completions,
  onSelect,
}: {
  histories: MagicCircleHistory[];
  completions: CompletionRecord[];
  onSelect: (card: SelectedCard) => void;
}) {
  return (
    <div
      className="grid grid-flow-col grid-rows-2 gap-3 overflow-x-auto pb-2"
      style={{ scrollSnapType: 'x mandatory', touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
    >
      {CHALLENGES.map((c) => {
        const progress = c.getProgress({ histories, completions });
        return (
          <button
            key={c.id}
            onClick={() => onSelect({ type: 'challenge', challenge: c, progress })}
            style={{ display: 'block', cursor: 'pointer', background: 'none', border: 'none', padding: 0, touchAction: 'manipulation' }}
          >
            <ChallengeCard challenge={c} progress={progress} />
          </button>
        );
      })}
    </div>
  );
}
