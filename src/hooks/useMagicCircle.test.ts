import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// 外部依存のモック
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/historyDB', () => ({
  addHistory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/completionDB', () => ({
  updateCompletion: vi.fn().mockResolvedValue(undefined),
  isPatternCompleted: vi.fn().mockResolvedValue(false),
  getCompletedCount: vi.fn().mockResolvedValue(0),
  getTotalPatternsCount: vi.fn().mockResolvedValue(5),
}));

vi.mock('@/hooks/useVoiceActivation', () => ({
  useVoiceActivation: () => null,
}));

import { useMagicCircle } from './useMagicCircle';
import { DIFFICULTY_TIME } from '@/lib/patterns';

describe('useMagicCircle', () => {
  const onScore = vi.fn();
  const onReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 1. 画面状態: 初期状態 ───────────────────────────────────────────────

  describe('初期状態', () => {
    it('isDrawing は false', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      expect(result.current.isDrawing).toBe(false);
    });

    it('isActive は false', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      expect(result.current.isActive).toBe(false);
    });

    it('showResult は false', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      expect(result.current.showResult).toBe(false);
    });

    it('scoreResult は null', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      expect(result.current.scoreResult).toBeNull();
    });

    it('userPath は空配列', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      expect(result.current.userPath).toEqual([]);
    });

    it('difficulty は normal', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      expect(result.current.difficulty).toBe('normal');
    });

    it('timeLeft は normal 難易度の初期値', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      expect(result.current.timeLeft).toBe(DIFFICULTY_TIME.normal);
    });

    it('drawLogs は空配列', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      expect(result.current.drawLogs).toEqual([]);
    });

    it('isReplaying は false', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      expect(result.current.isReplaying).toBe(false);
    });
  });

  // ─── 1. 画面状態: handleReset ─────────────────────────────────────────────

  describe('handleReset()', () => {
    it('userPath が空配列にリセットされる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.handleReset(); });
      expect(result.current.userPath).toEqual([]);
    });

    it('isActive が false にリセットされる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.handleReset(); });
      expect(result.current.isActive).toBe(false);
    });

    it('showResult が false にリセットされる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.handleReset(); });
      expect(result.current.showResult).toBe(false);
    });

    it('scoreResult が null にリセットされる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.handleReset(); });
      expect(result.current.scoreResult).toBeNull();
    });

    it('drawLogs が空配列にリセットされる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.handleReset(); });
      expect(result.current.drawLogs).toEqual([]);
    });

    it('isReplaying が false にリセットされる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.handleReset(); });
      expect(result.current.isReplaying).toBe(false);
    });

    it('onReset コールバックが呼ばれる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.handleReset(); });
      expect(onReset).toHaveBeenCalledOnce();
    });
  });

  // ─── 1. 画面状態: changeDifficulty ───────────────────────────────────────

  describe('changeDifficulty()', () => {
    it('hard に変更されると difficulty が hard になる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.changeDifficulty('hard'); });
      expect(result.current.difficulty).toBe('hard');
    });

    it('easy に変更されると difficulty が easy になる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.changeDifficulty('easy'); });
      expect(result.current.difficulty).toBe('easy');
    });

    it('expert に変更されると timeLeft が expert 用の値になる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.changeDifficulty('expert'); });
      expect(result.current.timeLeft).toBe(DIFFICULTY_TIME.expert);
    });
  });

  // ─── 2. Canvas状態管理: 描画操作 ─────────────────────────────────────────

  describe('onPointerDown / onPointerMove / onPointerUp', () => {
    const makePointerEvent = (x: number, y: number) =>
      ({
        clientX: x,
        clientY: y,
        pointerId: 1,
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent);

    it('onPointerDown で isDrawing が true になる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.onPointerDown(makePointerEvent(100, 100)); });
      expect(result.current.isDrawing).toBe(true);
    });

    it('onPointerDown で isActive が true になる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.onPointerDown(makePointerEvent(100, 100)); });
      expect(result.current.isActive).toBe(true);
    });

    it('onPointerMove で userPath が増加する', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.onPointerDown(makePointerEvent(100, 100)); });
      act(() => { result.current.onPointerMove(makePointerEvent(110, 110)); });
      expect(result.current.userPath.length).toBeGreaterThan(1);
    });

    it('onPointerUp で isDrawing が false になる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.onPointerDown(makePointerEvent(100, 100)); });
      act(() => { result.current.onPointerUp(); });
      expect(result.current.isDrawing).toBe(false);
    });

    it('onPointerUp で drawLogs が増加する', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.onPointerDown(makePointerEvent(100, 100)); });
      act(() => { result.current.onPointerMove(makePointerEvent(110, 110)); });
      act(() => { result.current.onPointerUp(); });
      expect(result.current.drawLogs.length).toBe(1);
    });

    it('onPointerUp 後に userPath が空配列になる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.onPointerDown(makePointerEvent(100, 100)); });
      act(() => { result.current.onPointerMove(makePointerEvent(120, 120)); });
      act(() => { result.current.onPointerUp(); });
      expect(result.current.userPath).toEqual([]);
    });
  });

  // ─── 2. Canvas状態管理: パターン遷移 ──────────────────────────────────────

  describe('handleNext() / handlePrevious()', () => {
    it('handleNext() で currentIndex が増加する', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      const before = result.current.currentIndex;
      act(() => { result.current.handleNext(); });
      expect(result.current.currentIndex).toBe(before + 1);
    });

    it('handleNext() 後に handlePrevious() で currentIndex が戻る', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      const before = result.current.currentIndex;
      act(() => { result.current.handleNext(); });
      act(() => { result.current.handlePrevious(); });
      expect(result.current.currentIndex).toBe(before);
    });

    it('handlePrevious() を currentIndex=0 で呼んでも 0 のまま', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      expect(result.current.currentIndex).toBe(0);
      act(() => { result.current.handlePrevious(); });
      expect(result.current.currentIndex).toBe(0);
    });

    it('handleNext() 後に showResult が false にリセットされる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.handleNext(); });
      expect(result.current.showResult).toBe(false);
    });

    it('handleNext() 後に drawLogs が空になる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.handleNext(); });
      expect(result.current.drawLogs).toEqual([]);
    });
  });

  // ─── 1. 画面状態: changeDifficulty — 全難易度 ────────────────────────────

  describe('changeDifficulty() — 全難易度', () => {
    it('easy に変更されると timeLeft が DIFFICULTY_TIME.easy になる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.changeDifficulty('easy'); });
      expect(result.current.timeLeft).toBe(DIFFICULTY_TIME.easy);
    });

    it('normal に変更されると timeLeft が DIFFICULTY_TIME.normal になる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.changeDifficulty('hard'); });
      act(() => { result.current.changeDifficulty('normal'); });
      expect(result.current.timeLeft).toBe(DIFFICULTY_TIME.normal);
    });

    it('hard に変更されると timeLeft が DIFFICULTY_TIME.hard になる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.changeDifficulty('hard'); });
      expect(result.current.timeLeft).toBe(DIFFICULTY_TIME.hard);
    });

    it('難易度変更後に handleReset すると timeLeft が新難易度の値のまま', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.changeDifficulty('easy'); });
      act(() => { result.current.handleReset(); });
      expect(result.current.timeLeft).toBe(DIFFICULTY_TIME.easy);
    });
  });

  // ─── 2. Canvas状態管理: 描画操作（追加） ──────────────────────────────────

  describe('onPointerMove — 非描画中', () => {
    const makePointerEvent = (x: number, y: number) =>
      ({
        clientX: x,
        clientY: y,
        pointerId: 1,
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent);

    it('isDrawing=false のとき onPointerMove を呼んでも userPath は空のまま', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.onPointerMove(makePointerEvent(100, 100)); });
      expect(result.current.userPath).toEqual([]);
    });

    it('複数回 onPointerMove すると userPath が複数点に増加する', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.onPointerDown(makePointerEvent(100, 100)); });
      act(() => { result.current.onPointerMove(makePointerEvent(110, 110)); });
      act(() => { result.current.onPointerMove(makePointerEvent(120, 120)); });
      act(() => { result.current.onPointerMove(makePointerEvent(130, 130)); });
      expect(result.current.userPath.length).toBeGreaterThanOrEqual(3);
    });

    it('onPointerUp 後に onPointerMove を呼んでも userPath は空のまま', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.onPointerDown(makePointerEvent(100, 100)); });
      act(() => { result.current.onPointerUp(); });
      act(() => { result.current.onPointerMove(makePointerEvent(150, 150)); });
      expect(result.current.userPath).toEqual([]);
    });
  });

  describe('複数ストローク', () => {
    const makePointerEvent = (x: number, y: number) =>
      ({
        clientX: x,
        clientY: y,
        pointerId: 1,
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent);

    it('2 回ストロークすると drawLogs.length が 2 になる', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      // 1 ストローク目
      act(() => { result.current.onPointerDown(makePointerEvent(100, 100)); });
      act(() => { result.current.onPointerMove(makePointerEvent(110, 110)); });
      act(() => { result.current.onPointerUp(); });
      // 2 ストローク目
      act(() => { result.current.onPointerDown(makePointerEvent(150, 150)); });
      act(() => { result.current.onPointerMove(makePointerEvent(160, 160)); });
      act(() => { result.current.onPointerUp(); });
      expect(result.current.drawLogs.length).toBe(2);
    });

    it('handleReset 後に drawLogs は空配列にリセットされる（複数ストローク後）', () => {
      const { result } = renderHook(() => useMagicCircle(onScore, onReset));
      act(() => { result.current.onPointerDown(makePointerEvent(100, 100)); });
      act(() => { result.current.onPointerMove(makePointerEvent(110, 110)); });
      act(() => { result.current.onPointerUp(); });
      act(() => { result.current.handleReset(); });
      expect(result.current.drawLogs).toEqual([]);
    });
  });
});
