<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Arcane Tracer プロジェクトガイドライン

## プロジェクト概要
Arcane Tracerは、画面上の魔法陣をなぞって精度を競うモバイルフレンドリーなWebアプリケーションです。Next.js 16 (App Router)、TypeScript、Tailwind CSS、HTML5 Canvasを使用して構築されています。

## 技術スタック
- **フレームワーク**: Next.js 16 (App Router) と静的エクスポート
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **描画**: HTML5 Canvas API
- **タッチイベント**: Pointer Events API
- **デプロイ**: Vercel、Cloudflare Pages (PWA対応)

## 主要ディレクトリ
- `/src` - ソースコード
  - `/src/app` - Appルーターページとレイアウト
  - `/src/components` - 再利用可能なコンポーネント
  - `/src/lib` - ユーティリティ関数と定数
  - `/src/hooks` - カスタムReactフック
- `/public` - 静的アセット
- `/docs` - ドキュメント

## 開発ワークフロー
1. 依存関係をインストール: `npm install`
2. 開発を開始: `npm run dev` (http://localhost:3000 で開く)
3. 本番用ビルド: `npm run build` (出力先は `/out` ディレクトリ)
4. タイプチェック: `npm run type-check`

## 重要なポイント
- Pointer Events API (`onPointerDown`/`onPointerMove`/`onPointerUp`) を使用したタッチサポート
- オフライン利用とホームスクリーンインストールのためのPWA機能実装
- 音声検知による音声入力アクティベーション機能
- 初めてのユーザー向けチュートリアルシステム
- 描画精度に基づくスコア計算（S/A/B/Cのレターグレード）
- 難易度設定による制限時間とスコア倍率の変動
- `next.config.ts` の `output: 'export'` 設定による静的エクスポート

## 規則
- コンポーネント命名: PascalCase
- ファイル命名: コンポーネントはkebab-case、ユーティリティはcamelCase
- 状態管理: Reactフック (useState, useEffect, useContext)
- スタイリング: Tailwindユーティリティファーストアプローチ
- 定数: `/src/lib/constants.ts` に配置
