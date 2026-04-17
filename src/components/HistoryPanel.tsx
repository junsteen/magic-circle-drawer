'use client';

import { useEffect, useState, useCallback } from 'react';
import type { MagicCircleHistory } from '@/lib/types';
import { getAllHistories, deleteHistory } from '@/lib/historyDB';
import { compressForUrlOptimized as compressForUrl } from '@/lib/shareUtils';

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
 * 保存された魔法陣の履歴一覧を表示し、選択、共有、削除機能を提供
 * @param isOpen - パネルを開くかどうかのフラグ
 * @param onClose - パネルを閉じるコールバック関数
 * @param onSelect - 履歴アイテムが選択されたときのコールバック関数
 * @returns 履歴パネルのJSX要素（閉じている場合はnull）
 */
export default function HistoryPanel({ isOpen, onClose, onSelect }: HistoryPanelProps) {
  const [histories, setHistories] = useState<MagicCircleHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistories = useCallback(async () => {
    /** 履歴データの読み込み状態を設定 */
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
    /** パネルが開かれたときに履歴データを読み込み */
    if (isOpen) loadHistories();
  }, [isOpen, loadHistories]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    /** 履歴アイテムの削除処理 */
    e.stopPropagation();
    try {
      await deleteHistory(id);
      setHistories((prev) => prev.filter((h) => h.id !== id));
    } catch (e) {
      console.error('Failed to delete history:', e);
    }
  };

  /**
   * タイムスタンプから相対時間文字列を生成
   * @param timestamp ミリ秒単位のタイムスタンプ
   * @returns 「たった今」「5分前」などの相対時間文字列
   */
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

  /**
   * ランクに対応する色を取得
   * @param rank ランク文字列（S/A/B/C）
   * @returns ランクに対応するHEXカラーコード
   */
  const getRankColor = (rank: string): string => {
    switch (rank) {
      case 'S': return '#ffd700';
      case 'A': return '#00e5ff';
      case 'B': return '#76ff03';
      default: return '#ff4081';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[70vh] flex-col rounded-t-2xl"
        style={{ background: '#0d0d1a', border: '1px solid rgba(0,229,255,0.2)', borderBottom: 'none' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h2 className="text-lg font-bold" style={{ color: '#00e5ff' }}>📜 作成履歴</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-gray-400">読み込み中...</div>
          )}
          {!isLoading && histories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <span className="text-3xl">📭</span>
              <p className="mt-2 text-sm">まだ履歴がありません</p>
            </div>
          )}
          {!isLoading && histories.length > 0 && (
            <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4">
              {histories.map((h) => (
                <div
                  key={h.id}
                  onClick={() => onSelect(h)}
                  className="group relative cursor-pointer overflow-hidden rounded-lg border border-gray-700 transition-all hover:border-cyan-500 active:scale-95"
                  style={{ background: '#0a0a14' }}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square w-full overflow-hidden" style={{ background: '#0a0a14' }}>
                    {h.thumbnail ? (
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
                    {/* Overlay rank badge */}
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
                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(e, h.id)}
                      className="absolute bottom-1 right-1 rounded-full bg-black/70 p-1 text-xs text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
                      title="削除"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-2 text-center">
                    <div className="truncate text-xs font-bold" style={{ color: '#7c4dff' }}>
                      {h.data.pattern.name}
                    </div>
                    <div className="text-xs text-gray-500">{formatTime(h.createdAt)}</div>
                    {/* Share Button */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation(); // Prevent triggering onSelect
                        if (h && h.data) {
                          try {
                            // Compress the data for URL sharing (only essential data to keep URL short)
                            const shareData = {
                              pattern: h.data.pattern,
                              drawLogs: h.data.drawLogs,
                              // Include minimal metadata for proper scoring
                              score: h.score,
                              rank: h.rank,
                              difficulty: h.difficulty,
                              difficultyMultiplier: h.difficultyMultiplier,
                              damageMultiplier: h.damageMultiplier
                            };
                            
                            const compressed = compressForUrl(shareData);
                            if (!compressed) {
                              throw new Error('Failed to compress data');
                            }
                            
                            // Create shareable URL
                            const shareUrl = `${window.location.origin}/replay?data=${compressed}`;
                            
                            // Try to use the Web Share API if available
                            if (navigator.share) {
                              await navigator.share({
                                title: `Arcane Tracer - ${h.data.pattern.name}`,
                                text: `私の魔法陣詠唱結果: ${h.rank}ランク (${h.score}点)`,
                                url: shareUrl
                              });
                            } else {
                              // Fallback: copy to clipboard
                              await navigator.clipboard.writeText(shareUrl);
                              
                              // Show temporary visual feedback
                              const originalBtn = e.target as HTMLButtonElement;
                              const originalContent = originalBtn.innerHTML;
                              originalBtn.innerHTML = '✅ コピー済み';
                              originalBtn.classList.add('bg-green-500');
                              setTimeout(() => {
                                originalBtn.innerHTML = originalContent;
                                originalBtn.classList.remove('bg-green-500');
                              }, 2000);
                            }
                          } catch (err) {
                            console.error('Failed to share:', err);
                            // Show error feedback
                            const originalBtn = e.target as HTMLButtonElement;
                            const originalContent = originalBtn.innerHTML;
                            originalBtn.innerHTML = '❌ エラー';
                            originalBtn.classList.add('bg-red-500');
                            setTimeout(() => {
                              originalBtn.innerHTML = originalContent;
                              originalBtn.classList.remove('bg-red-500');
                            }, 2000);
                          }
                        }
                      }}
                      className="absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all hover:bg-gray-700"
                      title="共有"
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
