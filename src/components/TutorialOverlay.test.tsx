import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// TutorialCanvasAnimation は canvas API を使うためモック
vi.mock('./TutorialCanvasAnimation', () => ({
  default: () => <div data-testid="tutorial-canvas-animation" />,
}));

import TutorialOverlay from './TutorialOverlay';

const TOTAL_STEPS = 4;

function renderOverlay(onStart = vi.fn()) {
  return render(<TutorialOverlay onStart={onStart} />);
}

describe('TutorialOverlay', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 初期表示 ──────────────────────────────────────────────────────────────

  describe('初期表示（ステップ 0）', () => {
    it('ウェルカムタイトルが表示される', () => {
      renderOverlay();
      expect(screen.getByText(/Arcane Tracerへようこそ/)).toBeTruthy();
    });

    it('ボタンテキストが「次へ →」', () => {
      renderOverlay();
      expect(screen.getByRole('button', { name: /次へ/ })).toBeTruthy();
    });

    it('TutorialCanvasAnimation はステップ 0 では表示されない', () => {
      renderOverlay();
      expect(screen.queryByTestId('tutorial-canvas-animation')).toBeNull();
    });

    it(`プログレスドットが ${TOTAL_STEPS} 個表示される`, () => {
      const { container } = renderOverlay();
      const dots = container.querySelectorAll('.rounded-full.h-2.w-2');
      expect(dots).toHaveLength(TOTAL_STEPS);
    });

    it('ステップ 0 のドットが cyan でハイライトされる', () => {
      const { container } = renderOverlay();
      const dots = Array.from(container.querySelectorAll('.rounded-full.h-2.w-2'));
      // jsdom は #00e5ff を rgb(0, 229, 255) に変換する
      expect((dots[0] as HTMLElement).style.background).toContain('rgb(0, 229, 255)');
    });
  });

  // ─── ステップ遷移 ──────────────────────────────────────────────────────────

  describe('ステップ遷移', () => {
    it('「次へ」をクリックするとステップ 1 のタイトルが表示される', () => {
      renderOverlay();
      fireEvent.click(screen.getByRole('button', { name: /次へ/ }));
      expect(screen.getByText(/手順/)).toBeTruthy();
    });

    it('ステップ 2（アニメーション）で TutorialCanvasAnimation が表示される', () => {
      renderOverlay();
      fireEvent.click(screen.getByRole('button', { name: /次へ/ })); // step 1
      fireEvent.click(screen.getByRole('button', { name: /次へ/ })); // step 2
      expect(screen.getByTestId('tutorial-canvas-animation')).toBeTruthy();
    });

    it('ステップ 2 を超えると TutorialCanvasAnimation が消える', () => {
      renderOverlay();
      fireEvent.click(screen.getByRole('button', { name: /次へ/ })); // step 1
      fireEvent.click(screen.getByRole('button', { name: /次へ/ })); // step 2
      fireEvent.click(screen.getByRole('button', { name: /次へ/ })); // step 3
      expect(screen.queryByTestId('tutorial-canvas-animation')).toBeNull();
    });

    it(`ステップ ${TOTAL_STEPS - 1}（最終）でボタンが「始める」に変わる`, () => {
      renderOverlay();
      for (let i = 0; i < TOTAL_STEPS - 1; i++) {
        fireEvent.click(screen.getByRole('button', { name: /次へ|始める/ }));
      }
      expect(screen.getByRole('button', { name: /始める/ })).toBeTruthy();
    });

    it('最終ステップで「始める」をクリックすると onStart が呼ばれる', () => {
      const onStart = vi.fn();
      renderOverlay(onStart);
      for (let i = 0; i < TOTAL_STEPS - 1; i++) {
        fireEvent.click(screen.getByRole('button', { name: /次へ|始める/ }));
      }
      fireEvent.click(screen.getByRole('button', { name: /始める/ }));
      expect(onStart).toHaveBeenCalledOnce();
    });

    it('最終ステップ前に onStart は呼ばれない', () => {
      const onStart = vi.fn();
      renderOverlay(onStart);
      for (let i = 0; i < TOTAL_STEPS - 1; i++) {
        fireEvent.click(screen.getByRole('button', { name: /次へ|始める/ }));
      }
      expect(onStart).not.toHaveBeenCalled();
    });
  });

  // ─── プログレスインジケーター ──────────────────────────────────────────────

  describe('プログレスインジケーター', () => {
    it('ステップ 1 に進むとドット 0 と 1 が cyan になる', () => {
      const { container } = renderOverlay();
      fireEvent.click(screen.getByRole('button', { name: /次へ/ }));
      const dots = Array.from(container.querySelectorAll('.rounded-full.h-2.w-2'));
      expect((dots[0] as HTMLElement).style.background).toContain('rgb(0, 229, 255)');
      expect((dots[1] as HTMLElement).style.background).toContain('rgb(0, 229, 255)');
    });

    it('ステップ 1 のとき未到達ドット（2, 3）は暗い色', () => {
      const { container } = renderOverlay();
      fireEvent.click(screen.getByRole('button', { name: /次へ/ }));
      const dots = Array.from(container.querySelectorAll('.rounded-full.h-2.w-2'));
      expect((dots[2] as HTMLElement).style.background).not.toContain('rgb(0, 229, 255)');
      expect((dots[3] as HTMLElement).style.background).not.toContain('rgb(0, 229, 255)');
    });
  });

  // ─── オーバーレイ構造 ────────────────────────────────────────────────────

  describe('オーバーレイ構造', () => {
    it('オーバーレイが z-[200] クラスを持つ', () => {
      const { container } = renderOverlay();
      const overlay = container.querySelector('[class*="z-\\[200\\]"]');
      expect(overlay).toBeTruthy();
    });

    it('本文テキストが表示される', () => {
      renderOverlay();
      expect(screen.getByText(/魔法陣をお手本通りになぞって/)).toBeTruthy();
    });
  });
});
