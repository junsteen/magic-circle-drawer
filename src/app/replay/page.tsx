'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MagicCircleHistory } from '@/lib/types';
import { decompressFromUrlOptimized as decompressFromUrl } from '@/lib/shareUtils';
import HistoryDetail from '@/components/HistoryDetail';

// Helper component to handle search params in suspense
function ReplayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [history, setHistory] = useState<MagicCircleHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (!dataParam) {
      setError('データが見つかりません。有効な共有URLからアクセスしてください。');
      setLoading(false);
      return;
    }

    // decompressFromUrlOptimized はフラット構造 { pattern, drawLogs, score, ... } を返す
    const flat = decompressFromUrl<{
      pattern: MagicCircleHistory['data']['pattern'];
      drawLogs: MagicCircleHistory['data']['drawLogs'];
      score: number;
      rank: string;
      difficulty: string;
      difficultyMultiplier: number;
      damageMultiplier: string;
    }>(dataParam);

    if (!flat) {
      setError('データの復元に失敗しました。共有リンクが無効または破損している可能性があります。');
      setLoading(false);
      return;
    }

    if (!flat.pattern) {
      setError('データ形式が不正です。');
      setLoading(false);
      return;
    }

    if (!Array.isArray(flat.drawLogs)) {
      setError('描画データが見つかりません。');
      setLoading(false);
      return;
    }

    // フラット構造から MagicCircleHistory を再構築
    const decompressedData: MagicCircleHistory = {
      id: `replay_${Date.now()}`,
      data: {
        pattern: flat.pattern,
        drawLogs: flat.drawLogs,
        timestamp: Date.now(),
      },
      score: flat.score,
      rank: flat.rank,
      difficulty: flat.difficulty,
      difficultyMultiplier: flat.difficultyMultiplier,
      damageMultiplier: flat.damageMultiplier,
      createdAt: Date.now(),
    };

    setHistory(decompressedData);
    setLoading(false);
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-400">魔法陣を復元中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
        <div className="text-center bg-gray-800/50 rounded-xl p-6 max-w-md">
          <h2 className="text-red-400 mb-4">❌ エラー</h2>
          <p className="text-gray-300">{error}</p>
          <div className="mt-6">
            <a
              href="/"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              ホームに戻る
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!history) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-gray-400">データが読み込まれていません。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* HistoryDetail component will handle the replay functionality */}
      <HistoryDetail 
        history={history} 
        onClose={() => {
          // Navigate back to home when closing
          router.push('/');
        }} 
        onReEdit={(data) => {
          // パターン名をURLパラメータとしてホームに渡して再編集
          if (data && data.data && data.data.pattern && data.data.pattern.name) {
            const patternName = encodeURIComponent(data.data.pattern.name);
            router.push(`/?pattern=${patternName}`);
          } else {
            router.push('/');
          }
        }}
      />
    </div>
  );
}

export default function ReplayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-400">魔法陣を復元中...</p>
      </div>
    </div>}>
      <ReplayContent />
    </Suspense>
  );
}