import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Next.js ルーターをモック
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

// データベース関数をモック
vi.mock('@/lib/completionDB', () => ({
  getAllCompletions: vi.fn(),
}));
vi.mock('@/lib/historyDB', () => ({
  getAllHistories: vi.fn(),
}));
vi.mock('@/lib/achievementDB', () => ({
  checkAndUnlockAchievements: vi.fn(),
  getUnlockedAchievementIds: vi.fn(),
}));
vi.mock('@/lib/titles', () => ({
  TITLES: [],
  getEquippedTitleId: () => null,
  saveEquippedTitleId: vi.fn(),
}));
vi.mock('@/lib/challenges', () => ({
  CHALLENGES: [],
}));
vi.mock('@/lib/achievements', () => ({
  ACHIEVEMENTS: [],
}));
vi.mock('@/lib/patterns', () => ({
  createPresetPattern: () => [],
}));

// サブコンポーネントをモック
vi.mock('@/components/grimoire/MagicCircleCard', () => ({ default: () => null }));
vi.mock('@/components/grimoire/AchievementCard', () => ({ default: () => null }));
vi.mock('@/components/grimoire/TitleCard', () => ({ default: () => null }));
vi.mock('@/components/grimoire/ChallengeCard', () => ({ default: () => null }));
vi.mock('@/components/grimoire/CardDetailModal', () => ({ default: () => null }));

import { getAllCompletions } from '@/lib/completionDB';
import { getAllHistories } from '@/lib/historyDB';
import { checkAndUnlockAchievements, getUnlockedAchievementIds } from '@/lib/achievementDB';
import GrimoirePage from './page';

const mockGetAllCompletions = vi.mocked(getAllCompletions);
const mockGetAllHistories = vi.mocked(getAllHistories);
const mockCheckAndUnlockAchievements = vi.mocked(checkAndUnlockAchievements);
const mockGetUnlockedAchievementIds = vi.mocked(getUnlockedAchievementIds);

function setupSuccessMocks() {
  mockGetAllCompletions.mockResolvedValue([]);
  mockGetAllHistories.mockResolvedValue([]);
  mockCheckAndUnlockAchievements.mockResolvedValue([]);
  mockGetUnlockedAchievementIds.mockResolvedValue(new Set());
}

describe('GrimoirePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 正常系 ──────────────────────────────────────────────────────────────────

  describe('正常系', () => {
    it('ページタイトル「魔導書」が表示される', () => {
      setupSuccessMocks();
      render(<GrimoirePage />);
      expect(screen.getByText('魔導書')).toBeTruthy();
    });

    it('4つのタブ（魔法陣・アチーブメント・タイトル・チャレンジ）が表示される', () => {
      setupSuccessMocks();
      render(<GrimoirePage />);
      expect(screen.getByText('魔法陣')).toBeTruthy();
      expect(screen.getByText('アチーブメント')).toBeTruthy();
      expect(screen.getByText('タイトル')).toBeTruthy();
      expect(screen.getByText('チャレンジ')).toBeTruthy();
    });

    it('データ読み込み成功時にエラーバナーは表示されない', async () => {
      setupSuccessMocks();
      render(<GrimoirePage />);
      await waitFor(() => {
        expect(screen.queryByRole('alert')).toBeNull();
      });
    });
  });

  // ─── エラーハンドリング ───────────────────────────────────────────────────────

  describe('エラーハンドリング', () => {
    it('getAllCompletions が失敗するとエラーバナーが表示される', async () => {
      mockGetAllCompletions.mockRejectedValue(new Error('DB error'));
      mockGetAllHistories.mockResolvedValue([]);
      mockCheckAndUnlockAchievements.mockResolvedValue([]);
      mockGetUnlockedAchievementIds.mockResolvedValue(new Set());

      render(<GrimoirePage />);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy();
      });
      expect(screen.getByText(/魔法陣データの読み込みに失敗しました/)).toBeTruthy();
    });

    it('getAllHistories が失敗するとエラーバナーが表示される', async () => {
      mockGetAllCompletions.mockResolvedValue([]);
      mockGetAllHistories.mockRejectedValue(new Error('DB error'));
      mockCheckAndUnlockAchievements.mockResolvedValue([]);
      mockGetUnlockedAchievementIds.mockResolvedValue(new Set());

      render(<GrimoirePage />);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy();
      });
      expect(screen.getByText(/履歴データの読み込みに失敗しました/)).toBeTruthy();
    });

    it('checkAndUnlockAchievements が失敗するとエラーバナーが表示される', async () => {
      mockGetAllCompletions.mockResolvedValue([]);
      mockGetAllHistories.mockResolvedValue([]);
      mockCheckAndUnlockAchievements.mockRejectedValue(new Error('DB error'));
      mockGetUnlockedAchievementIds.mockResolvedValue(new Set());

      render(<GrimoirePage />);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy();
      });
      expect(screen.getByText(/アチーブメントデータの読み込みに失敗しました/)).toBeTruthy();
    });

    it('エラーバナーの閉じるボタンでバナーが消える', async () => {
      mockGetAllCompletions.mockRejectedValue(new Error('DB error'));
      mockGetAllHistories.mockResolvedValue([]);
      mockCheckAndUnlockAchievements.mockResolvedValue([]);
      mockGetUnlockedAchievementIds.mockResolvedValue(new Set());

      render(<GrimoirePage />);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy();
      });

      fireEvent.click(screen.getByRole('button', { name: 'エラーを閉じる' }));
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });
});
