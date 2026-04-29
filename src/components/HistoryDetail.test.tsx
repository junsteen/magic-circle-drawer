import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/shareUtils', () => ({
  compressForUrlOptimized: vi.fn(() => 'compressed'),
}));

import HistoryDetail from './HistoryDetail';
import type { MagicCircleHistory } from '@/lib/types';

// テスト用の最小履歴データを生成するファクトリ
function makeHistory(drawLogsLength: number): MagicCircleHistory {
  const drawLogs = drawLogsLength > 0
    ? Array.from({ length: drawLogsLength }, () => [
        { x: 10, y: 10, t: 0, type: 'start' as const },
        { x: 20, y: 20, t: 100, type: 'end' as const },
      ])
    : [];

  return {
    id: 'test-id',
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
    const btn = screen.getByRole('button', { name: /▶️ 再生/ });
    expect(btn).toBeDisabled();
  });

  it('drawLogs がある場合（1ストローク）再生ボタンが enabled', () => {
    renderDetail(makeHistory(1));
    const btn = screen.getByRole('button', { name: /▶️ 再生/ });
    expect(btn).not.toBeDisabled();
  });

  it('drawLogs が複数ある場合も再生ボタンが enabled', () => {
    renderDetail(makeHistory(3));
    const btn = screen.getByRole('button', { name: /▶️ 再生/ });
    expect(btn).not.toBeDisabled();
  });
});
