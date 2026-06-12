'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ShareModalProps {
  url: string;
  title: string;
  text: string;
  onClose: () => void;
}

/**
 * QRコード＋コピーボタン付きの共有モーダル
 */
export function ShareModal({ url, title, text, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && 'share' in navigator);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API が使えない場合は何もしない
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text, url });
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

        {/* QRコード */}
        <div className="rounded-xl p-3 bg-white">
          <QRCodeSVG value={url} size={180} />
        </div>

        {/* URL省略表示 */}
        <p
          className="w-full truncate text-center text-xs"
          title={url}
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          {url}
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
