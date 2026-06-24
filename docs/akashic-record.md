# 📚 アカシックレコード仕様

## 概要

GitHubのような「リモート↔ローカル」構造の魔法陣共有図書館。

```
アカシックレコード（Cloudflare D1 / クラウド）  ← /akashic
  ↕ ダウンロード
魔導書「カスタム」タブ（IndexedDB / ローカル）  ← /grimoire → カスタムタブ
  ↓ 遊ぶ
ゲーム（魔法陣なぞり）
```

---

## D1スキーマ

データベース名: `akashic-record`  
wrangler.tomlバインディング: `AKASHIC_DB`

```sql
CREATE TABLE patterns (
  id          TEXT    PRIMARY KEY,        -- 8文字ID（URL安全英数字）
  name        TEXT    NOT NULL,           -- パターン名（1〜50文字）
  data        TEXT    NOT NULL,           -- JSON (vertices/edges/circles)
  thumbnail   TEXT,                       -- Base64縮小画像（任意）
  author_id   TEXT    NOT NULL,           -- デバイスID（UUID）
  downloads   INTEGER NOT NULL DEFAULT 0, -- ダウンロード数
  created_at  INTEGER NOT NULL            -- Unixタイムスタンプ（秒）
);

CREATE INDEX idx_patterns_created_at ON patterns(created_at DESC);
CREATE INDEX idx_patterns_downloads   ON patterns(downloads DESC);
```

マイグレーションファイル: `migrations/0001_create_patterns.sql`

---

## APIエンドポイント

| メソッド | パス | 機能 |
|---|---|---|
| `GET` | `/api/akashic/list?sort=new\|popular&page=1&limit=20` | 一覧取得 |
| `POST` | `/api/akashic/publish` | パターン公開 |
| `POST` | `/api/akashic/:id/download` | ダウンロード（カウント+1 & データ取得） |

### GET /api/akashic/list

レスポンス（`data`フィールドは容量削減のため返さない）:
```json
{
  "patterns": [
    { "id": "A3bCd9eF", "name": "五芒星カスタム", "thumbnail": "...", "downloads": 42, "created_at": 1719230400 }
  ],
  "total": 100,
  "page": 1
}
```

### POST /api/akashic/publish

リクエストボディ:
```json
{
  "name": "パターン名",
  "data": { "vertices": [...], "edges": [...], "circles": [...] },
  "thumbnail": "data:image/png;base64,...",
  "authorId": "device-uuid"
}
```

### POST /api/akashic/:id/download

完全なパターンデータを返し、downloadsカウントを+1する。

---

## ローカルDB（customPatternDB）

| 項目 | 値 |
|---|---|
| DB名 | `ArcaneTracerCustomPatterns` |
| ストア名 | `patterns` |
| キー | `id`（アカシックレコードのID） |
| インデックス | `downloadedAt` |

```ts
interface LocalCustomPattern {
  id: string;
  name: string;
  data: { vertices, edges, circles };
  thumbnail?: string;
  downloadedAt: number;
}
```

ヘルパー: `toMagicCirclePattern(p)` で `MagicCirclePattern` に変換（`vertexCount`等は配列長から計算）。

---

## デバイスID管理

localStorage キー: `arcane_device_id`  
初回アクセス時に `crypto.randomUUID()` で生成・保存。

---

## 関連ファイル

| ファイル | 役割 |
|---|---|
| `wrangler.toml` | D1バインディング設定 |
| `migrations/0001_create_patterns.sql` | DBスキーマ |
| `src/lib/akashicTypes.ts` | TypeScript型定義 |
| `src/lib/akashicApi.ts` | API呼び出しヘルパー |
| `src/lib/customPatternDB.ts` | ローカルIndexedDB |
| `src/app/akashic/page.tsx` | アカシックレコード画面 |
| `src/components/akashic/AkashicCard.tsx` | 一覧カード |
| `src/components/akashic/AkashicDetailModal.tsx` | 詳細モーダル |
| `src/app/grimoire/page.tsx` | 魔導書（カスタムタブ追加） |
| `src/components/grimoire/CustomPatternCard.tsx` | カスタムパターンカード |
| `functions/api/akashic/list.ts` | GET一覧API |
| `functions/api/akashic/publish.ts` | POST公開API |
| `functions/api/akashic/[id]/download.ts` | POSTダウンロードAPI |

---

## 初回セットアップ

```bash
# D1データベースの作成
wrangler d1 create akashic-record

# 取得したdatabase_idをwrangler.tomlに設定後、マイグレーション実行
wrangler d1 execute akashic-record --file=migrations/0001_create_patterns.sql
```

---

## MVP外（後回し）

- パターンエディター（自作・公開機能）
- 削除・報告機能
- ユーザー認証（現在はデバイスIDで代替）
