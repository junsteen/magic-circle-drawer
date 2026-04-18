<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Arcane Tracer プロジェクトガイドライン

## 必ず守る開発プロセス（必読）
全エージェントは以下の開発プロセスを厳守すること。日本語で出力することを強制する。

### 正式な工程順序
1. **Issue作成**: 変更が必要な場合は必ずIssueを作成する
2. **タスク分解**: Issueを具体的なタスクに分解し、レビューを依頼する
3. **要件定義**: タスクの要件を定義し、レビュー → 再レビューまで行う
4. **設計**: 実装設計を行い、レビュー → 再レビューまで行う
5. **タスク一覧確定**: 実装タスクの一覧を確定する
6. **対象ファイル一覧作成 → レビュー → 再レビュー**: 
   - 作業開始前に対象フォルダを再帰的に走査し、対象ファイル一覧を作成する
   - 対象ファイル一覧はレビューし、承認されるまで作業を開始しない
   - 一覧に含まれないファイルは編集禁止
7. **開発 → レビュー → 再レビュー**: 
   - タスクに従って開発を進める
   - 定期的にレビューを依頼し、修正を行う
8. **テスト → レビュー → 再レビュー**: 
   - 実装後のテストを実施し、レビューを依頼する
   - テスト結果に基づいて修正を行う
9. **Pull Request必須**: 
   - すべての変更はPull Requestを通じて行う
   - PRにはIssue番号を参照すること (例: "Fixes #66")
   - PRテンプレートに従って詳細な説明を記入
10. **コードレビュー**: 
    - PRは少なくとも1人の承認を得るまでマージしない
    - レビューコメントは必ず対応する
11. **コミットメッセージ**: 
    - 明確で説明的なコミットメッセージを使用する
    - 日本語で簡潔に説明（英語は補助的に使用可）
12. **ドキュメント更新**: 
    - 機能追加や変更がある場合は、関連するドキュメントも更新する
    - AGENTS.md自体を変更する場合は、この開発プロセスも含めて更新を検討する
13. **テストと検証**: 
    - UI変更の場合は、複数のデバイスサイズで動作確認を行う
    - PWA機能については、オフライン動作も確認する
    - READMEと仕様コメントの整合性を確認する

### 日本語出力ルールを強化
- すべてのエージェントは日本語出力を標準とする。
- 説明文・コメント・README は日本語で記述する。
- 英語併記は任意だが、日本語を優先する。
- 技術用語は原文のまま使用可能だが、説明は日本語で行う
- コメント、ドキュメント、チャットメッセージは日本語で記述する
- 例外的に英語が必要な場合は、日本語訳を併記する

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
- 定数: `/src/lib/` ディレクトリに配置 (patterns.ts などに難易度設定などの定数が含まれる)

## READMEと仕様コメントの整合性
- コード変更時は README と仕様コメントの更新を必ず検討する。
- 仕様変更がある場合は README とコメントを同期させる。
- 不整合を見つけた場合は Issue を作成し、修正する。
