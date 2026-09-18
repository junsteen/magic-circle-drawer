'use client';

/**
 * レイド魔法陣: WebRTC 接続の管理フック
 *
 * 最大4人のフルメッシュ（6接続）を張り、DataChannel を2本使う。
 *   coords  … 座標ストリーム（unreliable。取りこぼしても演出が僅かに乱れるだけ）
 *   control … 制御とハートビート（reliable）
 *
 * 座標ストリームはあくまで「相手の筆が見える」ための演出用で、採点には使わない。
 * そのためパケットロスやジッタが結果に影響しない設計になっている。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RAID_CONNECT_TIMEOUT_MS,
  RAID_HEARTBEAT_MS,
  RAID_LEAVE_MS,
  RAID_MEMBER_COLORS,
  RAID_STUN_SERVERS,
  RAID_UNSTABLE_MS,
} from '@/lib/raidConstants';
import { getOrCreateDeviceId } from '@/lib/raidApi';
import {
  parseRaidMessage,
  serializeRaidMessage,
  type RaidMessage,
  type RaidPoint,
} from '@/lib/raidProtocol';
import { createD1RaidTransport, type RaidTransport } from '@/lib/raidTransport';
import type {
  RaidMember,
  RaidMemberStatus,
  RaidPeer,
  RaidRoom,
  RaidSignal,
} from '@/lib/raidTypes';

/** ルーム全体の状態 */
export type RaidConnectionStatus =
  | 'idle'
  | 'creating'
  | 'joining'
  | 'waiting'
  | 'connected'
  | 'timeout'
  | 'failed';

/** 1ピアぶんの接続状態 */
interface PeerEntry {
  member: RaidMember;
  pc: RTCPeerConnection;
  coords: RTCDataChannel | null;
  control: RTCDataChannel | null;
  status: RaidMemberStatus;
  lastSeenAt: number;
  rttMs: number | null;
  /** setRemoteDescription 前に届いた ICE candidate の待避先 */
  pendingCandidates: RTCIceCandidateInit[];
  hasRemoteDescription: boolean;
}

export interface UseRaidConnectionOptions {
  /** 他の参加者の筆が動いた */
  onRemoteStroke?: (peerId: string, strokeId: number, points: RaidPoint[]) => void;
  /** 他の参加者がひと筆描き終えた */
  onRemoteStrokeEnd?: (peerId: string, strokeId: number) => void;
  /** 参加者が離脱した */
  onPeerLeft?: (peerId: string) => void;
}

export interface UseRaidConnectionReturn {
  status: RaidConnectionStatus;
  room: RaidRoom | null;
  /** 自分を含む参加者一覧（参加順） */
  peers: RaidPeer[];
  selfId: string;
  /** 参加に失敗した理由（日本語） */
  error: string | null;
  createRoom: (name: string) => Promise<void>;
  joinRoom: (code: string, name: string) => Promise<void>;
  leave: () => void;
  sendStroke: (strokeId: number, points: RaidPoint[]) => void;
  sendStrokeEnd: (strokeId: number) => void;
}

