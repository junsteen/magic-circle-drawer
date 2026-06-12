'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { saveReplayToKV } from '@/lib/replayApi';

interface ShareModalProps {
  /** KV 保存前の長い URL（?data=...形式）*/
  longUrl: string;
  title: string;
  text: string;
  onClose: () => void;
}

/**
 * QRコード＋コピーボタン付き共有モーダル
 * 開いた時点で Cloudflare KV に保存し、短縮 URL を生成する
 * KV 保存に失敗した場合は元の長い URL にフォールバック
 */
export function ShareModal({ longUrl, title, text, onClose }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null); // null = ローディング中
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && 'share' in navigator);
  }, []);

  // モーダル表示時に KV へ保存して短縮 URL を生成
  useEffect(() => {
    // ?data= パラメータ部分のみ抽出して送信
    const url = new URL(longUrl);
    const compressed = url.searchParams.get('data');

    if (!compressed) {
      setShareUrl(longUrl);
      return;
    }

    saveReplayToKV(compressed).then((id) => {
      if (id) {
        setShareUrl(`${url.origin}/replay?id=${id}`);
      } else {
        // 失敗時はフォールバックとして長い URL を使用
        setShareUrl(longUrl);
      }
    });
  }, [longUrl]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API が使えない場合は何もしない
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.share({ title, text, url: shareUrl });
    } catch {
      // キャンセル等は無視
    }
  };

  return (
    <>
      {/* バックドロップ */}
      <div className="fixed inset-0 z-[60] bg-black/70" onClick={onClose} />
      {/* モーダル本体 */}
      <div
        className="fixed left-1/2 top-1/2 z-[70] w-72 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 flex flex-col items-center gap-4"
        style={{ background: '#0d0d1a', border: '1px solid rgba(0,229,255,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold" style={{ color: '#00e5ff' }}>
          📤 リプレイを共有
        </h3>

        {shareUrl === null ? (
          // ローディング中
          <div className="flex h-[206px] w-[206px] items-center justify-center">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
              style={{ borderTopColor: '#00e5ff' }}
            />
          </div>
        ) : (
          <>
            {/* QRコード */}
            <div className="rounded-xl p-3 bg-white">
              <QRCodeSVG value={shareUrl} size={180} />
            </div>

            {/* URL 省略表示 */}
            <p
              className="w-full truncate text-center text-xs"
              title={shareUrl}
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              {shareUrl}
            </p>

            {/* ボタン群 */}
            <div className="flex w-full gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 rounded-lg py-2 text-xs font-bold transition-opacity hover:opacity-80"
                style={{
                  background: copied ? 'rgba(0,229,255,0.25)' : 'rgba(0,229,255,0.1)',
                  border: '1px solid rgba(0,229,255,0.4)',
                  color: '#00e5ff',
                }}
              >
                {copied ? '✅ コピー済み' : '📋 URLをコピー'}
              </button>
              {canNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className="flex-1 rounded-lg py-2 text-xs font-bold transition-opacity hover:opacity-80"
                  style={{
                    background: 'rgba(0,229,255,0.1)',
                    border: '1px solid rgba(0,229,255,0.4)',
                    color: '#00e5ff',
                  }}
                >
                  🔗 シェア
                </button>
              )}
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="text-xs transition-opacity hover:opacity-60"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          閉じる
        </button>
      </div>
    </>
  );
}
