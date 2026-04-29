import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { UseMagicCircleReturn } from '@/hooks/useMagicCircle';

// useMagicCircle フックをモック
vi.mock('@/hooks/useMagicCircle');

// 子コンポーネントをモック（テスト対象外）
vi.mock('./HelpModal', () => ({ default: () => null }));
vi.mock('./HistoryPanel', () => ({ default: () => null }));
vi.mock('./HistoryDetail', () => ({ default: () => null }));
vi.mock('./TutorialOverlay', () => ({ default: () => null }));

import { useMagicCircle } from '@/hooks/useMagicCircle';
import MagicCircleCanvas from './MagicCircleCanvas';

// useMagicCircle のデフォルトモック値（通常の待機状態）
const defaultMockReturn: UseMagicCircleReturn = {
  canvasRef: { current: null } as React.RefObject<HTMLCanvasElement | null>,
  canvasSize: 350,
  isDrawing: false,
  userPath: [],
  timeLeft: 60,
  isActive: false,
  showResult: false,
  scoreResult: null,
  debugMsg: 'タップ待ち',
  setDebugMsg: vi.fn(),
  startPoint: { x: 175, y: 52 },
  patternName: 'テストパターン',
  currentIndex: 0,
  totalPatterns: 3,
  difficulty: 'normal',
  difficultyLabel: 'ノーマル',
  handleEvaluate: vi.fn(),
  handleReset: vi.fn(),
  handleNext: vi.fn(),
  handlePrevious: vi.fn(),
  changeDifficulty: vi.fn(),
  getRankColor: () => '#ffffff',
  onPointerDown: vi.fn(),
  onPointerMove: vi.fn(),
  onPointerUp: vi.fn(),
  drawLogs: [],
  savedMagicData: null,
  isReplaying: false,
  handleReplay: vi.fn(),
  handleSaveData: vi.fn(),
  handleLoadData: vi.fn(),
  completionStatus: null,
  voiceActivation: null,
  setVoiceActivation: vi.fn(),
};

const mockUseMagicCircle = vi.mocked(useMagicCircle);

function renderCanvas(overrides: Partial<UseMagicCircleReturn> = {}) {
  mockUseMagicCircle.mockReturnValue({ ...defaultMockReturn, ...overrides });
  return render(
    <MagicCircleCanvas
      onScore={vi.fn()}
      onReset={vi.fn()}
      initialDifficulty="normal"
    />
  );
}

