# 🔮 Arcane Tracer

**「詠唱の正確さが威力になる」**

スマホ画面上で魔法陣を指でなぞり、その正確さをスコア化するWebアプリケーション。

## コンセプト

- お手本の魔法陣をなぞって描画する
- 指でなぞった軌跡が光のラインで描画される
- 正確さに応じてスコア（0〜100点）とランク（S/A/B/C）が算出される
- スコアは魔法のダメージ倍率として出力

## 技術スタック

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Drawing**: HTML5 Canvas API
- **Touch Events**: Pointer Events API (`onPointerDown`/`onPointerMove`/`onPointerUp`)
- **Build**: Static Export (`output: 'export'`)
- **Deployment**: Vercel

## MVP機能

1. 三角形の魔法陣お手本を表示
2. スマホのタッチ操作でなぞって描画
3. 描画精度をスコア化（S/A/B/Cランク）
4. 詠唱タイマー（5秒以内に描き切る）
5. リセット＆再挑戦

## ランク表

| ランク | スコア | 倍率 | 目安 |
|--------|--------|------|------|
| **S** | 90〜100 | x3.0 | 完璧な詠唱 |
| **A** | 70〜89 | x2.0 | 精密な詠唱 |
| **B** | 50〜69 | x1.5 | 合格ライン |
| **C** | 〜49 | x1.0 | 要練習 |

## Getting Started

### 開発

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開く

### 静的ビルド（本番用）

```bash
npm run build
npx serve out -l 5000
```

ビルドされた静的ファイルが `out/` ディレクトリに出力されます。
`npx serve out -l 5000` でローカルサーバーを起動し、スマホからアクセスして確認できます。

### Vercelデプロイ

このプロジェクトは `output: 'export'` で静的エクスポート設定済みです。Vercelにリポジトリを接続するだけで自動デプロイされます。

## 操作方法

1. **Start!** をタップして描画開始
2. Canvas上の **赤い点** から指でなぞる
3. 三角形をなぞりながら、お手本に沿って描画
4. 完了したら **詠唱完了！** ボタンでスコア判定
5. **リセット** で再挑戦

## タッチ対応

- `onPointerDown` / `onPointerMove` / `onPointerUp` を使用
- iPhone Safari・Android Chrome で動作確認済み
- `touch-action: none` でスクロール干渉を防止

## ライセンス

MIT
