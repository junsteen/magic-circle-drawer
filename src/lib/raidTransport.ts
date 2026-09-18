/**
 * レイド魔法陣: シグナリングの伝送層
 *
 * Phase 1 は D1 へのポーリングで実装する。Phase 3 で Durable Objects の
 * WebSocket 実装に差し替える予定のため、実体をこのインターフェースの裏に隠し、
 * アプリ層（useRaidConnection）が伝送方式を知らずに済むようにしている。
 */

import { RAID_SIGNAL_POLL_MS } from './raidConstants';
import { createRaidRoom, exchangeSignals, joinRaidRoom, type OutgoingSignal } from './raidApi';
import type { RaidMember, RaidRoom, RaidSignal, RaidSignalKind } from './raidTypes';

export interface RaidTransportHandlers {
  /** 自分宛（またはブロードキャスト）のシグナルを受け取った */
  onSignal: (signal: RaidSignal) => void;
  /** 参加者一覧が更新された */
  onMembers: (members: RaidMember[]) => void;
  /** 通信に失敗した（次の周期で自動的に再試行される） */
  onError: () => void;
}

export interface RaidTransport {
  createRoom(name: string): Promise<RaidRoom | null>;
  joinRoom(
    code: string,
    name: string
  ): Promise<{ ok: true; room: RaidRoom; members: RaidMember[] } | { ok: false; reason: 'notFound' | 'full' | 'error' }>;
  /** ルームのシグナル送受信を開始する */
  start(code: string, handlers: RaidTransportHandlers): void;
  /** 送信キューに積む。次の周期でまとめて送られる */
  send(to: string, kind: RaidSignalKind, payload: string): void;
  stop(): void;
}

/** 送信キューに積んでから実際に送るまでの待ち時間 */
const FLUSH_DELAY_MS = 50;

export function createD1RaidTransport(): RaidTransport {
  let roomCode = '';
  let cursor = 0;
  let queue: OutgoingSignal[] = [];
  let handlers: RaidTransportHandlers | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let inFlight = false;

  async function exchange(): Promise<void> {
    // 前回の往復が終わっていなければ見送る。積んだ分は次の周期で送られる
    if (!running || inFlight) return;
    inFlight = true;

    const sending = queue;
    queue = [];

    const result = await exchangeSignals({ code: roomCode, since: cursor, messages: sending });
    inFlight = false;
    if (!running) return;

    if (!result) {
      // 送れなかった分を戻す。この間に積まれた分より前に送りたいので先頭に戻す
      queue = [...sending, ...queue];
      handlers?.onError();
      return;
    }

    // 先にメンバーを反映する。シグナルの送り主のピアが未登録だと offer を取りこぼすため
    handlers?.onMembers(result.members);

    for (const signal of result.signals) {
      if (signal.id > cursor) cursor = signal.id;
      handlers?.onSignal(signal);
    }
  }

  function scheduleFlush(): void {
    if (flushTimer !== null || !running) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void exchange();
    }, FLUSH_DELAY_MS);
  }

  function loop(): void {
    if (!running) return;
    pollTimer = setTimeout(async () => {
      await exchange();
      loop();
    }, RAID_SIGNAL_POLL_MS);
  }

  return {
    createRoom: createRaidRoom,
    joinRoom: joinRaidRoom,

    start(code, nextHandlers) {
      roomCode = code;
      handlers = nextHandlers;
      cursor = 0;
      queue = [];
      running = true;
      void exchange();
      loop();
    },

    send(to, kind, payload) {
      queue.push({ to, kind, payload });
      scheduleFlush();
    },

    stop() {
      running = false;
      handlers = null;
      queue = [];
      if (pollTimer !== null) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
    },
  };
}
