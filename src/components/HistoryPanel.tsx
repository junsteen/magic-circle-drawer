'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { MagicCircleHistory } from '@/lib/types';
import { getRankColor } from '@/lib/scoring';
import {
  getAllHistories,
  deleteHistory,
  deleteAllHistories,
  updateHistoryFields,
} from '@/lib/historyDB';
import { compressForUrlOptimized as compressForUrl } from '@/lib/shareUtils';
import { ShareModal } from '@/components/ShareModal';

const STAR_FILTER = '__star__';

/**
 * 履歴パネルコンポーネントのプロパティ
 */
interface HistoryPanelProps {
  /** パネルを開くかどうかのフラグ */
  isOpen: boolean;
  /** パネルを閉じるコールバック関数 */
  onClose: () => void;
  /** 履歴アイテムが選択されたときのコールバック関数 */
  onSelect: (history: MagicCircleHistory) => void;
}

/**
 * 履歴パネルコンポーネント
 * 保存された魔法陣の履歴一覧を表示し、選択、共有、削除、タグ管理機能を提供
 */
export default function HistoryPanel({ isOpen, onClose, onSelect }: HistoryPanelProps) {
  const [histories, setHistories] = useState<MagicCircleHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  /** 選択中フィルタ: null=すべて / STAR_FILTER=★のみ / それ以外=タグ名 */
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [shareModalData, setShareModalData] = useState<{ url: string; title: string; text: string } | null>(null);

  const loadHistories = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllHistories();
      setHistories(data);
    } catch (e) {
      console.error('Failed to load histories:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadHistories();
  }, [isOpen, loadHistories]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('この履歴を削除しますか？')) return;
    try {
      await deleteHistory(id);
      setHistories((prev) => prev.filter((h) => h.id !== id));
    } catch (e) {
      console.error('Failed to delete history:', e);
    }
  };

  const handleDeleteAll = async () => {
    /** 現在のフィルタで表示中の履歴をすべて削除 */
    if (filteredHistories.length === 0) return;
    const filterLabel =
      selectedFilter === null
        ? 'すべての履歴'
        : selectedFilter === STAR_FILTER
          ? '★お気に入りの履歴'
          : `タグ「${selectedFilter}」の履歴`;
    if (
      !window.confirm(
        `${filterLabel}（${filteredHistories.length}件）を削除しますか？\nこの操作は元に戻せません。`,
      )
    )
      return;
    try {
      if (selectedFilter === null) {
        // 全件削除はストアごとクリアして高速化
        await deleteAllHistories();
        setHistories([]);
      } else {
        const targetIds = new Set(filteredHistories.map((h) => h.id));
        for (const id of targetIds) {
          await deleteHistory(id);
        }
        setHistories((prev) => prev.filter((h) => !targetIds.has(h.id)));
        // 削除後、選択中フィルタが空になったら全件表示に戻す
        setSelectedFilter(null);
      }
    } catch (e) {
      console.error('Failed to delete histories:', e);
    }
  };

  const handleToggleStar = async (e: React.MouseEvent, h: MagicCircleHistory) => {
    e.stopPropagation();
    const next = !h.starred;
    try {
      await updateHistoryFields(h.id, { starred: next });
      setHistories((prev) => prev.map((x) => (x.id === h.id ? { ...x, starred: next } : x)));
    } catch (e) {
      console.error('Failed to toggle star:', e);
    }
  };

  const handleAddTag = async (e: React.MouseEvent, h: MagicCircleHistory) => {
    e.stopPropagation();
    const input = window.prompt('タグ名を入力してください（カンマ区切りで複数指定可）');
    if (!input) return;
    const newTags = input
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.length <= 20);
    if (newTags.length === 0) return;
    const merged = Array.from(new Set([...(h.tags ?? []), ...newTags]));
    try {
      await updateHistoryFields(h.id, { tags: merged });
      setHistories((prev) =>
        prev.map((x) => (x.id === h.id ? { ...x, tags: merged } : x)),
      );
    } catch (e) {
      console.error('Failed to add tag:', e);
    }
  };

  const handleRemoveTag = async (
    e: React.MouseEvent,
    h: MagicCircleHistory,
    tag: string,
  ) => {
    e.stopPropagation();
    if (!window.confirm(`タグ「${tag}」を外しますか？`)) return;
    const next = (h.tags ?? []).filter((t) => t !== tag);
    try {
      await updateHistoryFields(h.id, { tags: next });
      setHistories((prev) =>
        prev.map((x) => (x.id === h.id ? { ...x, tags: next } : x)),
      );
      // 削除後、そのタグがどこにも残っていなければ選択解除
      if (selectedFilter === tag) {
        const stillExists = histories.some(
          (x) => x.id !== h.id && (x.tags ?? []).includes(tag),
        );
        if (!stillExists) setSelectedFilter(null);
      }
    } catch (e) {
      console.error('Failed to remove tag:', e);
    }
  };

  /** 全履歴から登場するユニークなタグ一覧（昇順） */
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const h of histories) {
      for (const t of h.tags ?? []) set.add(t);
    }
    return Array.from(set).sort();
  }, [histories]);

  /** フィルタ適用後の表示用履歴 */
  const filteredHistories = useMemo(() => {
    if (selectedFilter === null) return histories;
    if (selectedFilter === STAR_FILTER) return histories.filter((h) => h.starred);
    return histories.filter((h) => (h.tags ?? []).includes(selectedFilter));
  }, [histories, selectedFilter]);

  const formatTime = (timestamp: number): string => {
    const d = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffSec < 60) return 'たった今';
    if (diffMin < 60) return `${diffMin}分前`;
    if (diffHour < 24) return `${diffHour}時間前`;
    if (diffDay < 7) return `${diffDay}日前`;
    return d.toLocaleDateString('ja-JP');
  };

  if (!isOpen) return null;

  return (
    <>
      {shareModalData && (
        <ShareModal
          longUrl={shareModalData.url}
          title={shareModalData.title}
          text={shareModalData.text}
          onClose={() => setShareModalData(null)}
        />
      )}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[80vh] flex-col rounded-t-2xl"
        style={{
          background: '#0d0d1a',
          border: '1px solid rgba(0,229,255,0.2)',
          borderBottom: 'none',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h2 className="text-lg font-bold" style={{ color: '#00e5ff' }}>
            📜 作成履歴
          </h2>
          <div className="flex items-center gap-2">
            {filteredHistories.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="rounded-md px-3 py-1.5 text-xs font-bold transition-colors"
                style={{
                  border: '1px solid rgba(255, 64, 129, 0.5)',
                  color: '#ff4081',
                  background: 'rgba(255, 64, 129, 0.08)',
                  touchAction: 'manipulation',
                }}
                title={
                  selectedFilter === null
                    ? 'すべての履歴を削除'
                    : '表示中の履歴をまとめて削除'
                }
              >
                🗑 すべて削除
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>
        </div>

        {/* タグバー（ブックマークバー風） */}
        {histories.length > 0 && (
          <div
            className="flex gap-2 overflow-x-auto border-b border-gray-800 px-3 py-2"
            style={{ touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
          >
            <TagChip
              label="すべて"
              active={selectedFilter === null}
              onClick={() => setSelectedFilter(null)}
            />
            <TagChip
              label="★"
              active={selectedFilter === STAR_FILTER}
              onClick={() => setSelectedFilter(STAR_FILTER)}
              accent
            />
            {allTags.map((t) => (
              <TagChip
                key={t}
                label={t}
                active={selectedFilter === t}
                onClick={() => setSelectedFilter(t)}
              />
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-gray-400">
              読み込み中...
            </div>
          )}
          {!isLoading && histories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <span className="text-3xl">📭</span>
              <p className="mt-2 text-sm">まだ履歴がありません</p>
            </div>
          )}
          {!isLoading && histories.length > 0 && filteredHistories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <span className="text-3xl">🔍</span>
              <p className="mt-2 text-sm">該当する履歴がありません</p>
            </div>
          )}
          {!isLoading && filteredHistories.length > 0 && (
            <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4">
              {filteredHistories.map((h) => (
                <div
                  key={h.id}
                  onClick={() => onSelect(h)}
                  className="group relative cursor-pointer overflow-hidden rounded-lg border border-gray-700 transition-all hover:border-cyan-500 active:scale-95"
                  style={{ background: '#0a0a14' }}
                >
                  <div
                    className="relative aspect-square w-full overflow-hidden"
                    style={{ background: '#0a0a14' }}
                  >
                    {h.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={h.thumbnail}
                        alt={h.data.pattern.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl text-gray-600">
                        🔮
                      </div>
                    )}
                    {/* ランクバッジ */}
                    <div
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        background: `${getRankColor(h.rank)}22`,
                        color: getRankColor(h.rank),
                        border: `1px solid ${getRankColor(h.rank)}`,
                      }}
                    >
                      {h.rank}
                    </div>
                    {/* ★ お気に入りトグル */}
                    <button
                      onClick={(e) => handleToggleStar(e, h)}
                      className="absolute bottom-1 left-1 flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors"
                      style={{
                        background: 'rgba(0,0,0,0.7)',
                        border: `1px solid ${h.starred ? '#ffd700' : 'rgba(255,215,0,0.3)'}`,
                        color: h.starred ? '#ffd700' : '#7676aa',
                        touchAction: 'manipulation',
                      }}
                      title={h.starred ? 'お気に入り解除' : 'お気に入りに追加'}
                      aria-label={h.starred ? 'お気に入り解除' : 'お気に入りに追加'}
                    >
                      {h.starred ? '★' : '☆'}
                    </button>
                    {/* 削除ボタン */}
                    <button
                      onClick={(e) => handleDelete(e, h.id)}
                      className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full text-xs text-gray-300 transition-colors hover:bg-red-500/30 hover:text-red-300"
                      style={{
                        background: 'rgba(0, 0, 0, 0.7)',
                        border: '1px solid rgba(255, 64, 129, 0.4)',
                        touchAction: 'manipulation',
                      }}
                      title="削除"
                      aria-label="この履歴を削除"
                    >
                      🗑
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-2 text-center">
                    <div className="truncate text-xs font-bold" style={{ color: '#7c4dff' }}>
                      {h.data.pattern.name}
                    </div>
                    <div className="text-xs text-gray-500">{formatTime(h.createdAt)}</div>

                    {/* タグチップ一覧 + 追加ボタン */}
                    <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                      {(h.tags ?? []).map((tag) => (
                        <button
                          key={tag}
                          onClick={(e) => handleRemoveTag(e, h, tag)}
                          className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] transition-colors hover:bg-cyan-500/20"
                          style={{
                            background: 'rgba(0, 229, 255, 0.08)',
                            border: '1px solid rgba(0, 229, 255, 0.3)',
                            color: '#00e5ff',
                            touchAction: 'manipulation',
                          }}
                          title={`タグ「${tag}」を外す`}
                        >
                          {tag} <span className="opacity-60">✕</span>
                        </button>
                      ))}
                      <button
                        onClick={(e) => handleAddTag(e, h)}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] transition-colors hover:bg-cyan-500/20"
                        style={{
                          background: 'rgba(0, 229, 255, 0.04)',
                          border: '1px dashed rgba(0, 229, 255, 0.4)',
                          color: '#00e5ff',
                          touchAction: 'manipulation',
                        }}
                        title="タグを追加"
                        aria-label="タグを追加"
                      >
                        +
                      </button>
                    </div>

                    {/* Share Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (h && h.data) {
                          const shareData = {
                            pattern: h.data.pattern,
                            drawLogs: h.data.drawLogs,
                            score: h.score,
                            rank: h.rank,
                            difficulty: h.difficulty,
                            difficultyMultiplier: h.difficultyMultiplier,
                            damageMultiplier: h.damageMultiplier,
                            createdAt: h.createdAt,
                          };
                          const compressed = compressForUrl(shareData);
                          if (!compressed) return;
                          setShareModalData({
                            url: `${window.location.origin}/replay?data=${compressed}`,
                            title: `Arcane Tracer - ${h.data.pattern.name}`,
                            text: `私の魔法陣詠唱結果: ${h.rank}ランク (${h.score}点)`,
                          });
                        }
                      }}
                      className="absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all hover:bg-gray-700"
                      title="共有"
                      style={{ touchAction: 'manipulation' }}
                    >
                      📤
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** タグバー用のチップボタン */
function TagChip({
  label,
  active,
  onClick,
  accent,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: boolean;
}) {
  const accentColor = accent ? '#ffd700' : '#00e5ff';
  return (
    <button
      onClick={onClick}
      className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold transition-colors"
      style={{
        background: active
          ? `${accentColor}22`
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? accentColor : 'rgba(255,255,255,0.1)'}`,
        color: active ? accentColor : '#7676aa',
        touchAction: 'manipulation',
      }}
    >
      {label}
    </button>
  );
}