export function useRaidConnection(options: UseRaidConnectionOptions = {}): UseRaidConnectionReturn {
  const [status, setStatus] = useState<RaidConnectionStatus>('idle');
  const [room, setRoom] = useState<RaidRoom | null>(null);
  const [peers, setPeers] = useState<RaidPeer[]>([]);
  const [error, setError] = useState<string | null>(null);
  // デバイスIDは一度決まれば変わらない。サーバ側描画では空文字になる
  const [selfId] = useState(() => getOrCreateDeviceId());

  const transportRef = useRef<RaidTransport | null>(null);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const selfIdRef = useRef(selfId);
  const selfNameRef = useRef('');
  const roomRef = useRef<RaidRoom | null>(null);
  const joinOrderRef = useRef<string[]>([]);
  const pingSeqRef = useRef(0);
  /** ピアごとにシグナル処理を直列化するためのチェーン */
  const signalChainRef = useRef<Map<string, Promise<void>>>(new Map());

  // ハンドラは毎レンダーで作り直されるため、ref 経由で最新を参照する
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  /** peersRef の内容を React の状態へ反映する（自分自身も一覧に含める） */
  const syncPeers = useCallback(() => {
    const order = joinOrderRef.current;
    const colorOf = (deviceId: string) => {
      const index = order.indexOf(deviceId);
      return RAID_MEMBER_COLORS[(index < 0 ? 0 : index) % RAID_MEMBER_COLORS.length];
    };
    const roleOf = (deviceId: string) =>
      roomRef.current?.hostId === deviceId ? ('host' as const) : ('guest' as const);

    const list: RaidPeer[] = [
      {
        deviceId: selfIdRef.current,
        name: selfNameRef.current,
        joinedAt: 0,
        role: roleOf(selfIdRef.current),
        status: 'connected',
        rttMs: null,
        color: colorOf(selfIdRef.current),
        isSelf: true,
      },
    ];

    for (const entry of peersRef.current.values()) {
      list.push({
        ...entry.member,
        role: roleOf(entry.member.deviceId),
        status: entry.status,
        rttMs: entry.rttMs,
        color: colorOf(entry.member.deviceId),
        isSelf: false,
      });
    }

    list.sort((a, b) => order.indexOf(a.deviceId) - order.indexOf(b.deviceId));
    setPeers(list);

    if (list.some((p) => !p.isSelf && p.status === 'connected')) setStatus('connected');
  }, []);

  const handleMessage = useCallback((peerId: string, raw: string) => {
    const entry = peersRef.current.get(peerId);
    if (!entry) return;

    const message = parseRaidMessage(raw);
    if (!message) return;

    entry.lastSeenAt = Date.now();
    if (entry.status === 'unstable') {
      entry.status = 'connected';
      syncPeers();
    }

    switch (message.kind) {
      case 'stroke':
        optionsRef.current.onRemoteStroke?.(peerId, message.strokeId, message.points);
        break;
      case 'strokeEnd':
        optionsRef.current.onRemoteStrokeEnd?.(peerId, message.strokeId);
        break;
      case 'ping': {
        const reply: RaidMessage = {
          kind: 'pong',
          pingId: message.pingId,
          sentAt: message.sentAt,
          repliedAt: Date.now(),
        };
        if (entry.control?.readyState === 'open') {
          entry.control.send(serializeRaidMessage(reply));
        }
        break;
      }
      case 'pong':
        entry.rttMs = Date.now() - message.sentAt;
        syncPeers();
        break;
      case 'bye':
        entry.status = 'left';
        optionsRef.current.onPeerLeft?.(peerId);
        syncPeers();
        break;
      case 'hello':
        break;
    }
  }, [syncPeers]);

  const attachChannel = useCallback((peerId: string, channel: RTCDataChannel) => {
    const entry = peersRef.current.get(peerId);
    if (!entry) return;

    if (channel.label === 'coords') entry.coords = channel;
    else entry.control = channel;

    channel.onopen = () => {
      const current = peersRef.current.get(peerId);
      if (!current) return;
      current.status = 'connected';
      current.lastSeenAt = Date.now();
      syncPeers();
    };
    channel.onclose = () => {
      const current = peersRef.current.get(peerId);
      if (!current || current.status === 'left') return;
      current.status = 'unstable';
      syncPeers();
    };
    channel.onmessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') handleMessage(peerId, event.data);
    };
  }, [handleMessage, syncPeers]);

  /**
   * ピアとの RTCPeerConnection を用意する。
   * 双方が同時に offer を出す衝突（glare）を避けるため、
   * デバイスIDの辞書順で小さい側だけが offer を出す。
   */
  const ensurePeer = useCallback((member: RaidMember): void => {
    if (peersRef.current.has(member.deviceId)) return;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: RAID_STUN_SERVERS }] });

    peersRef.current.set(member.deviceId, {
      member,
      pc,
      coords: null,
      control: null,
      status: 'connecting',
      lastSeenAt: Date.now(),
      rttMs: null,
      pendingCandidates: [],
      hasRemoteDescription: false,
    });

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      transportRef.current?.send(member.deviceId, 'ice', JSON.stringify(event.candidate.toJSON()));
    };

    pc.onconnectionstatechange = () => {
      const current = peersRef.current.get(member.deviceId);
      if (!current) return;
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        current.status = 'left';
        syncPeers();
      } else if (pc.connectionState === 'disconnected') {
        current.status = 'unstable';
        syncPeers();
      }
    };

    pc.ondatachannel = (event) => attachChannel(member.deviceId, event.channel);

    if (selfIdRef.current < member.deviceId) {
      attachChannel(
        member.deviceId,
        pc.createDataChannel('coords', { ordered: false, maxRetransmits: 0 })
      );
      attachChannel(member.deviceId, pc.createDataChannel('control'));

      void (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          transportRef.current?.send(member.deviceId, 'offer', JSON.stringify(offer));
        } catch {
          const current = peersRef.current.get(member.deviceId);
          if (current) {
            current.status = 'left';
            syncPeers();
          }
        }
      })();
    }

    syncPeers();
  }, [attachChannel, syncPeers]);

  const processSignal = useCallback(async (signal: RaidSignal): Promise<void> => {
    const entry = peersRef.current.get(signal.fromId);
    if (!entry) return;

    const flushCandidates = async () => {
      entry.hasRemoteDescription = true;
      const pending = entry.pendingCandidates;
      entry.pendingCandidates = [];
      for (const candidate of pending) {
        await entry.pc.addIceCandidate(candidate);
      }
    };

    try {
      if (signal.kind === 'offer') {
        await entry.pc.setRemoteDescription(JSON.parse(signal.payload) as RTCSessionDescriptionInit);
        await flushCandidates();
        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        transportRef.current?.send(signal.fromId, 'answer', JSON.stringify(answer));
      } else if (signal.kind === 'answer') {
        await entry.pc.setRemoteDescription(JSON.parse(signal.payload) as RTCSessionDescriptionInit);
        await flushCandidates();
      } else {
        const candidate = JSON.parse(signal.payload) as RTCIceCandidateInit;
        // remoteDescription が入る前に届いた candidate は溜めておく
        if (entry.hasRemoteDescription) await entry.pc.addIceCandidate(candidate);
        else entry.pendingCandidates.push(candidate);
      }
    } catch {
      // 相手が接続を張り直している最中などに起きうる。後続のシグナルで回復する
    }
  }, []);

  /**
   * シグナルはピアごとに直列で処理する。
   * offer の処理中に ICE candidate が割り込むと、待避と反映が入れ違って
   * candidate を取りこぼすことがあるため。
   */
  const handleSignal = useCallback((signal: RaidSignal) => {
    const previous = signalChainRef.current.get(signal.fromId) ?? Promise.resolve();
    const next = previous.then(() => processSignal(signal)).catch(() => { /* 直列化を止めない */ });
    signalChainRef.current.set(signal.fromId, next);
  }, [processSignal]);

  const handleMembers = useCallback((members: RaidMember[]) => {
    for (const member of members) {
      if (!joinOrderRef.current.includes(member.deviceId)) {
        joinOrderRef.current.push(member.deviceId);
      }
      if (member.deviceId !== selfIdRef.current) ensurePeer(member);
    }
    syncPeers();
  }, [ensurePeer, syncPeers]);

  /** control チャネル経由で全ピアに送る */
  const broadcastControl = useCallback((message: RaidMessage) => {
    const payload = serializeRaidMessage(message);
    for (const entry of peersRef.current.values()) {
      if (entry.control?.readyState === 'open') entry.control.send(payload);
    }
  }, []);

  const leave = useCallback(() => {
    broadcastControl({ kind: 'bye' });
    for (const entry of peersRef.current.values()) {
      entry.coords?.close();
      entry.control?.close();
      entry.pc.close();
    }
    peersRef.current.clear();
    signalChainRef.current.clear();
    joinOrderRef.current = [];
    transportRef.current?.stop();
    transportRef.current = null;
    roomRef.current = null;
    setRoom(null);
    setPeers([]);
    setStatus('idle');
  }, [broadcastControl]);

  const startTransport = useCallback((
    transport: RaidTransport,
    joined: RaidRoom,
    members: RaidMember[]
  ) => {
    transportRef.current = transport;
    roomRef.current = joined;
    setRoom(joined);
    setStatus('waiting');

    transport.start(joined.code, {
      onSignal: handleSignal,
      onMembers: handleMembers,
      onError: () => { /* 次の周期で自動的に再試行される */ },
    });

    handleMembers(members);
  }, [handleMembers, handleSignal]);

  const createRoom = useCallback(async (name: string) => {
    setError(null);
    setStatus('creating');
    selfNameRef.current = name;

    const transport = createD1RaidTransport();
    const created = await transport.createRoom(name);
    if (!created) {
      transport.stop();
      setStatus('failed');
      setError('ルームを作成できませんでした。通信環境を確認してください。');
      return;
    }
    startTransport(transport, created, [
      { deviceId: selfIdRef.current, name, joinedAt: created.createdAt },
    ]);
  }, [startTransport]);

  const joinRoom = useCallback(async (code: string, name: string) => {
    setError(null);
    setStatus('joining');
    selfNameRef.current = name;

    const transport = createD1RaidTransport();
    const result = await transport.joinRoom(code, name);
    if (!result.ok) {
      transport.stop();
      setStatus('failed');
      setError(
        result.reason === 'notFound'
          ? 'そのルームは見つかりませんでした。期限切れかもしれません。'
          : result.reason === 'full'
            ? 'ルームは満員です。'
            : 'ルームに参加できませんでした。通信環境を確認してください。'
      );
      return;
    }
    startTransport(transport, result.room, result.members);
  }, [startTransport]);

  const sendStroke = useCallback((strokeId: number, points: RaidPoint[]) => {
    if (points.length === 0) return;
    const payload = serializeRaidMessage({ kind: 'stroke', strokeId, points });
    for (const entry of peersRef.current.values()) {
      if (entry.coords?.readyState === 'open') entry.coords.send(payload);
    }
  }, []);

  /** ストロークの終端は取りこぼすと描線が繋がったままになるので reliable な control で送る */
  const sendStrokeEnd = useCallback((strokeId: number) => {
    broadcastControl({ kind: 'strokeEnd', strokeId });
  }, [broadcastControl]);

  // ハートビートと死活監視
  useEffect(() => {
    if (status === 'idle' || status === 'failed') return;

    const timer = setInterval(() => {
      const now = Date.now();
      let changed = false;

      for (const entry of peersRef.current.values()) {
        if (entry.control?.readyState === 'open') {
          pingSeqRef.current += 1;
          entry.control.send(
            serializeRaidMessage({ kind: 'ping', pingId: pingSeqRef.current, sentAt: now })
          );
        }

        if (entry.status === 'connected' && now - entry.lastSeenAt > RAID_UNSTABLE_MS) {
          entry.status = 'unstable';
          changed = true;
        }
        if (entry.status !== 'left' && now - entry.lastSeenAt > RAID_LEAVE_MS) {
          entry.status = 'left';
          optionsRef.current.onPeerLeft?.(entry.member.deviceId);
          changed = true;
        }
      }

      if (changed) syncPeers();
    }, RAID_HEARTBEAT_MS);

    return () => clearInterval(timer);
  }, [status, syncPeers]);

  // 一定時間まったく繋がらなければソロプレイを提案する
  useEffect(() => {
    if (status !== 'waiting') return;

    const timer = setTimeout(() => {
      const entries = [...peersRef.current.values()];
      const connected = entries.some((p) => p.status === 'connected');
      if (!connected && entries.length > 0) setStatus('timeout');
    }, RAID_CONNECT_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [status]);

  // iOS Safari はバックグラウンドで接続が切れるため、離脱を明示的に伝える
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') broadcastControl({ kind: 'bye' });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [broadcastControl]);

  // アンマウント時に確実に後片付けする
  const leaveRef = useRef(leave);
  useEffect(() => {
    leaveRef.current = leave;
  });
  useEffect(() => () => leaveRef.current(), []);

  return {
    status,
    room,
    peers,
    selfId,
    error,
    createRoom,
    joinRoom,
    leave,
    sendStroke,
    sendStrokeEnd,
  };
}
