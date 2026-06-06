import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import HelpModal from './HelpModal';

describe('HelpModal', () => {
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
  });

  // ─── 表示内容 ───────────────────────────────────────────────────────────────

  describe('表示内容', () => {
    it('ヘルプタイトルが表示される', () => {
      render(<HelpModal onClose={onClose} />);
      expect(screen.getByText(/ヘルプ/)).toBeTruthy();
    });

    it('5つの手順が番号付きで表示される', () => {
      render(<HelpModal onClose={onClose} />);
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(String(i))).toBeTruthy();
      }
    });

    it('ランク一覧（S/A/B/C）が表示される', () => {
      render(<HelpModal onClose={onClose} />);
      expect(screen.getByText(/Sランク/)).toBeTruthy();
      expect(screen.getByText(/Aランク/)).toBeTruthy();
      expect(screen.getByText(/Bランク/)).toBeTruthy();
      expect(screen.getByText(/Cランク/)).toBeTruthy();
    });

    it('「閉じる」ボタンが表示される', () => {
      render(<HelpModal onClose={onClose} />);
      expect(screen.getByRole('button', { name: '閉じる' })).toBeTruthy();
    });
  });

  // ─── インタラクション ───────────────────────────────────────────────────────

  describe('インタラクション', () => {
    it('「閉じる」ボタンクリックで onClose が呼ばれる', () => {
      render(<HelpModal onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('オーバーレイ（背景）クリックで onClose が呼ばれる', () => {
      const { container } = render(<HelpModal onClose={onClose} />);
      const overlay = container.firstElementChild as HTMLElement;
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('モーダル内コンテンツのクリックでは onClose が呼ばれない', () => {
      render(<HelpModal onClose={onClose} />);
      // テキスト要素をクリックしてもオーバーレイに伝播しない
      fireEvent.click(screen.getByText(/ヘルプ/));
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
