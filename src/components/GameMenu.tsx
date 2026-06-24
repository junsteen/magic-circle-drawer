'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Difficulty } from '@/lib/patterns';
import { DIFFICULTY_MULTIPLIER } from '@/lib/patterns';

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: '#76ff03', normal: '#00e5ff', hard: '#ff9100', expert: '#ff4081',
};

export interface VoiceState {
  isListening: boolean;
  isMicAccessible: boolean | null;
}

export interface UnlockState {
  history?: boolean;
  multiMode?: boolean;
  grimoire?: boolean;
  comboMode?: boolean;
}

interface GameMenuProps {
  currentMode: 'single' | 'multi' | 'combo';
  difficulty: Difficulty;
  unlocks?: UnlockState;
  onSwitchMode: (mode: 'single' | 'multi' | 'combo', difficulty: Difficulty) => void;
  onChangeDifficulty: (d: Difficulty) => void;
  onShowHistory?: () => void;
  voiceState?: VoiceState | null;
  onVoiceToggle?: () => void;
  onShowHelp?: () => void;
}

export default function GameMenu({
  currentMode,
  difficulty,
  unlocks,
  onSwitchMode,
  onChangeDifficulty,
  onShowHistory,
  voiceState,
  onVoiceToggle,
  onShowHelp,
}: GameMenuProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const close = () => setShowMenu(false);

  return (
    <>
      <button
        onClick={() => setShowMenu(v => !v)}
        className="absolute right-4 top-4 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 text-xl font-bold"
        style={{ borderColor: 'rgba(0,229,255,0.5)', color: '#00e5ff', background: 'rgba(10,10,20,0.8)' }}
        aria-label="メニュー"
      >
        ☰
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div
            className="absolute right-4 top-14 z-50 flex min-w-[240px] flex-col gap-1 rounded-xl border p-2"
            style={{ background: 'rgba(13,13,26,0.97)', borderColor: 'rgba(0,229,255,0.3)' }}
          >
            {/* モード変更（アンロック済みまたは現在マルチ/コンボモードなら表示） */}
            {(unlocks?.multiMode || unlocks?.comboMode || currentMode !== 'single') && (
              <div className="px-3 py-2">
                <div className="mb-2 text-xs font-bold text-gray-500">🎮 モード変更</div>
                <div className="flex flex-wrap gap-1">
                  <ModeBtn
                    label="シングル"
                    isActive={currentMode === 'single'}
                    color="#00e5ff"
                    onClick={() => { onSwitchMode('single', difficulty); close(); }}
                  />
                  {unlocks?.multiMode && (
                    <ModeBtn
                      label="⚡ マルチ"
                      isActive={currentMode === 'multi'}
                      color="#7c4dff"
                      onClick={() => { onSwitchMode('multi', difficulty); close(); }}
                    />
                  )}
                  {unlocks?.comboMode && (
                    <ModeBtn
                      label="🔥 コンボ"
                      isActive={currentMode === 'combo'}
                      color="#ffd700"
                      onClick={() => { onSwitchMode('combo', difficulty); close(); }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* アカシックレコード */}
            {unlocks?.grimoire && (
              <MenuItem icon="📖" label="アカシックレコード" onClick={() => { router.push('/grimoire'); close(); }} />
            )}

            {/* 作成履歴 */}
            {unlocks?.history && onShowHistory && (
              <MenuItem icon="📜" label="作成履歴" onClick={() => { onShowHistory(); close(); }} />
            )}

            {/* レベル変更 */}
            <div className="px-3 py-2">
              <div className="mb-2 text-xs font-bold text-gray-500">🎯 レベル変更</div>
              <div className="flex flex-wrap gap-1">
                {(['easy', 'normal', 'hard', 'expert'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => { onChangeDifficulty(d); close(); }}
                    className={`rounded-md px-2 py-1 text-xs font-bold transition-all ${
                      difficulty === d ? 'scale-105' : 'opacity-50 hover:opacity-75'
                    }`}
                    style={{
                      borderColor: DIFFICULTY_COLORS[d],
                      borderWidth: 2,
                      borderStyle: 'solid',
                      color: difficulty === d ? DIFFICULTY_COLORS[d] : '#999',
                      background: difficulty === d ? `${DIFFICULTY_COLORS[d]}18` : 'transparent',
                    }}
                  >
                    {d.toUpperCase()}
                    <span className="ml-1 opacity-75">(×{DIFFICULTY_MULTIPLIER[d]})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 音声入力 */}
            {onVoiceToggle && (
              <button
                onClick={() => { onVoiceToggle(); close(); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-colors hover:bg-white/5"
                style={{
                  color: voiceState?.isListening ? '#76ff03'
                    : voiceState?.isMicAccessible === false ? '#ff4444'
                    : '#00e5ff',
                }}
              >
                {voiceState?.isListening ? '🎤' : voiceState?.isMicAccessible === false ? '🔇' : '🔊'}
                {' '}音声入力{voiceState?.isListening ? '（ON）' : '（OFF）'}
              </button>
            )}

            {/* アプリ情報 */}
            <MenuItem icon="ℹ️" label="アプリ情報" onClick={() => { router.push('/app-info'); close(); }} />

            {/* ヘルプ */}
            {onShowHelp && (
              <MenuItem icon="❓" label="ヘルプ" onClick={() => { onShowHelp(); close(); }} />
            )}
          </div>
        </>
      )}
    </>
  );
}

function ModeBtn({
  label, isActive, color, onClick,
}: {
  label: string; isActive: boolean; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isActive}
      className={`rounded-md px-2 py-1 text-xs font-bold transition-all ${isActive ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
      style={{
        borderColor: color,
        borderWidth: 2,
        borderStyle: 'solid',
        color: isActive ? color : '#999',
        background: isActive ? `${color}18` : 'transparent',
      }}
    >
      {label}
    </button>
  );
}

function MenuItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-colors hover:bg-white/5"
      style={{ color: '#00e5ff' }}
    >
      {icon} {label}
    </button>
  );
}
