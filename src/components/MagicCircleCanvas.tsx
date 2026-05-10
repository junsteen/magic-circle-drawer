'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ScoringResult } from '@/lib/scoring';
import type { Difficulty } from '@/lib/patterns';
import { DIFFICULTY_MULTIPLIER } from '@/lib/patterns';
import { useMagicCircle } from '@/hooks/useMagicCircle';
import type { MagicCircleData, MagicCircleHistory } from '@/lib/types';
import HelpModal from './HelpModal';
import HistoryPanel from './HistoryPanel';
import HistoryDetail from './HistoryDetail';
import TutorialOverlay from './TutorialOverlay';

/**
 * 魔法陣描画キャンバスコンポーネント
 * マジックサークルの描画、スコア計算、UI制御を統合的に管理
 */
export default function MagicCircleCanvas({
  /** スコア計算完了時のコールバック */
  onScore,
  /** リセット時のコールバック */
  onReset,
  /** 初期難易度設定 */
  initialDifficulty = 'normal',
  /** 外部からデータロード機能を提供するための参照コールバック（オプション） */
  onLoadDataRef,
  /** 完了状況更新時のコールバック（オプション） */
  onCompletionUpdate,
  initialPatternName,
}: {
  /** スコア計算完了時のコールバック */
  onScore: (result: ScoringResult) => void;
  /** リセット時のコールバック */
  onReset: () => void;
  /** 初期難易度設定（省略時は 'normal'） */
  initialDifficulty?: Difficulty;
  /** 外部からデータロード機能を提供するための参照コールバック（オプション） */
  onLoadDataRef?: (loadFn: (data: MagicCircleData) => void) => void;
  /** 完了状況更新時のコールバック（オプション） */
  onCompletionUpdate?: (status: { completed: number; total: number } | null) => void;
  initialPatternName?: string;
}) {
  const router = useRouter();

  const {
    canvasRef, canvasSize, isDrawing, userPath,
    timeLeft, isActive, showResult, scoreResult,
    debugMsg, setDebugMsg, startPoint, patternName, currentIndex, totalPatterns,
    difficulty, difficultyLabel, handleEvaluate, handleReset, handleNext, handlePrevious, changeDifficulty,
    getRankColor, onPointerDown, onPointerMove, onPointerUp,
    // リプレイ関連
    drawLogs, savedMagicData, isReplaying, handleReplay, handleLoadData,
    // 完了追跡
    completionStatus,
    // 音声検知
    voiceActivation,
    setVoiceActivation
  } = useMagicCircle(onScore, onReset, onCompletionUpdate, initialPatternName);

  const [showHelp, setShowHelp] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<MagicCircleHistory | null>(null);

  // 初回訪問時にチュートリアルを自動表示
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('tutorialCompleted')) {
      setShowTutorial(true);
    }
  }, []);

  // チュートリアル完了時に localStorage にフラグを保存
  const handleTutorialComplete = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tutorialCompleted', '1');
    }
    setShowTutorial(false);
  }, []);

  // Sync external difficulty prop
  useEffect(() => { changeDifficulty(initialDifficulty); }, [initialDifficulty, changeDifficulty]);

  // Expose load function to parent via ref callback
  const passLoadData = useCallback(() => {
    if (onLoadDataRef) onLoadDataRef(handleLoadData);
  }, [onLoadDataRef, handleLoadData]);

  useEffect(() => {
    passLoadData();
  }, [passLoadData]);

  const handleHistorySelect = (history: MagicCircleHistory) => {
    setSelectedHistory(history);
    setShowHistory(false);
  };

  const handleCloseDetail = () => {
    setSelectedHistory(null);
  };

  const handleReEdit = ({ data }: { data: MagicCircleData }) => {
    handleReset();
    handleLoadData(data);
    setSelectedHistory(null);
  };

  const guideText = patternName
    ? `赤い点から「${patternName}」をなぞってください`
    : '赤い点から魔法陣をなぞってください';

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {showTutorial && (
        <TutorialOverlay onStart={handleTutorialComplete} />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* メニューボタン */}
      <button
        onClick={() => setShowMenu(v => !v)}
        className="absolute right-4 top-4 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 text-xl font-bold"
        style={{ borderColor: 'rgba(0,229,255,0.5)', color: '#00e5ff', background: 'rgba(10,10,20,0.8)' }}
        aria-label="メニュー"
      >
        ☰
      </button>

      {/* メニューパネル */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div
            className="absolute right-4 top-14 z-50 flex min-w-[240px] flex-col gap-1 rounded-xl border p-2"
            style={{ background: 'rgba(13,13,26,0.97)', borderColor: 'rgba(0,229,255,0.3)' }}
          >
            {/* 作成履歴 */}
            <button
              onClick={() => { setShowHistory(true); setShowMenu(false); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-colors hover:bg-white/5"
              style={{ color: '#7c4dff' }}
            >
              📜 作成履歴
            </button>

            {/* レベル変更 */}
            <div className="px-3 py-2">
              <div className="mb-2 text-xs font-bold text-gray-500">🎯 レベル変更</div>
              <div className="flex flex-wrap gap-1">
                {(['easy', 'normal', 'hard', 'expert'] as Difficulty[]).map((d) => {
                  const colorMap: Record<Difficulty, string> = {
                    easy: '#76ff03', normal: '#00e5ff', hard: '#ff9100', expert: '#ff4081',
                  };
                  return (
                    <button
                      key={d}
                      onClick={() => { changeDifficulty(d); setShowMenu(false); }}
                      className={`rounded-md px-2 py-1 text-xs font-bold transition-all ${
                        difficulty === d ? 'scale-105' : 'opacity-50 hover:opacity-75'
                      }`}
                      style={{
                        borderColor: colorMap[d], borderWidth: 2, borderStyle: 'solid',
                        color: difficulty === d ? colorMap[d] : '#999',
                        background: difficulty === d ? `${colorMap[d]}18` : 'transparent',
                      }}
                    >
                      {d.toUpperCase()}
                      <span className="ml-1 opacity-75">(×{DIFFICULTY_MULTIPLIER[d]})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 音声入力 */}
            <button
              onClick={async () => {
                if (voiceActivation) {
                  if (voiceActivation.isListening) {
                    try {
                      await voiceActivation.stopListening();
                      setDebugMsg('🔇 音声検知を停止しました');
                    } catch (err) {
                      console.error('音声検知停止エラー:', err);
                      setDebugMsg('⚠️ 音声検知停止エラー');
                    }
                  } else {
                    try {
                      await voiceActivation.startListening();
                      setDebugMsg('🎤 音声検知を開始しました');
                    } catch (err) {
                      console.error('音声検知開始エラー:', err);
                      setDebugMsg('⚠️ マイクアクセスが拒否または利用できません');
                      setVoiceActivation(null);
                    }
                  }
                } else {
                  setDebugMsg('⚠️ 音声検知は利用できません（マイクアクセスが必要）');
                }
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-colors hover:bg-white/5"
              style={{
                color: voiceActivation?.isListening ? '#76ff03'
                  : voiceActivation?.isMicAccessible === false ? '#ff4444'
                  : '#00e5ff',
              }}
            >
              {voiceActivation?.isListening ? '🎤' : voiceActivation?.isMicAccessible === false ? '🔇' : '🔊'}
              {' '}音声入力{voiceActivation?.isListening ? '（ON）' : '（OFF）'}
            </button>

            {/* アプリ情報 */}
            <button
              onClick={() => { router.push('/app-info'); setShowMenu(false); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-colors hover:bg-white/5"
              style={{ color: '#00e5ff' }}
            >
              ℹ️ アプリ情報
            </button>

            {/* ヘルプ */}
            <button
              onClick={() => { setShowHelp(true); setShowMenu(false); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-colors hover:bg-white/5"
              style={{ color: '#00e5ff' }}
            >
              ❓ ヘルプ
            </button>
          </div>
        </>
      )}

      {/* パターン名とページネーション - プレイ中は簡素化 */}
      {!isActive && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-600 bg-gray-800/50 text-gray-400 hover:bg-gray-600/70 transition-colors disabled:opacity-50"
          >
            〈
          </button>
          <span className="flex-1 flex items-center justify-center font-bold" style={{ color: '#7c4dff' }}>
            {patternName || '準備中...'}
          </span>
          <span className="text-gray-500">
            #{currentIndex + 1} / {totalPatterns}
          </span>
          <button
            onClick={handleNext}
            disabled={currentIndex >= totalPatterns - 1}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-600 bg-gray-800/50 text-gray-400 hover:bg-gray-600/70 transition-colors disabled:opacity-50"
          >
            〉
          </button>
        </div>
      )}

      <div className="relative w-[350px] max-w-full" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="rounded-lg border-2 border-gray-700 w-full h-auto touch-none"
          style={{
            background: '#0a0a14',
            display: 'block',
            pointerEvents: isReplaying ? 'none' : 'auto',
            touchAction: 'none',
            cursor: isDrawing ? 'crosshair' : 'auto'
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />

        {!isDrawing && !showResult && (
          <div
            className="absolute tutorial-arrow"
            style={{
              left: startPoint.x - 10,
              top: startPoint.y - 10,
              width: 20,
              height: 20,
              pointerEvents: 'none',
            }}
          >
            <div className="absolute inset-0 animate-ping rounded-full bg-pink-500 opacity-75" />
            <div className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-pink-400 bg-pink-500">
              <span className="text-[10px] text-white">▶</span>
            </div>
          </div>
        )}

        {!isActive && !isDrawing && !showResult && (
          <div
            className="absolute left-0 right-0 top-2 -translate-y-full text-center text-xs"
            style={{ color: '#7676aa' }}
          >
            ▲ {guideText}
          </div>
        )}

        {showResult && scoreResult && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            style={{
              background: 'rgba(13, 13, 26, 0.9)',
              backdropFilter: 'blur(4px)',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '90vw',
              textAlign: 'center'
            }}
          >
            <div className="text-8xl font-bold" style={{ color: getRankColor(scoreResult.rank) }}>
              {scoreResult.rank}
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold">{scoreResult.score}点</div>
              <div className="text-2xl text-[#00e5ff]">
                威力: {scoreResult.damageMultiplier}x ({difficultyLabel})
              </div>
            </div>
            <div className="mt-6 flex space-x-3 justify-center flex-wrap">
              <button
                onClick={handleReplay}
                disabled={drawLogs.length === 0 || isReplaying}
                className="cursor-pointer rounded-md px-6 py-2 font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-80"
                style={{ background: 'linear-gradient(135deg, #ffd700, #ff9100)' }}
              >
                {isReplaying ? '再生中...' : '🔄 リプレイ'}
              </button>
            </div>
          </div>
        )}

        {isActive && (
          <div className="absolute right-2 top-2 rounded-md bg-black/60 px-3 py-1 font-mono text-xl">
            {timeLeft}s
          </div>
        )}

        {!isActive && !isDrawing && !showResult && timeLeft === 0 && (
          <div
            className="absolute inset-0 z-40 flex flex-col items-center justify-center"
            style={{ background: 'rgba(13, 13, 26, 0.85)' }}
          >
            <div className="mb-4 text-2xl font-bold" style={{ color: '#ff4081' }}>
              ⏰ 時間切れ！
            </div>
            <button
              onClick={handleReset}
              className="cursor-pointer rounded-lg px-8 py-3 text-lg font-bold text-black transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #ff4081, #7c4dff)' }}
            >
              🔄 再挑戦
            </button>
          </div>
        )}
      </div>

      <div className="mt-1 min-h-[1.25rem] text-sm text-gray-400">
        {isActive && `⏱ 残り${timeLeft}秒`}
        {!isActive && !isDrawing && !showResult && timeLeft === 0 && <span style={{ color: '#ff4081' }}>⏰ 詠唱終了！リセットして再挑戦</span>}
        {!isActive && !isDrawing && !showResult && timeLeft > 0 && (userPath.length > 0 ? '描画完了。スコア判定しますか？' : `▲ ${guideText}`)}
      </div>

      {/* デバッグログ表示 - プレイ中は非表示にしてUIを簡素化 */}
      {!isActive && (
        <div className="rounded-lg bg-black/80 p-2 text-center text-xs font-mono text-green-400 backdrop-blur-sm">
          {debugMsg}
        </div>
      )}

      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={handleEvaluate}
          disabled={showResult || isReplaying}
          className="cursor-pointer rounded-md px-6 py-2 font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #00e5ff, #7c4dff)' }}
        >
          詠唱完了！
        </button>
        <button
          onClick={handleReset}
          className="cursor-pointer rounded-md border-2 border-gray-600 px-6 py-2 font-bold transition-colors hover:bg-gray-800"
        >
          リセット
        </button>
      </div>

      {/* History Panel */}
      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelect={handleHistorySelect}
      />

      {/* History Detail Modal */}
      <HistoryDetail
        history={selectedHistory}
        onClose={handleCloseDetail}
        onReEdit={handleReEdit}
      />
    </div>
  );
}
