import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/shareUtils', () => ({
  compressForUrlOptimized: vi.fn(() => 'compressed'),
}));

import HistoryDetail from './HistoryDetail';
import type { MagicCircleHistory } from '@/lib/types';

// Canvas 2D context のモック
const mockCtx = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  setLineDash: vi.fn(),
  shadowBlur: 0,
  shadowColor: '',
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 0,
  lineCap: '',
  lineJoin: '',
};

// requestAnimationFrame をモック（アニメーションループを制御）
const rafCallbacks: FrameRequestCallback[] = [];
const mockRaf = vi.fn((cb: FrameRequestCallback) => {
  rafCallbacks.push(cb);
  return rafCallbacks.length;
});
const mockCancelRaf = vi.fn((id: number) => {
  rafCallbacks.splice(id - 1, 1);
});

// テスト用の最小履歴データを生成するファクトリ
function makeHistory(drawLogsLength: number, id = 'test-id'): MagicCircleHistory {
  const drawLogs = drawLogsLength > 0
    ? Array.from({ length: drawLogsLength }, (_, i) => [
        { x: 10 + i * 10, y: 10, t: i * 200, type: 'start' as const },
        { x: 20 + i * 10, y: 20, t: i * 200 + 100, type: 'move' as const },
        { x: 30 + i * 10, y: 30, t: i * 200 + 200, type: 'end' as const },
      ])
    : [];

  return {
    id,
    data: {
      seed: 1,
      pattern: {
        name: 'テストパターン',
        vertices: [
          { x: 175, y: 52 },
          { x: 280, y: 228 },
          { x: 70, y: 228 },
        ],
        edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 }],
        circles: [],
      },
      drawLogs,
      timestamp: Date.now(),
    },
    score: 80,
    rank: 'A',
    difficulty: 'ノーマル',
    difficultyMultiplier: 1,
    damageMultiplier: '150%',
    createdAt: Date.now(),
  };
}

function renderDetail(history: MagicCircleHistory | null) {
  return render(
    <HistoryDetail
      history={history}
      onClose={vi.fn()}
      onReEdit={vi.fn()}
    />
  );
}

// ─── disabled 条件テスト ──────────────────────────────────────────────────────

describe('HistoryDetail — リプレイボタン disabled 条件', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('history が null のとき何も描画されない（ボタンなし）', () => {
    renderDetail(null);
    expect(screen.queryByRole('button', { name: /再生|一時停止/ })).toBeNull();
  });

  it('drawLogs が空配列のとき再生ボタンが disabled', () => {
    renderDetail(makeHistory(0));
    expect(screen.getByRole('button', { name: /▶️ 再生/ })).toBeDisabled();
  });

  it('drawLogs がある場合（1ストローク）再生ボタンが enabled', () => {
    renderDetail(makeHistory(1));
    expect(screen.getByRole('button', { name: /▶️ 再生/ })).not.toBeDisabled();
  });

  it('drawLogs が複数ある場合も再生ボタンが enabled', () => {
    renderDetail(makeHistory(3));
    expect(screen.getByRole('button', { name: /▶️ 再生/ })).not.toBeDisabled();
  });
});

// ─── 再生ボタン動作テスト ─────────────────────────────────────────────────────

describe('HistoryDetail — 再生ボタン動作', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    rafCallbacks.length = 0;
    vi.stubGlobal('requestAnimationFrame', mockRaf);
    vi.stubGlobal('cancelAnimationFrame', mockCancelRaf);
    // Canvas getContext を有効な mock context を返すよう上書き
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (HTMLCanvasElement.prototype as any).getContext = () => mockCtx;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // setup.ts の元のモックに戻す
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (HTMLCanvasElement.prototype as any).getContext = () => null;
  });

  it('▶️ 再生ボタンを押すと ⏸️ 一時停止 に変わる', () => {
    renderDetail(makeHistory(2));
    const btn = screen.getByRole('button', { name: /▶️ 再生/ });

    act(() => { fireEvent.click(btn); });

    expect(screen.getByRole('button', { name: /⏸️ 一時停止/ })).toBeTruthy();
  });

  it('⏸️ 一時停止ボタンを押すと ▶️ 再生 に戻る', () => {
    renderDetail(makeHistory(2));
    const playBtn = screen.getByRole('button', { name: /▶️ 再生/ });

    act(() => { fireEvent.click(playBtn); });
    const pauseBtn = screen.getByRole('button', { name: /⏸️ 一時停止/ });
    act(() => { fireEvent.click(pauseBtn); });

    expect(screen.getByRole('button', { name: /▶️ 再生/ })).toBeTruthy();
  });

  it('history が変わると再生状態がリセットされる（Bug 1 修正確認）', () => {
    const { rerender } = renderDetail(makeHistory(2, 'history-a'));
    const btn = screen.getByRole('button', { name: /▶️ 再生/ });

    // 再生開始
    act(() => { fireEvent.click(btn); });
    expect(screen.getByRole('button', { name: /⏸️ 一時停止/ })).toBeTruthy();

    // 別の履歴に切り替え
    act(() => {
      rerender(
        <HistoryDetail
          history={makeHistory(2, 'history-b')}
          onClose={vi.fn()}
          onReEdit={vi.fn()}
        />
      );
    });

    // 再生状態がリセットされ ▶️ 再生 に戻っている
    expect(screen.getByRole('button', { name: /▶️ 再生/ })).toBeTruthy();
  });

  it('history が null になると再生状態がリセットされモーダルが消える', () => {
    const { rerender } = renderDetail(makeHistory(2));
    act(() => { fireEvent.click(screen.getByRole('button', { name: /▶️ 再生/ })); });

    act(() => {
      rerender(
        <HistoryDetail
          history={null}
          onClose={vi.fn()}
          onReEdit={vi.fn()}
        />
      );
    });

    expect(screen.queryByRole('button', { name: /再生|一時停止/ })).toBeNull();
  });
});
