'use client';

/** レイド魔法陣: 参加者と各自の接続状態を並べる */

import { RAID_MAX_MEMBERS, RAID_RTT_WARN_MS } from '@/lib/raidConstants';
import type { RaidMemberStatus, RaidPeer } from '@/lib/raidTypes';

const STATUS_LABEL: Record<RaidMemberStatus, string> = {
  connecting: '接続中',
  connected: '接続済み',
  unstable: '不安定',
  left: '離脱',
};

const STATUS_COLOR: Record<RaidMemberStatus, string> = {
  connecting: '#999999',
  connected: '#76ff03',
  unstable: '#ff9100',
  left: '#ff4081',
};

interface RaidMemberListProps {
  peers: RaidPeer[];
}

export default function RaidMemberList({ peers }: RaidMemberListProps) {
  return (
    <div className="w-full">
      <div className="mb-2 text-xs font-bold text-gray-500">
        参加者 {peers.length} / {RAID_MAX_MEMBERS}
      </div>
      <ul className="flex flex-col gap-1">
        {peers.map((peer) => (
          <li
            key={peer.deviceId}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
            style={{ background: `${peer.color}12`, border: `1px solid ${peer.color}40` }}
          >
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full"
              style={{ background: peer.color }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate font-bold" style={{ color: peer.color }}>
              {peer.name || '名もなき術士'}
              {peer.role === 'host' && <span className="ml-1 text-xs opacity-75">👑</span>}
              {peer.isSelf && <span className="ml-1 text-xs text-gray-400">（あなた）</span>}
            </span>

            {!peer.isSelf && (
              <>
                {peer.rttMs !== null && peer.status === 'connected' && (
                  <span
                    className="text-xs"
                    style={{ color: peer.rttMs > RAID_RTT_WARN_MS ? '#ff9100' : '#666' }}
                  >
                    {peer.rttMs}ms
                  </span>
                )}
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-xs font-bold"
                  style={{
                    color: STATUS_COLOR[peer.status],
                    background: `${STATUS_COLOR[peer.status]}18`,
                  }}
                >
                  {STATUS_LABEL[peer.status]}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
