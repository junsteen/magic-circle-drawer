'use client';

/**
 * レイド魔法陣（Phase 1: 通信層）
 *
 * ルームに集まり、互いの筆がリアルタイムに見えるところまで。
 * ボス戦・スコア集計・合体判定は Phase 2 で載せる。
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import RaidCanvas, { type RaidCanvasHandle } from '@/components/raid/RaidCanvas';
import RaidLobby from '@/components/raid/RaidLobby';
import RaidMemberList from '@/components/raid/RaidMemberList';
import { useRaidConnection } from '@/hooks/useRaidConnection';
import { RAID_THEME_COLOR } from '@/lib/raidConstants';

function RaidContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') ?? '';

  const canvasRef = useRef<RaidCanvasHandle>(null);
  const [copied, setCopied] = useState(false);

  const {
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
  } = useRaidConnection({
    onRemoteStroke: (peerId, strokeId, points) =>
      canvasRef.current?.applyRemoteStroke(peerId, strokeId, points),
    onRemoteStrokeEnd: (peerId, strokeId) =>
      canvasRef.current?.applyRemoteStrokeEnd(peerId, strokeId),
    onPeerLeft: (peerId) => canvasRef.current?.removePeer(peerId),
  });

  // 入室したら URL に合言葉を載せ、そのまま共有できるようにする
  useEffect(() => {
    if (!room) return;
    router.replace(`/raid?code=${room.code}`);
  }, [room, router]);

  const inRoom = room !== null && status !== 'failed';
  // 入室後にしか描画されないため、静的書き出し時に window を参照することはない
  const shareUrl = room && typeof window !== 'undefined'
    ? `${window.location.origin}/raid?code=${room.code}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 安全でないコンテキストなどでクリップボードが使えない場合は何もしない
    }
  };

  if (!inRoom) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4" style={{ background: '#0d0d1a' }}>
        <RaidLobby
          initialCode={initialCode}
          busy={status === 'creating' || status === 'joining'}
          error={error}
          onCreate={createRoom}
          onJoin={joinRoom}
        />
        <button
          onClick={() => router.push('/')}
          className="mt-8 text-sm text-gray-500 underline hover:text-gray-300"
        >
          もどる
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 p-4" style={{ background: '#0d0d1a' }}>
      <div className="flex w-full max-w-md items-center justify-between">
        <div>
          <div className="text-xs font-bold text-gray-500">合言葉</div>
          <div className="text-2xl font-bold tracking-[0.3em]" style={{ color: RAID_THEME_COLOR }}>
            {room.code}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="rounded-md border-2 px-3 py-1 text-xs font-bold"
            style={{ borderColor: '#00e5ff', color: '#00e5ff' }}
          >
            {copied ? 'コピーしました' : 'リンクをコピー'}
          </button>
          <button
            onClick={() => { leave(); router.push('/'); }}
            className="rounded-md border-2 px-3 py-1 text-xs font-bold"
            style={{ borderColor: '#ff4081', color: '#ff4081' }}
          >
            退出
          </button>
        </div>
      </div>

      {peers.length < 2 && shareUrl && (
        <div className="flex w-full max-w-md flex-col items-center gap-2 rounded-xl border p-4"
          style={{ borderColor: 'rgba(0,229,255,0.3)', background: 'rgba(10,10,20,0.6)' }}
        >
          <p className="text-sm text-gray-400">この合言葉かQRを仲間に伝えてください</p>
          <div className="rounded bg-white p-2">
            <QRCodeSVG value={shareUrl} size={140} />
          </div>
        </div>
      )}

      {status === 'timeout' && (
        <p className="w-full max-w-md rounded-lg px-3 py-2 text-center text-sm"
          style={{ background: '#ff910018', color: '#ff9100' }}
        >
          仲間と直接つながれませんでした。回線の制限が原因かもしれません。
        </p>
      )}

      <div className="w-full max-w-md">
        <RaidCanvas
          ref={canvasRef}
          peers={peers}
          selfId={selfId}
          onStroke={sendStroke}
          onStrokeEnd={sendStrokeEnd}
        />
      </div>

      <div className="flex w-full max-w-md justify-end">
        <button
          onClick={() => canvasRef.current?.clear()}
          className="rounded-md border-2 px-3 py-1 text-xs font-bold"
          style={{ borderColor: '#666', color: '#999' }}
        >
          自分の画面を消す
        </button>
      </div>

      <div className="w-full max-w-md">
        <RaidMemberList peers={peers} />
      </div>
    </div>
  );
}

export default function RaidPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#0d0d1a' }}>
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2" style={{ borderColor: RAID_THEME_COLOR }} />
          <p className="mt-4 text-gray-400">魔法陣を展開中...</p>
        </div>
      </div>
    }>
      <RaidContent />
    </Suspense>
  );
}
