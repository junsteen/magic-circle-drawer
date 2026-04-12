'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ScoringResult } from '@/lib/scoring';
import type { Difficulty } from '@/lib/patterns';
import { useMagicCircle } from '@/hooks/useMagicCircle';
import type { MagicCircleData, MagicCircleHistory } from '@/lib/types';
import HelpModal from './HelpModal';
import HistoryPanel from './HistoryPanel';
import HistoryDetail from './HistoryDetail';
import TutorialOverlay from './TutorialOverlay';

export default function MagicCircleCanvas({
  onScore,
  onReset,
  initialDifficulty,
  onLoadDataRef,
  onCompletionUpdate,
}: {
  onScore: (result: ScoringResult) => void;
  onReset: () => void;
  initialDifficulty: Difficulty;
  onLoadDataRef?: (loadFn: (data: MagicCircleData) => void) => void;
  onCompletionUpdate?: (status: { completed: number; total: number } | null) => void;
}) {
  const {
    canvasRef, canvasSize, isDrawing, userPath,
    timeLeft, isActive, showResult, scoreResult,
    debugMsg, setDebugMsg, startPoint, patternName, currentIndex, totalPatterns,
    difficulty, difficultyLabel, handleEvaluate, handleReset, handleNext, changeDifficulty,
    getRankColor, onPointerDown, onPointerMove, onPointerUp,
    // リプレイ関連
    drawLogs, savedMagicData, isReplaying, handleReplay, handleSaveData, handleLoadData,
    // 完了追跡
    completionStatus,
    // 音声検知
    voiceActivation,
    setVoiceActivation
  } = useMagicCircle(onScore, onReset, onCompletionUpdate);

  const [showHelp, setShowHelp] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<MagicCircleHistory | null>(null);

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
        <TutorialOverlay onStart={() => setShowTutorial(false)} />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      <button
        onClick={() => setShowHelp(true)}
        className="absolute right-4 top-4 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 text-lg font-bold"
        style={{ borderColor: 'rgba(0,229,255,0.5)', color: '#00e5ff', background: 'rgba(10,10,20,0.8)' }}
        aria-label="ヘルプ"
      >
        ?
      </button>

      {/* 履歴ボタン */}
      <button
        onClick={() => setShowHistory(true)}
        className="absolute left-4 top-4 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 text-lg font-bold"
        style={{ borderColor: 'rgba(124,77,255,0.5)', color: '#7c4dff', background: 'rgba(10,10,20,0.8)' }}
        aria-label="履歴"
      >
        📜
      </button>

      {/* 音声検知ボタン - プレイ中は非表示にしてUIを簡素化 */}
      {!isActive && (
        <button
          onClick={async () => {
            if (voiceActivation) {
              if (voiceActivation.isListening) {
                // 現在リスニング中なら停止
                try {
                  await voiceActivation.stopListening();
                  setDebugMsg('🔇 音声検知を停止しました');
                } catch (err) {
                  console.error('音声検知停止エラー:', err);
                  setDebugMsg('⚠️ 音声検知停止エラー');
                }
              } else {
                // マイクアクセスを要求してリスニング開始
                try {
                  await voiceActivation.startListening();
                  setDebugMsg('🎤 音声検知を開始しました');
                } catch (err) {
                  console.error('音声検知開始エラー:', err);
                  setDebugMsg('⚠️ マイクアクセスが拒否または利用できません');
                  // エラー状態を反映 - マイクアクセス失敗時は音声検知を無効化
                  setVoiceActivation(null);
                }
              }
            } else {
              setDebugMsg('⚠️ 音声検知は利用できません（マイクアクセスが必要）');
            }
          }}
          className="absolute left-14 top-4 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 text-lg font-bold"
          style={{
            borderColor: voiceActivation?.isListening 
              ? 'rgba(76,255,0,0.5)' 
              : voiceActivation?.isMicAccessible === false
                ? 'rgba(255,0,0,0.5)' 
                : 'rgba(0,229,255,0.5)',
            color: voiceActivation?.isListening 
              ? '#76ff03' 
              : voiceActivation?.isMicAccessible === false
                ? '#ff0000' 
                : '#00e5ff',
            background: 'rgba(10,10,20,0.8)'
          }}
          aria-label="音声検知"
          title={voiceActivation?.isListening 
            ? '音声検知中 - クリックで一時停止' 
            : voiceActivation?.isMicAccessible === false
              ? 'マイクアクセスが必要 - クリックで再試行'
              : '音声検知準備完了 - クリックで開始'}
        >
          {voiceActivation?.isListening 
            ? '🎤' 
            : voiceActivation?.isMicAccessible === false
              ? '🔇' 
              : '🔊'}
        </button>
      )}

      {/* パターン名とカウンター - プレイ中は簡素化 */}
      {!isActive && (
        <div className="flex items-center gap-3 text-sm">
          <span className="font-bold" style={{ color: '#7c4dff' }}>
            {patternName || '準備中...'}
          </span>
          <span className="text-gray-500">
            #{currentIndex + 1} / {totalPatterns}
          </span>
        </div>
      )}

      <div className="relative w-[350px] max-w-full">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="rounded-lg border-2 border-gray-700 w-full h-auto touch-none"
          style={{ background: '#0a0a14', display: 'block', pointerEvents: isReplaying ? 'none' : 'auto' }}
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
                onClick={handleReset}
                className="flex items-center px-6 py-3 rounded-lg font-medium transition-all"
                style={{ background: 'linear-gradient(135deg, #ff4081, #7c4dff)' }}
              >
                🔄 再挑戦
              </button>
              <button
                onClick={handleReplay}
                disabled={drawLogs.length === 0 || isReplaying}
                className="cursor-pointer rounded-md px-6 py-2 font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-80"
                style={{ background: 'linear-gradient(135deg, #ffd700, #ff9100)' }}
              >
                {isReplaying ? '再生中...' : '🔄 リプレイ'}
              </button>
              <button
                onClick={handleNext}
                className="flex items-center px-6 py-3 rounded-lg font-medium transition-all"
                style={{ background: 'linear-gradient(135deg, #7c4dff, #ff4081)' }}
              >
                次の魔法陣 →
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
          disabled={userPath.length < 10 || showResult || isReplaying}
          className="cursor-pointer rounded-md px-6 py-2 font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #00e5ff, #7c4dff)' }}
        >
          詠唱完了！
        </button>
        <button
          onClick={() => handleSaveData()}
          disabled={drawLogs.length === 0}
          className="cursor-pointer rounded-md px-6 py-2 font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #76ff03, #00e5ff)' }}
        >
          💾 保存
        </button>
        <button
          onClick={handleReset}
          className="cursor-pointer rounded-md border-2 border-gray-600 px-6 py-2 font-bold transition-colors hover:bg-gray-800"
        >
          リセット
        </button>
        <button
          onClick={handleNext}
          className="cursor-pointer rounded-md px-6 py-2 font-bold text-black transition-opacity hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #7c4dff, #ff4081)' }}
        >
          次の魔法陣 →
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
