'use client';

import { useState } from 'react';
import type { ScoringResult } from '@/lib/scoring';
import { useMagicCircle } from '@/hooks/useMagicCircle';
import HelpModal from './HelpModal';
import TutorialOverlay from './TutorialOverlay';

export default function MagicCircleCanvas({
  onScore,
  onReset,
}: {
  onScore: (result: ScoringResult) => void;
  onReset: () => void;
}) {
  const {
    canvasRef, canvasSize, isDrawing, userPath,
    timeLeft, isActive, showResult, scoreResult,
    debugMsg, startPoint, handleEvaluate, handleReset,
    getRankColor, onPointerDown, onPointerMove, onPointerUp,
  } = useMagicCircle(onScore, onReset);

  const [showHelp, setShowHelp] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

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

      <div className="relative w-[350px] max-w-full">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="rounded-lg border-2 border-gray-700 w-full h-auto touch-none"
          style={{ background: '#0a0a14', display: 'block' }}
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
            ▲ 赤い点から三角形をなぞってください
          </div>
        )}

        {showResult && scoreResult && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              background: 'rgba(13, 13, 26, 0.85)',
              borderRadius: '8px',
            }}
          >
            <div className="text-6xl font-bold" style={{ color: getRankColor(scoreResult.rank) }}>
              {scoreResult.rank}
            </div>
            <div className="mt-2 text-2xl">{scoreResult.score}点</div>
            <div className="mt-1 text-lg" style={{ color: '#00e5ff' }}>
              威力: {scoreResult.damageMultiplier}
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
        {isActive && `⏱ 詠唱中... 残り${timeLeft}秒`}
        {!isActive && !isDrawing && !showResult && timeLeft === 0 && <span style={{ color: '#ff4081' }}>⏰ 詠唱終了！リセットして再挑戦</span>}
        {!isActive && !isDrawing && !showResult && timeLeft > 0 && (userPath.length > 0 ? '描画完了。スコア判定しますか？' : '▲ 赤い点から三角形をなぞってください')}
      </div>

      {/* デバッグログ表示 */}
      <div className="fixed bottom-4 left-4 right-4 z-[100] rounded-lg bg-black/80 p-2 text-center text-xs font-mono text-green-400 backdrop-blur-sm">
        {debugMsg}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleEvaluate}
          disabled={userPath.length < 10 || showResult}
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
    </div>
  );
}
