# 🔓 アンロックシステム仕様

## 概要

プレイ回数や実績に応じて機能が段階的に解放される仕組み。
`src/lib/unlocks.ts` で管理、**localStorage** に保存。

---

## アンロック一覧

| 機能 | ストレージキー | 解放条件 |
|---|---|---|
| 履歴パネル | `history` | 1回プレイ |
| マルチモード | `multiMode` | 5回プレイ |
| 魔法陣図鑑（グリモワール） | `grimoire` | 10回プレイ |
| コンボモード | `comboMode` | コンボ資格を3回取得 |

---

## コンボ資格

**1回の魔法陣描画で以下を両方満たした場合** にコンボ資格取得:
- タイマーの **残り時間が1秒以上**
- ランクが **S または A**

コンボ資格の取得回数は localStorage に累積保存。3回達成でコンボモード解放。

---

## API

```ts
// アンロック状態の確認
isUnlocked(feature: UnlockFeature): boolean

// プレイ回数に基づくアンロックチェック（各プレイ後に呼び出す）
checkPlayBasedUnlocks(playCount: number): void

// コンボ資格チェック（描画完了後に呼び出す）
checkComboQualification(timeRemaining: number, rank: string): void

// アンロック済み機能一覧を取得
getUnlockedFeatures(): UnlockFeature[]
```

---

## ストレージ構造

localStorage に以下の形式で保存:

```json
{
  "arcane_unlocks": {
    "history": true,
    "multiMode": false,
    "grimoire": false,
    "comboMode": false,
    "comboQualifications": 1
  }
}
```

---

## アンロック演出

`src/components/UnlockModal.tsx` で新機能解放時にモーダル表示。
- 解放された機能名と説明を表示
- タップで閉じる
