'use client';

/** レイド魔法陣: 入室前のロビー（ルーム作成とコード入力） */

import { useState } from 'react';
import {
  RAID_CODE_CHARS,
  RAID_CODE_LENGTH,
  RAID_MAX_MEMBERS,
  RAID_THEME_COLOR,
  isValidRaidCode,
} from '@/lib/raidConstants';

const RAID_NAME_KEY = 'arcane_raid_name';
const DEFAULT_NAME = '名もなき術士';

function loadSavedName(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(RAID_NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveName(value: string): void {
  try {
    localStorage.setItem(RAID_NAME_KEY, value);
  } catch {
    // 保存できなくても参加そのものには支障がない
  }
}

/** 合言葉に使われない文字（I L O 0 1 など）は入力の時点で落とす */
function normalizeCode(input: string): string {
  return [...input.toUpperCase()].filter((ch) => RAID_CODE_CHARS.includes(ch)).join('');
}

interface RaidLobbyProps {
  /** 参加URLから受け取ったルームコード */
  initialCode?: string;
  busy: boolean;
  error: string | null;
  onCreate: (name: string) => void;
  onJoin: (code: string, name: string) => void;
}

export default function RaidLobby({ initialCode = '', busy, error, onCreate, onJoin }: RaidLobbyProps) {
  const [name, setName] = useState(loadSavedName);
  const [code, setCode] = useState(() => normalizeCode(initialCode));

  const trimmedName = name.trim() || DEFAULT_NAME;
  const canJoin = isValidRaidCode(code) && !busy;

  const handleCreate = () => {
    saveName(trimmedName);
    onCreate(trimmedName);
  };

  const handleJoin = () => {
    saveName(trimmedName);
    onJoin(code, trimmedName);
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold" style={{ color: RAID_THEME_COLOR }}>
          🛡 レイド魔法陣
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          最大{RAID_MAX_MEMBERS}人で集まり、互いの筆を重ねて陣を描きます。
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold text-gray-500">術士名</span>
        <input
          type="text"
          value={name}
          maxLength={20}
          placeholder={DEFAULT_NAME}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border-2 px-3 py-2 text-sm outline-none"
          style={{ background: 'rgba(10,10,20,0.8)', borderColor: 'rgba(0,229,255,0.3)', color: '#e0e0ff' }}
        />
      </label>

      <button
        onClick={handleCreate}
        disabled={busy}
        className="rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
        style={{
          borderColor: RAID_THEME_COLOR,
          color: RAID_THEME_COLOR,
          background: `${RAID_THEME_COLOR}18`,
        }}
      >
        ルームを作る
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-gray-700" />
        <span className="text-xs text-gray-600">または</span>
        <span className="h-px flex-1 bg-gray-700" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-500">合言葉（{RAID_CODE_LENGTH}文字）</span>
          <input
            type="text"
            value={code}
            maxLength={RAID_CODE_LENGTH}
            placeholder="ABC234"
            inputMode="text"
            autoCapitalize="characters"
            onChange={(e) => setCode(normalizeCode(e.target.value))}
            className="rounded-lg border-2 px-3 py-2 text-center text-lg font-bold tracking-[0.3em] outline-none"
            style={{ background: 'rgba(10,10,20,0.8)', borderColor: 'rgba(0,229,255,0.3)', color: '#e0e0ff' }}
          />
        </label>

        <button
          onClick={handleJoin}
          disabled={!canJoin}
          className="rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
          style={{ borderColor: '#00e5ff', color: '#00e5ff', background: 'rgba(0,229,255,0.1)' }}
        >
          仲間に加わる
        </button>
      </div>

      {error && (
        <p className="rounded-lg px-3 py-2 text-center text-sm" style={{ background: '#ff408118', color: '#ff4081' }}>
          {error}
        </p>
      )}

      {busy && <p className="text-center text-sm text-gray-500">接続しています…</p>}
    </div>
  );
}
