/**
 * レイド魔法陣: シグナリングAPI のクライアントラッパ
 *
 * 既存の akashicApi.ts と同じ規約に従い、失敗時は例外を投げず null を返す。
 */

import { getOrCreateDeviceId } from '@/lib/akashicApi';
import type { RaidMember, RaidRoom, RaidSignal, RaidSignalKind } from '@/lib/raidTypes';

export { getOrCreateDeviceId };

/** 送信するシグナリングメッセージ */
export interface OutgoingSignal {
  to: string;
  kind: RaidSignalKind;
  payload: string;
}

interface RoomResponse {
  code: string;
  hostId: string;
  createdAt: number;
  expiresAt: number;
}

interface JoinResponse extends RoomResponse {
  members: RaidMember[];
}

interface SignalResponse {
  signals: RaidSignal[];
  members: RaidMember[];
}

/** ルームを新規作成してホストになる */
export async function createRaidRoom(name: string): Promise<RaidRoom | null> {
  try {
    const res = await fetch('/api/raid/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, deviceId: getOrCreateDeviceId() }),
    });
    if (!res.ok) return null;
    return (await res.json()) as RoomResponse;
  } catch {
    return null;
  }
}

/**
 * 既存のルームに参加する。
 * 満員（409）とルーム不在（404）を呼び出し側が区別できるよう、理由も返す。
 */
export async function joinRaidRoom(
  code: string,
  name: string
): Promise<{ ok: true; room: RaidRoom; members: RaidMember[] } | { ok: false; reason: 'notFound' | 'full' | 'error' }> {
  try {
    const res = await fetch('/api/raid/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, name, deviceId: getOrCreateDeviceId() }),
    });
    if (res.status === 404) return { ok: false, reason: 'notFound' };
    if (res.status === 409) return { ok: false, reason: 'full' };
    if (!res.ok) return { ok: false, reason: 'error' };

    const json = (await res.json()) as JoinResponse;
    return {
      ok: true,
      room: {
        code: json.code,
        hostId: json.hostId,
        createdAt: json.createdAt,
        expiresAt: json.expiresAt,
      },
      members: json.members,
    };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** シグナリングメッセージの投函と受信をまとめて行う */
export async function exchangeSignals(params: {
  code: string;
  since: number;
  messages: OutgoingSignal[];
}): Promise<SignalResponse | null> {
  try {
    const res = await fetch('/api/raid/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: params.code,
        deviceId: getOrCreateDeviceId(),
        since: params.since,
        messages: params.messages,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as SignalResponse;
  } catch {
    return null;
  }
}
