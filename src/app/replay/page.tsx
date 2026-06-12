'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MagicCircleHistory } from '@/lib/types';
import { decompressFromUrlOptimized as decompressFromUrl } from '@/lib/shareUtils';
import { loadReplayFromKV } from '@/lib/replayApi';
import HistoryDetail from '@/components/HistoryDetail';

type ParseResult =
  | { loading: true; history: null; error: null }
  | { loading: false; history: MagicCircleHistory; error: null }
  | { loading: false; history: null; error: string };

function buildHistory(flat: {
  pattern: MagicCircleHistory['data']['pattern'];
  drawLogs: MagicCircleHistory['data']['drawLogs'];
  score: number;
  rank: string;
  difficulty: string;
  difficultyMultiplier: number;
  damageMultiplier: string;
}, idSeed: string): MagicCircleHistory {
  return {
    id: `replay_${idSeed.slice(0, 20)}`,
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
}

type SyncResult = { loading: false; history: MagicCircleHistory; error: null } | { loading: false; history: null; error: string };

function parseCompressed(compressed: string, idSeed: string): SyncResult {
  const flat = decompressFromUrl<{
    pattern: MagicCircleHistory['data']['pattern'];
    drawLogs: MagicCircleHistory['data']['drawLogs'];
    score: number;
    rank: string;
    difficulty: string;
    difficultyMultiplier: number;
    damageMultiplier: string;
  }>(compressed);

  if (!flat) return { loading: false, history: null, error: 'データの復元に失敗しました。共有リンクが無効または破損している可能性があります。' };
  if (!flat.pattern) return { loading: false, history: null, error: 'データ形式が不正です。' };
  if (!Array.isArray(flat.drawLogs)) return { loading: false, history: null, error: '描画データが見つかりません。' };

  return { loading: false, history: buildHistory(flat, idSeed), error: null };
}

function ReplayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [result, setResult] = useState<ParseResult>({ loading: true, history: null, error: null });

  useEffect(() => {
    const dataParam = searchParams.get('data');
    const idParam = searchParams.get('id');

    if (dataParam) {
      // 従来の ?data= 形式（後方互換）
      const parsed = parseCompressed(dataParam, dataParam);
      setResult({ ...parsed, loading: false });
      return;
    }

    if (idParam) {
      // 新しい ?id= 形式（KV経由）
      loadReplayFromKV(idParam).then((compressed) => {
        if (!compressed) {
          setResult({ loading: false, history: null, error: 'リプレイデータが見つかりません。リンクが期限切れ（30日）または無効です。' });
          return;
        }
        const parsed = parseCompressed(compressed, idParam);
        setResult({ ...parsed, loading: false });
      });
      return;
    }

    setResult({ loading: false, history: null, error: 'データが見つかりません。有効な共有URLからアクセスしてください。' });
  }, [searchParams]);

  if (result.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-gray-400">魔法陣を復元中...</p>
        </div>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
        <div className="text-center bg-gray-800/50 rounded-xl p-6 max-w-md">
          <h2 className="text-red-400 mb-4">❌ エラー</h2>
          <p className="text-gray-300">{result.error}</p>
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

  if (!result.history) {
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
        history={result.history}
        onClose={() => router.push('/')}
        onReEdit={(data) => {
          if (data?.data?.pattern?.name) {
            router.push(`/?pattern=${encodeURIComponent(data.data.pattern.name)}`);
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-gray-400">魔法陣を復元中...</p>
        </div>
      </div>
    }>
      <ReplayContent />
    </Suspense>
  );
}
