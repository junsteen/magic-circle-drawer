# 🎣 フック

## 概要
このドキュメントでは、Arcane Tracerアプリケーションで使用されているカスタムReactフックについて説明します。これらのフックは、再利用可能なロジックと状態管理をカプセル化します。

## カスタムフック

### useMagicCircle (`src/hooks/useMagicCircle.ts`)
魔法陣描画キャンバスのコアロジック全体をカプセル化するメインフック。

#### 戻り値
```typescript
interface UseMagicCircleReturn {
  // キャンバス参照と状態
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasSize: number;
  isDrawing: boolean;
  userPath: { x: number; y: number }[];
  timeLeft: number;
  isActive: boolean;
  showResult: boolean;
  scoreResult: ScoringResult | null;
  debugMsg: string;
  setDebugMsg: (msg: string) => void;
  
  // パターン情報
  startPoint: { x: number; y: number };
  patternName: string;
  currentIndex: number;
  totalPatterns: number;
  difficulty: Difficulty;
  difficultyLabel: string;
  
  // イベントハンドラー
  handleEvaluate: () => void;
  handleReset: () => void;
  handleNext: () => void;
  handlePrevious: () => void;
  changeDifficulty: (d: Difficulty) => void;
  getRankColor: (rank: string) => string;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  
  // リプレイ機能
  drawLogs: DrawStroke[];
  savedMagicData: MagicCircleData | null;
  isReplaying: boolean;
  handleReplay: () => void;
  handleSaveData: () => MagicCircleData | null;
  handleLoadData: (data: MagicCircleData) => void;
  
  // 進捗追跡
  completionStatus: { completed: number; total: number } | null;
  
  // 音声アクティベーション
  voiceActivation: {
    isMicAccessible: boolean;
    isListening: boolean;
    startListening: () => Promise<void>;
    stopListening: () => void;
  } | null;
  setVoiceActivation: (activation: {
    isMicAccessible: boolean;
    isListening: boolean;
    startListening: () => Promise<void>;
    stopListening: () => void;
  } | null) => void;
}
```

#### パラメータ
- `onScore`: 描画が評価されたときのコールバック
- `onReset`: 描画がリセットされたときのコールバック
- `onCompletionUpdate`: 完了状況が変更されたときのオプションのコールバック

#### カプセル化された機能
1. **描画状態管理**:
   - 描画ステータスの追跡（`isDrawing`、`isActive`、`showResult`）
   - ユーザーパスポイントの管理
   - キャンバスポインターエベントの処理

2. **タイマーシステム**:
   - 難易度に基づくカウントダウン
   - 自動タイムアウト処理
   - 難易度/パターン変更時のタイマー reset

3. **パターン管理**:
   - プリセットパターンのロード
   - ランダムパターンの生成
   - パターン間のナビゲーション（次へ/前へ）
   - 難易度レベルの変更

4. **スコアリング統合**:
   - スコアリングシステムを使用した描画の評価
   - スコア結果とランクの管理
   - 完了ステータスの更新

5. **リプレイシステム**:
   - 描画ストロークの記録
   - 描画データの保存/読み込み
   - ヒストリ保存を伴うリプレイ機能
   - URL共有統合

6. **完了追跡**:
   - マスターされたパターンの監視
   - 親コンポーネントとの完了ステータスの同期

7. **音声アクティベーション**:
   - ハンズフリー評価のための音声制御の統合
   - マイクアクセスとリスニング状態の管理

#### 使用方法
```typescript
import { useMagicCircle } from '@/hooks/useMagicCircle';

function MagicCircleCanvas({ /* props */ }) {
  const {
    canvasRef,
    isDrawing,
    userPath,
    // ... すべてのその他の戻り値プロパティ
  } = useMagicCircle(onScore, onReset, onCompletionUpdate);
  
  // 戻り値のプロパティとハンドラーをJSXで使用
  return (
    <canvas 
      ref={canvasRef}
      // ... その他のプロップス
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}
```

### useVoiceActivation (`src/hooks/useVoiceActivation.ts`)
Web Audio APIを使用した音声アクティビティ検出のためのフック。

#### 戻り値
```typescript
{
  isMicAccessible: boolean;   // マイクアクセス許可が付与されたかどうか
  isListening: boolean;       // 現在音声を検出しているかどうか
  startListening: () => Promise<void>;  // 音声検出を開始
  stopListening: () => void;  // 音声検出を停止
}
```

#### パラメータ
- `onVoiceDetected`: 音声が検出されたときのコールバック
- `options`: 以下を含む設定オブジェクト:
  - `threshold`: 音声検知の感度 (0-1、デフォルト: 0.1)
  - `silentTime`: 音声終了と判定する無音時間（ミリ秒、デフォルト: 500）
  - `checkInterval`: 使用されていない（requestAnimationFrameによるチェックが発生）

#### 機能
- マイクアクセス管理
- オーディオコンテキストの作成とクリーンアップ
- リアルタイムオーディオレベル分析
- 設定可能な感度による音声アクティビティ検出
- サイレンス検出によるリスニング状態の終了
- アンマウント時の適切なリソースクリーンアップ
- ブラウザAPIが利用できない場合のエラーハンドリング

#### 使用方法
```typescript
import { useVoiceActivation } from '@/hooks/useVoiceActivation';

function SomeComponent() {
  const { isMicAccessible, isListening, startListening, stopListening } = 
    useVoiceActivation(() => {
      // 音声が検出されたとき - アクションをトリガー
      console.log('音声が検出されました！');
    }, {
      threshold: 0.15, // より敏感に設定
      silentTime: 800  // 長いサイレンス許容時間
    });
    
  return (
    <button onClick={isListening ? stopListening : startListening}>
      {isListening ? '🔇 リスニング中' : '🔊 音声アクティベート'}
    </button>
  );
}
```

## フックデザインパターン

### 状態のカプセル化
両方のフックは、コンポーネントコードをごちゃごちゃにさせずに複雑な状態ロジックをカプセル化します:
- 複数の関連する状態変数を一緒に管理
- 複雑な初期化とクリーンアップロジック
- 適切なコールバックを伴うイベントハンドラーの作成

### 関心の分離
- `useMagicCircle`: 描画、スコアリング、タイミング、リプレイを処理
- `useVoiceActivation`: オーディオ入力と音声検出を処理
- コンポーネントはUIレンダリングとユーザーインタラクションに焦点を当てたままにする

### パフォーマンス考慮事項
- 必要のない再レンダーを防ぐために`useCallback`を適切に使用
- メモリリークを防ぐために`useEffect`のクリーンアップ関数を使用
- 適切な場所で高価な計算を延期またはメモ化
- アニメーションフレームを適切にキャンセル

### エラーハンドリング
- ブラウザAPIが利用できない場合のグレースフルデグラデーション
- 明確なエラー状態とデバッグメッセージ
- エラーが発生してもリソースのクリーンアップ
- 一般的な問題（マイク拒否など）に対するユーザーフレンドリーなフィードバック

## 依存関係
- `useMagicCircle` は以下に依存:
  - `useVoiceActivation` (ネストされたフック)
  - 各種ライブラリ関数（スコアリング、パターン、ヒストリなど）
  - リプレイ機能でのナビゲーションのためのNext.jsルーター
- `useVoiceActivation` はブラウザのWeb APIのみに依存

## テストに関する考慮事項
- フックはReact Hooks Testing Libraryを使用してテスト可能に設計
- 外部依存関係はモック可能（ライブラリ関数、ルーターなど）
- ボイスアクティベーションのテストにはブラウザAPIのモックが必要
- 内部実装よりも戻り値の状態と関数のテストに焦点を当てる