import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import RaidLobby from './RaidLobby';

describe('RaidLobby', () => {
  let onCreate: ReturnType<typeof vi.fn>;
  let onJoin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onCreate = vi.fn();
    onJoin = vi.fn();
    localStorage.clear();
  });

  function renderLobby(props: Partial<React.ComponentProps<typeof RaidLobby>> = {}) {
    return render(
      <RaidLobby busy={false} error={null} onCreate={onCreate} onJoin={onJoin} {...props} />
    );
  }

  const nameInput = () => screen.getByPlaceholderText('名もなき術士') as HTMLInputElement;
  const codeInput = () => screen.getByPlaceholderText('ABC234') as HTMLInputElement;
  const joinButton = () => screen.getByRole('button', { name: '仲間に加わる' });
  const createButton = () => screen.getByRole('button', { name: 'ルームを作る' });

  // ─── 表示内容 ───────────────────────────────────────────────────────────────
  describe('表示内容', () => {
    it('術士名と合言葉の入力欄が表示される', () => {
      renderLobby();
      expect(nameInput()).toBeTruthy();
      expect(codeInput()).toBeTruthy();
    });

    it('エラーが渡されると表示される', () => {
      renderLobby({ error: 'ルームは満員です。' });
      expect(screen.getByText('ルームは満員です。')).toBeTruthy();
    });

    it('参加URLの合言葉が入力欄に反映される', () => {
      renderLobby({ initialCode: 'abc234' });
      expect(codeInput().value).toBe('ABC234');
    });
  });

  // ─── 合言葉の入力 ───────────────────────────────────────────────────────────
  describe('合言葉の入力', () => {
    it('小文字は大文字に変換される', () => {
      renderLobby();
      fireEvent.change(codeInput(), { target: { value: 'abc234' } });
      expect(codeInput().value).toBe('ABC234');
    });

    it('合言葉に使わない文字は入力されない', () => {
      renderLobby();
      // I L O 0 1 は紛らわしいため文字集合から除外されている
      fireEvent.change(codeInput(), { target: { value: 'AI0L1O B-' } });
      expect(codeInput().value).toBe('AB');
    });

    it('6文字そろうまで参加ボタンは押せない', () => {
      renderLobby();
      expect(joinButton()).toHaveProperty('disabled', true);

      fireEvent.change(codeInput(), { target: { value: 'ABC23' } });
      expect(joinButton()).toHaveProperty('disabled', true);

      fireEvent.change(codeInput(), { target: { value: 'ABC234' } });
      expect(joinButton()).toHaveProperty('disabled', false);
    });

    it('通信中は参加ボタンが押せない', () => {
      renderLobby({ busy: true, initialCode: 'ABC234' });
      expect(joinButton()).toHaveProperty('disabled', true);
    });
  });

  // ─── 送信 ───────────────────────────────────────────────────────────────────
  describe('送信', () => {
    it('ルーム作成で入力した名前が渡される', () => {
      renderLobby();
      fireEvent.change(nameInput(), { target: { value: '術士A' } });
      fireEvent.click(createButton());
      expect(onCreate).toHaveBeenCalledWith('術士A');
    });

    it('名前が空なら既定の名前が使われる', () => {
      renderLobby();
      fireEvent.click(createButton());
      expect(onCreate).toHaveBeenCalledWith('名もなき術士');
    });

    it('参加時に合言葉と名前が渡される', () => {
      renderLobby({ initialCode: 'ABC234' });
      fireEvent.change(nameInput(), { target: { value: '術士B' } });
      fireEvent.click(joinButton());
      expect(onJoin).toHaveBeenCalledWith('ABC234', '術士B');
    });
  });

  // ─── 名前の記憶 ─────────────────────────────────────────────────────────────
  describe('名前の記憶', () => {
    it('送信した名前が保存され、次回の表示で復元される', () => {
      const first = renderLobby();
      fireEvent.change(nameInput(), { target: { value: '記憶される術士' } });
      fireEvent.click(createButton());
      first.unmount();

      renderLobby();
      expect(nameInput().value).toBe('記憶される術士');
    });
  });
});
