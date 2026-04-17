# 📜 ヒストリ/完了システム

## 概要
ヒストリと完了システムは、ユーザーの進行状況を追跡し、描画の試行を保存し、Arcane Tracerアプリケーションの達成データを管理します。

## モジュール

### historyDB.ts
IndexedDBを使用して描画ヒストリーレコードの保存と取得を処理します。

#### データ構造

##### MagicCircleData
```typescript
interface MagicCircleData {
  seed: number;                           // パターン生成に使用されるランダムシード
  pattern: {                              // 試行されたパターン
    name: string;
    vertices: Point[];
    edges: Edge[];
    circles: CircleDef[];
  };
  drawLogs: DrawStroke[];                 // ユーザーの描画ストロークの記録
  timestamp: number;                      // 描画が行われた時間
}
```

##### MagicCircleHistory (保存されるレコード)
```typescript
interface MagicCircleHistory extends MagicCircleData {
  id: string;                             // 一意の識別子
  score: number;                          // 0-100スコア
  rank: string;                           // S/A/B/Cランク
  difficulty: string;                     // EASY/NORMAL/HARD/EXPERTラベル
  difficultyMultiplier: number;           // DIFFICULTY_MULTIPLIERから
  damageMultiplier: number;               // 数値ダメージ倍率
  thumbnail?: string;                     // キャンバススナップショットのデータURL
  createdAt: number;                      // レコードが作成された時間
}
```

#### 関数
- `addHistory(historyItem: MagicCircleHistory): Promise<void>` - 描画の試行を保存
- `getHistory(limit?: number): Promise<MagicCircleHistory[]>` - 最近のヒストリを取得
- `deleteHistory(id: string): Promise<void>` - 特定のヒストリ項目を削除
- `clearHistory(): Promise<void>` - すべてのヒストリレコードを削除

### completionDB.ts
ユーザーがどの程度のスキルレベルでパターンを正常に完了したかを追跡します。

#### 関数
- `updateCompletion(patternName: string, score: number, rank: string): Promise<void>` - スコアがしきい値を満たす場合、パターンを完了としてマーク
- `isPatternCompleted(patternName: string): Promise<boolean>` - パターンが完了しているかチェック
- `getCompletedCount(): Promise<number>` - 完了したパターンの数を取得
- `getTotalPatternsCount(): Promise<number>` - 試行されたユニークパターンの総数を取得
- `resetCompletion(): Promise<void>` - すべての完了データをクリア

## 完了ロジック
パターンは以下の条件を満たすとき「完了」とみなされます:
- ユーザーが70以上のスコアを達成（ランクA以上）
- このしきい値により、ユーザーがパターンをマスターとしてマークする前に十分な熟練度を示すことが保証されます

## アプリケーションでの使用方法

### useMagicCircle フック内
1. 初期化時に: 完了状況をロードし、UIを更新
2. 成功した描画後（スコア ≥ 70）: 
   - `updateCompletion()`を呼び出して達成を記録
   - 完了状況を更新
   - `onCompletionUpdate`コールバックを介して親コンポーネントに通知
3. UIは進行状況を表示: "魔法陣修得: X / Y" および完了時に祝福を表示

### ヒストリ機能
- **リプレイ**: 後で再生するために描画ストロークを保存
- **共有**: URL共有のためにヒストリデータを圧縮
- **編集**: 以前の試行を再度読み込んでやり直し
- **永続性**: IndexedDBを介してブラウザセッション間でデータが生存

## ストレージ詳細
- `idb`ラッパーライブラリを使用したIndexedDB
- データベース名: `magicCircleDB`
- オブジェクトストア: 
  - `history`: MagicCircleHistoryレコードを保存
  - `completion`: 最良スコアとともに完了したパターン名を保存
- 自動バージョニングとスキーマ管理

## 使用例
```typescript
// 描画を保存する
import { addHistory } from '@/lib/historyDB';
import { updateCompletion, isPatternCompleted } from '@/lib/completionDB';

const historyItem: MagicCircleHistory = {
  // ... 描画セッションから入力されたデータ
};

await addHistory(historyItem);

if (historyItem.score >= 70) {
  await updateCompletion(historyItem.pattern.name, historyItem.score, historyItem.rank);
}

// ヒストリをロードする
import { getHistory } from '@/lib/historyDB';

const recentDrawings = await getHistory(10); // 最新の10件を取得
```

## バックアップと移行
- ヒストリデータはブラウザ固有（デバイス間で同期されない）
- ユーザーは共有機能を介してエクスポート/インポート可能
- ウェブサイトデータをクリアすると、すべてのヒストリと進行状況が削除される