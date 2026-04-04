# 🔮 Arcane Tracer

**「詠唱の正確さが威力になる」**

スマホ画面上で魔法陣を指でなぞり、その正確さをスコア化するWebアプリケーション。

## コンセプト

- お手本の魔法陣をなぞって描画する
- 正確さに応じてスコア（0〜100点）が算出される
- スコアを魔法のダメージ倍率として出力

## 操作ガイド

1. アプリを開くと、薄いグレーの**三角形のお手本**が表示されます
2. 左上の**赤い点（▶）** をタップ/クリックして描画を開始します
3. 指を離さずに三角形の線に沿って**一周**なぞってください
   - ⚠️ 制限時間は **5秒** です！
4. 描き終わったら **「詠唱完了！」** ボタンをタップ
5. スコアとランク（S/A/B/C）とダメージ倍率が表示されます
6. **「リセット」** ボタンでもう一度チャレンジできます

<details>
<summary>🎯 ランク一覧</summary>

| ランク | 必要スコア | ダメージ倍率 |
|--------|-----------|-------------|
| <span style="color:#ffd700">**S**</span> | 90点以上 | 120% |
| <span style="color:#00e5ff">**A**</span> | 70点以上 | 100% |
| <span style="color:#76ff03">**B**</span> | 50点以上 | 70% |
| <span style="color:#ff4081">**C**</span> | 50点未満 | 0% |

</details>

## 技術スタック

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Drawing**: HTML5 Canvas API
- **Deployment**: Vercel

## Getting Started

### 事前要件

- **Node.js** v18 以上がインストールされていること
  - [Node.js公式サイト](https://nodejs.org/)からダウンロード可能
- **npm** （Node.jsに同梱）

### インストール手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/junsteen/magic-circle-drawer.git
cd magic-circle-drawer

# 2. 依存パッケージをインストール（必ず実行してください）
npm install
```

> ⚠️ **重要**: `npm install` を実行しないと、Next.js、Reactなどの依存パッケージがインストールされず、アプリが起動しません。

手動でインストールする場合は以下を実行します：

```bash
npm install next react react-dom
npm install --save-dev typescript tailwindcss @tailwindcss/postcss @types/node @types/react @types/react-dom eslint eslint-config-next
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

### プロダクションビルド

```bash
npm run build
npm start
```

### その他のコマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動（Turbopack） |
| `npm run build` | プロダクションビルド |
| `npm start` | プロダクションサーバー起動 |
| `npm run lint` | ESLintによるコードチェック |

## プロジェクト構成

```
arcane-tracer/
├── src/
│   ├── app/
│   │   ├── layout.tsx        # ルートレイアウト（ビューポート設定）
│   │   ├── page.tsx           # メインページ
│   │   └── globals.css        # グローバルスタイル
│   ├── components/
│   │   └── MagicCircleCanvas.tsx  # Canvas描画コンポーネント
│   └── lib/
│       └── scoring.ts         # スコア判定ロジック
├── package.json
├── tsconfig.json
└── next.config.ts
```

## ライセンス

MIT
