import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { UseMagicCircleReturn } from '@/hooks/useMagicCircle';

// useMagicCircle フックをモック
vi.mock('@/hooks/useMagicCircle');

// 子コンポーネントをモック（テスト対象外）
vi.mock('./HelpModal', () => ({ default: () => null }));
vi.mock('./HistoryPanel', () => ({ default: () => null }));
vi.mock('./HistoryDetail', () => ({ default: () => null }));
// TutorialOverlay は存在検出のため data-testid を返すモック
vi.mock('./TutorialOverlay', () => ({
  default: ({ onStart }: { onStart: () => void }) => (
    <div data-testid="tutorial-overlay">
      <button onClick={onStart}>tutorial-start</button>
    </div>
  ),
}));

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
});

// ─── チュートリアル自動表示テスト ────────────────────────────────────────────

describe('MagicCircleCanvas — チュートリアル自動表示', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseMagicCircle.mockReturnValue(defaultMockReturn);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('localStorage に tutorialCompleted がない場合にチュートリアルが表示される', () => {
    render(
      <MagicCircleCanvas onScore={vi.fn()} onReset={vi.fn()} initialDifficulty="normal" />
    );
    expect(screen.getByTestId('tutorial-overlay')).toBeTruthy();
  });

  it('localStorage に tutorialCompleted がある場合はチュートリアルが表示されない', () => {
    localStorage.setItem('tutorialCompleted', '1');
    render(
      <MagicCircleCanvas onScore={vi.fn()} onReset={vi.fn()} initialDifficulty="normal" />
    );
    expect(screen.queryByTestId('tutorial-overlay')).toBeNull();
  });

  it('チュートリアル完了後に localStorage に tutorialCompleted が保存される', () => {
    render(
      <MagicCircleCanvas onScore={vi.fn()} onReset={vi.fn()} initialDifficulty="normal" />
    );
    fireEvent.click(screen.getByRole('button', { name: 'tutorial-start' }));
    expect(localStorage.getItem('tutorialCompleted')).toBe('1');
  });

  it('チュートリアル完了後にオーバーレイが消える', () => {
    render(
      <MagicCircleCanvas onScore={vi.fn()} onReset={vi.fn()} initialDifficulty="normal" />
    );
    fireEvent.click(screen.getByRole('button', { name: 'tutorial-start' }));
    expect(screen.queryByTestId('tutorial-overlay')).toBeNull();
  });
});
