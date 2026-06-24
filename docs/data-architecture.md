# 🗄️ データ管理アーキテクチャ

## 概要

Arcane Tracer のデータ管理は **クライアント側（IndexedDB）** と **サーバー側（Cloudflare KV）** の2層構成。

```
ブラウザ
├── IndexedDB（永続ローカルストレージ）
│   ├── ArcaneTracerHistory          履歴DB
│   ├── ArcaneTracerCompletion       完了記録DB
│   ├── achievementDB                実績・称号DB
│   └── ArcaneTracerCustomPatterns   カスタムパターンDB（アカシックレコードからDL）
│
└── localStorage（軽量ローカルストレージ）
    ├── アンロック状態（history/multiMode/grimoire/comboMode）
    └── arcane_device_id（アカシックレコード投稿者識別用UUID）

Cloudflare Pages Functions
├── REPLAY_KV（KV Namespace: c81c78076a7246a2926374f7c58b42a1）
│   └── リプレイデータ（TTL: 30日）
└── AKASHIC_DB（D1 Database: akashic-record）
    └── 共有魔法陣パターン（永続保存）
```

---

## クライアント側データ

### 1. 履歴DB (`src/lib/historyDB.ts`)

| 項目 | 値 |
|---|---|
| DB名 | `ArcaneTracerHistory` |
| バージョン | 1 |
| ストア名 | `history` |
| キー | `id`（自動生成） |
| インデックス | `createdAt` |

**保存データ型 (`MagicCircleHistory`):**
```ts
{
  id: string;
  data: {
    seed: number;
    pattern: { name, vertices, edges, circles };
    drawLogs: DrawStroke[];   // ユーザーの描画軌跡
    timestamp: number;
  };
  score: number;              // 0-100
  rank: string;               // S/A/B/C
  difficulty: string;         // EASY/NORMAL/HARD/EXPERT
  difficultyMultiplier: number;
  damageMultiplier: string;
  thumbnail?: string;         // Data URL
  createdAt: number;
}
```

### 2. 完了記録DB (`src/lib/completionDB.ts`)

| 項目 | 値 |
|---|---|
| DB名 | `ArcaneTracerCompletion` |
| ストア名 | `completion` |
| キー | `patternName` |

**保存データ型 (`CompletionRecord`):**
```ts
{
  patternName: string;
  bestScore: number;
  bestRank: string;
  firstSRankAt?: number;   // Sランク初達成日時
}
```

### 3. アンロック状態 (`src/lib/unlocks.ts`)

localStorage に JSON で保存。

| キー | アンロック条件 | アンロックする機能 |
|---|---|---|
| `history` | 1回プレイ | 履歴パネル |
| `multiMode` | 5回プレイ | マルチモード |
| `grimoire` | 10回プレイ | 魔法陣図鑑 |
| `comboMode` | 3回コンボ資格獲得 | コンボモード |

コンボ資格: **残り時間 ≥ 1秒 かつ S or A ランク** で取得。

---

## サーバー側データ

### Cloudflare KV (`REPLAY_KV`)

`wrangler.toml` 設定:
```toml
[[kv_namespaces]]
binding = "REPLAY_KV"
id = "c81c78076a7246a2926374f7c58b42a1"
```

**保存内容:**
- キー: 8文字のURL安全ID（例: `A3bCd9eF`）
- 値: 圧縮済みリプレイデータ（LZString圧縮JSON）
- TTL: **30日**（自動削除）
- サイズ上限: **500KB/件**

**APIエンドポイント:**

| メソッド | パス | 説明 |
|---|---|---|
| `POST` | `/api/replay/save` | データ保存 → `{ id: "A3bCd9eF" }` を返す |
| `GET` | `/api/replay/[id]` | IDでデータ取得 |

**クライアント側ヘルパー (`src/lib/replayApi.ts`):**
```ts
saveReplayToKV(compressed: string): Promise<string | null>  // ID返却
loadReplayFromKV(id: string): Promise<string | null>        // データ取得
```

---

## 共有フロー

### URL直接共有（旧方式）
```
描画データ → LZString圧縮 → URLエンコード → ?data=XXX... として共有
```
制限: URLが長くなる（複雑な描画で2KB超）

### KV短縮ID共有（新方式）
```
描画データ → LZString圧縮 → POST /api/replay/save → 8文字ID → ?id=A3bCd9eF として共有
```
利点: URLが短く、QRコード化しやすい

---

## 今後の拡張方針（未実装）

- **ユーザー作成パターンのローカル保存**: 新IndexedDB追加 (`customPatternDB.ts`)
- **ユーザー作成パターンのサーバー共有**: 同じKVまたは別KV Namespaceを利用
- **魔法陣図書館（全ユーザー共有）**: Cloudflare D1（SQL）への移行を要検討
