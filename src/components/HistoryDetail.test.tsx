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

describe('HistoryDetail — 表示内容', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('history のスコアが表示される', () => {
    renderDetail(makeHistory(1));
    expect(screen.getByText('80点')).toBeInTheDocument();
  });

  it('history のランクが表示される', () => {
    renderDetail(makeHistory(1));
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('history のパターン名が表示される', () => {
    renderDetail(makeHistory(1));
    expect(screen.getByText('テストパターン')).toBeInTheDocument();
  });

  it('難易度が表示される', () => {
    renderDetail(makeHistory(1));
    expect(screen.getByText(/ノーマル/)).toBeInTheDocument();
  });

  it('作成日時ラベルが表示される', () => {
    renderDetail(makeHistory(1));
    expect(screen.getByText('作成日時')).toBeInTheDocument();
  });
});

describe('HistoryDetail — ボタン・インタラクション', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('閉じるボタン（✕）が存在する', () => {
    renderDetail(makeHistory(1));
    expect(screen.getByRole('button', { name: '✕' })).toBeInTheDocument();
  });

  it('閉じるボタンをクリックすると onClose が呼ばれる', () => {
    const onClose = vi.fn();
    render(
      <HistoryDetail
        history={makeHistory(1)}
        onClose={onClose}
        onReEdit={vi.fn()}
      />
    );
    screen.getByRole('button', { name: '✕' }).click();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('再編集ボタンが存在する', () => {
    renderDetail(makeHistory(1));
    expect(screen.getByRole('button', { name: /再編集/ })).toBeInTheDocument();
  });

  it('再編集ボタンをクリックすると onReEdit が呼ばれる', () => {
    const onReEdit = vi.fn();
    render(
      <HistoryDetail
        history={makeHistory(1)}
        onClose={vi.fn()}
        onReEdit={onReEdit}
      />
    );
    screen.getByRole('button', { name: /再編集/ }).click();
    expect(onReEdit).toHaveBeenCalledOnce();
  });

  it('共有ボタンが存在する', () => {
    renderDetail(makeHistory(1));
    expect(screen.getByRole('button', { name: /共有/ })).toBeInTheDocument();
  });
});