describe('MagicCircleCanvas — ボタン disabled 条件', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 前へ（〈）ボタン ─────────────────────────────────────────────────────

  describe('前へ（〈）ボタン', () => {
    it('currentIndex=0 のとき disabled', () => {
      renderCanvas({ currentIndex: 0 });
      expect(screen.getByRole('button', { name: '〈' })).toBeDisabled();
    });

    it('currentIndex=1 のとき enabled', () => {
      renderCanvas({ currentIndex: 1 });
      expect(screen.getByRole('button', { name: '〈' })).not.toBeDisabled();
    });
  });

  // ─── 次へ（〉）ボタン ─────────────────────────────────────────────────────

  describe('次へ（〉）ボタン', () => {
    it('currentIndex が totalPatterns-1 のとき disabled', () => {
      renderCanvas({ currentIndex: 2, totalPatterns: 3 });
      expect(screen.getByRole('button', { name: '〉' })).toBeDisabled();
    });

    it('currentIndex が totalPatterns-1 未満のとき enabled', () => {
      renderCanvas({ currentIndex: 1, totalPatterns: 3 });
      expect(screen.getByRole('button', { name: '〉' })).not.toBeDisabled();
    });

    it('totalPatterns=1 かつ currentIndex=0 のとき disabled', () => {
      renderCanvas({ currentIndex: 0, totalPatterns: 1 });
      expect(screen.getByRole('button', { name: '〉' })).toBeDisabled();
    });
  });

  // ─── 詠唱完了！ボタン ─────────────────────────────────────────────────────

  describe('詠唱完了！ボタン', () => {
    it('showResult=false かつ isReplaying=false のとき enabled', () => {
      renderCanvas({ showResult: false, isReplaying: false });
      expect(screen.getByRole('button', { name: '詠唱完了！' })).not.toBeDisabled();
    });

    it('showResult=true のとき disabled', () => {
      renderCanvas({
        showResult: true,
        scoreResult: { score: 80, rank: 'A', damageMultiplier: '150%' },
      });
      expect(screen.getByRole('button', { name: '詠唱完了！' })).toBeDisabled();
    });

    it('isReplaying=true のとき disabled', () => {
      renderCanvas({ isReplaying: true });
      expect(screen.getByRole('button', { name: '詠唱完了！' })).toBeDisabled();
    });
  });

  // ─── リプレイボタン（結果画面） ───────────────────────────────────────────

  describe('リプレイボタン（結果画面）', () => {
    const scoreResult = { score: 90, rank: 'S', damageMultiplier: '200%' };

    it('drawLogs あり かつ isReplaying=false のとき enabled', () => {
      renderCanvas({
        showResult: true,
        scoreResult,
        drawLogs: [[{ x: 1, y: 1, t: 0, type: 'start' }]],
        isReplaying: false,
      });
      expect(screen.getByRole('button', { name: '🔄 リプレイ' })).not.toBeDisabled();
    });

    it('drawLogs が空のとき disabled', () => {
      renderCanvas({
        showResult: true,
        scoreResult,
        drawLogs: [],
        isReplaying: false,
      });
      expect(screen.getByRole('button', { name: '🔄 リプレイ' })).toBeDisabled();
    });

    it('isReplaying=true のとき disabled', () => {
      renderCanvas({
        showResult: true,
        scoreResult,
        drawLogs: [[{ x: 1, y: 1, t: 0, type: 'start' }]],
        isReplaying: true,
      });
      expect(screen.getByRole('button', { name: '再生中...' })).toBeDisabled();
    });
  });

  // ─── 表示内容 ─────────────────────────────────────────────────────────────

  describe('表示内容', () => {
    it('patternName が表示される', () => {
      renderCanvas({ patternName: 'テストパターン' });
      expect(screen.getByText('テストパターン')).toBeInTheDocument();
    });

    it('patternName が空のとき「準備中...」が表示される', () => {
      renderCanvas({ patternName: '' });
      expect(screen.getByText('準備中...')).toBeInTheDocument();
    });

    it('showResult=true のとき scoreResult のランクが表示される', () => {
      renderCanvas({
        showResult: true,
        scoreResult: { score: 85, rank: 'A', damageMultiplier: '100%' },
      });
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('showResult=true のとき scoreResult のスコアが表示される', () => {
      renderCanvas({
        showResult: true,
        scoreResult: { score: 85, rank: 'A', damageMultiplier: '100%' },
      });
      expect(screen.getByText('85点')).toBeInTheDocument();
    });

    it('showResult=true のとき damageMultiplier が表示される', () => {
      renderCanvas({
        showResult: true,
        scoreResult: { score: 85, rank: 'A', damageMultiplier: '100%' },
      });
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });

    it('isActive=true のとき timeLeft が表示される', () => {
      renderCanvas({ isActive: true, timeLeft: 42 });
      expect(screen.getByText('42s')).toBeInTheDocument();
    });

    it('isActive=false のとき残り時間テキストが表示されない', () => {
      renderCanvas({ isActive: false, timeLeft: 42 });
      expect(screen.queryByText('42s')).toBeNull();
    });
  });

  // ─── currentIndex / totalPatterns 表示 ───────────────────────────────────

  describe('currentIndex / totalPatterns 表示', () => {
    it('現在のパターン番号と総数が表示される', () => {
      renderCanvas({ currentIndex: 1, totalPatterns: 5 });
      expect(screen.getByText(/#2\s*\/\s*5/)).toBeInTheDocument();
    });
  });
});
