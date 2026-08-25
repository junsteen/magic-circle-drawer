'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  type Difficulty,
  DIFFICULTY_LABELS,
  DIFFICULTY_TIME,
  DIFFICULTY_MULTIPLIER,
  DIFFICULTY_TOLERANCE,
} from '@/lib/patterns';
import {
  loadSettings,
  saveSettings,
  resetTutorial,
  isTutorialCompleted,
} from '@/lib/userSettings';

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: '#76ff03',
  normal: '#00e5ff',
  hard: '#ff9100',
  expert: '#ff4081',
};

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert'];

export default function SettingsPage() {
  const router = useRouter();
  const [defaultDifficulty, setDefaultDifficulty] = useState<Difficulty>('normal');
  const [tutorialDone, setTutorialDone] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    const s = loadSettings();
    setDefaultDifficulty(s.defaultDifficulty);
    setTutorialDone(isTutorialCompleted());
  }, []);

  const handleDifficultyChange = (d: Difficulty) => {
    setDefaultDifficulty(d);
    saveSettings({ defaultDifficulty: d });
    setSavedMsg('保存しました');
    setTimeout(() => setSavedMsg(''), 1500);
  };

  const handleResetTutorial = () => {
    resetTutorial();
    setTutorialDone(false);
    setSavedMsg('チュートリアルをリセットしました');
    setTimeout(() => setSavedMsg(''), 2000);
  };

  return (
    <div className="min-h-screen p-4" style={{ background: '#0d0d1a', color: '#e0e0ff' }}>
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-70"
          style={{ border: '1px solid rgba(0,229,255,0.4)', color: '#00e5ff' }}
          aria-label="戻る"
        >
          ←
        </button>
        <h1 className="text-xl font-bold" style={{ color: '#00e5ff' }}>
          ⚙️ 設定
        </h1>
        {savedMsg && (
          <span className="ml-auto text-xs font-bold" style={{ color: '#76ff03' }}>
            ✅ {savedMsg}
          </span>
        )}
      </div>

      <div className="mx-auto max-w-md flex flex-col gap-5">

        {/* デフォルト難易度 */}
        <section
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,229,255,0.15)' }}
        >
          <h2 className="mb-3 text-sm font-bold text-gray-400">🎯 デフォルト難易度</h2>
          <p className="mb-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            ゲーム起動時に選択される難易度です。
          </p>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => handleDifficultyChange(d)}
                className="rounded-lg px-3 py-2 text-sm font-bold transition-all"
                style={{
                  border: `2px solid ${DIFFICULTY_COLORS[d]}`,
                  color: defaultDifficulty === d ? DIFFICULTY_COLORS[d] : '#666',
                  background: defaultDifficulty === d ? `${DIFFICULTY_COLORS[d]}18` : 'transparent',
                  transform: defaultDifficulty === d ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
        </section>

        {/* 難易度別設定値一覧 */}
        <section
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,229,255,0.15)' }}
        >
          <h2 className="mb-3 text-sm font-bold text-gray-400">📊 難易度別設定値</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <th className="py-1 text-left font-normal">難易度</th>
                  <th className="py-1 text-right font-normal">制限時間</th>
                  <th className="py-1 text-right font-normal">スコア倍率</th>
                  <th className="py-1 text-right font-normal">許容誤差</th>
                </tr>
              </thead>
              <tbody>
                {DIFFICULTIES.map((d) => (
                  <tr
                    key={d}
                    className="border-t"
                    style={{ borderColor: 'rgba(255,255,255,0.07)' }}
                  >
                    <td className="py-2 font-bold" style={{ color: DIFFICULTY_COLORS[d] }}>
                      {DIFFICULTY_LABELS[d]}
                    </td>
                    <td className="py-2 text-right" style={{ color: '#e0e0ff' }}>
                      {DIFFICULTY_TIME[d]}秒
                    </td>
                    <td className="py-2 text-right" style={{ color: '#e0e0ff' }}>
                      ×{DIFFICULTY_MULTIPLIER[d]}
                    </td>
                    <td className="py-2 text-right" style={{ color: '#e0e0ff' }}>
                      ×{DIFFICULTY_TOLERANCE[d]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              ※ 許容誤差は大きいほど描画精度の要求が低くなります
            </p>
          </div>
        </section>

        {/* チュートリアル */}
        <section
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,229,255,0.15)' }}
        >
          <h2 className="mb-3 text-sm font-bold text-gray-400">🎓 チュートリアル</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: tutorialDone ? '#76ff03' : 'rgba(255,255,255,0.5)' }}>
                {tutorialDone ? '✅ 完了済み' : '⬜ 未完了'}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                リセットすると次回起動時に再表示されます
              </p>
            </div>
            <button
              onClick={handleResetTutorial}
              disabled={!tutorialDone}
              className="rounded-lg px-4 py-2 text-xs font-bold transition-opacity disabled:opacity-30"
              style={{
                border: '1px solid rgba(0,229,255,0.4)',
                color: '#00e5ff',
                background: 'rgba(0,229,255,0.08)',
              }}
            >
              リセット
            </button>
          </div>
        </section>

        {/* バージョン情報 */}
        <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Arcane Tracer — {process.env.NEXT_PUBLIC_APP_VERSION ?? ''}
        </p>
      </div>
    </div>
  );
}
