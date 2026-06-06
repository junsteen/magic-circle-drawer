'use client';

import { useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MagicCircleHistory } from '@/lib/types';
import { decompressFromUrlOptimized as decompressFromUrl } from '@/lib/shareUtils';
import HistoryDetail from '@/components/HistoryDetail';

type ParseResult =
  | { history: MagicCircleHistory; error: null }
  | { history: null; error: string };

function ReplayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { history, error } = useMemo<ParseResult>(() => {
    const dataParam = searchParams.get('data');
    if (!dataParam) {
      return { history: null, error: 'データが見つかりません。有効な共有URLからアクセスしてください。' };
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
      return { history: null, error: 'データの復元に失敗しました。共有リンクが無効または破損している可能性があります。' };
    }

    if (!flat.pattern) {
      return { history: null, error: 'データ形式が不正です。' };
    }

    if (!Array.isArray(flat.drawLogs)) {
      return { history: null, error: '描画データが見つかりません。' };
    }

    // フラット構造から MagicCircleHistory を再構築
    // IDとタイムスタンプはURLデータから一意に生成（Date.now()はuseMemo内不可）
    const replayId = `replay_${dataParam.slice(0, 20)}`;
    const decompressedData: MagicCircleHistory = {
      id: replayId,
      data: {
        pattern: flat.pattern,
        drawLogs: flat.drawLogs,
        timestamp: 0,
      },
      score: flat.score,
      rank: flat.rank,
      difficulty: flat.difficulty,
      difficultyMultiplier: flat.difficultyMultiplier,
      damageMultiplier: flat.damageMultiplier,
      createdAt: 0,
    };

    return { history: decompressedData, error: null };
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
        <div className="text-center bg-gray-800/50 rounded-xl p-6 max-w-md">
          <h2 className="text-red-400 mb-4">❌ エラー</h2>
          <p className="text-gray-300">{error}</p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              ホームに戻る
            </Link>
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
      <HistoryDetail
        history={history}
        onClose={() => {
          router.push('/');
        }}
        onReEdit={(data) => {
          if (data?.data?.pattern?.name) {
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
