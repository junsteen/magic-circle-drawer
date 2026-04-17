# 🎨 キャンバス/描画コア (MagicCircleCanvas)

## 概要
`MagicCircleCanvas` コンポーネントは Arcane Tracer アプリケーションの中心であり、描画キャンバスのレンダリング、ユーザー入力の処理、描画状態の管理、スコアリングシステムとの調整を担当します。

## 主な責任
- HTML5キャンバスをレンダリングして魔法陣を描画
- タッチ/ポインターエベントを処理して描画
- 描画状態を管理（アクティブ、完了、結果表示）
- パターンシステムとスコアリングシステムと調整
- リプレイ機能を提供
- UIオーバーレイを管理（ヘルプ、チュートリアル、履歴）

## インターフェース
```typescript
interface MagicCircleCanvasProps {
  onScore: (result: ScoringResult) => void;
  onReset: () => void;
  initialDifficulty: Difficulty;
  onLoadDataRef?: (loadFn: (data: MagicCircleData) => void) => void;
  onCompletionUpdate?: (status: { completed: number; total: number } | null) => void;
}
```

## 特徴
### 描画メカニズム
- ポインターエベントAPIを使用してクロスデバイスのタッチ/マウスサポートを実現
- ビジュアルフィードバック付きのリアルタイムストロークレンダリング
- 自動パススムージングと最適化

### 状態管理
- `isDrawing`: ユーザーが現在描画中かどうかを追跡
- `isActive`: 描画セッションが時間制限ありでアクティブかどうかを追跡
- `showResult`: 結果表示の可視性を制御
- `timeLeft`: 難易度に基づくカウントダウンタイマー

### リプレイシステム
- 後で再生するために描画ストロークをキャプチャ
- サムネイルプレビューを生成
- URL圧縮を介して図面を共有

### 統合されたUIコンポーネント
- HelpModal: 操作説明とコントロールガイド
- HistoryPanel: 過去の図面を閲覧
- HistoryDetail: 特定の図面の詳細ビュー
- TutorialOverlay: 新規ユーザー向けのアニメーションチュートリアル
- TutorialCanvasAnimation: パターン描画のデモンストレーション

## データフロー
1. ユーザーがキャンバスにタッチ → `onPointerDown` が描画を開始
2. ユーザーが指を動かす → `onPointerMove` がパスポイントを記録
3. ユーザーが指を離す → `onPointerUp` がストロークを終了
4. ユーザーが "詠唱完了!" をタップ → `handleEvaluate` がスコアリングをトリガー
5. スコアが計算され → `onScore` コールバックが親に結果を送信
6. 結果が表示され → ユーザーはリプレイまたは新しいパターンを取得可能

## 依存関係
- `useMagicCircle` フック: 描画ロジックと状態のコア
- パターンシステム: なぞるためのテンプレートパターンを提供
- スコアリングシステム: 描画の精度を評価
- ヒストリシステム: 図面を保存および取得
- ボイスアクティベーション: オプションの音声制御評価

## パフォーマンス考慮事項
- スムーズなリプレイのために requestAnimationFrame を使用
- 複雑なパターンの頂点チェックを制限
- リプレイ機能のためにパスストレージを最適化
- 効率的なキャンバスクリアと再描画