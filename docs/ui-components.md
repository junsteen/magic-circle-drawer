# 🧩 UIコンポーネント

## 概要
このドキュメントでは、Arcane Tracerアプリケーション全体で使用されている再利用可能なUIコンポーネントについて説明します。モーダル、パネル、およびインタラクティブな要素を含みます。

## コンポーネント

### HelpModal (`src/components/HelpModal.tsx`)
操作説明とスコア情報を表示するモーダルダイアログ。

#### プロップス
```typescript
interface HelpModalProps {
  onClose: () => void; // ユーザーがモーダルを閉じたときのコールバック
}
```

#### 特徴
- クリックで閉じるフルスクリーンのダークバックドロップ
- 丸みを帯びた境界とグラデーションアクセントを持つ中央のカード
- 番号インディケーター付きのステップバイステップの説明
- ランクのしきい値とダメージ倍率を表示するスコアの内訳
- チュートリアルオーバーレイと一貫したスタイリング
- タッチフレンドリーな閉じるボタン

#### 使用方法
```typescript
import HelpModal from '@/components/HelpModal';
import { useState } from 'react';

const [showHelp, setShowHelp] = useState(false);

// JSX内:
{showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
// トリガー方法:
<button onClick={() => setShowHelp(true)}>?</button>
```

### HistoryPanel (`src/components/HistoryPanel.tsx`)
共有機能を備えたユーザーの描画ヒストリを表示するボトムシートパネル。

#### プロップス
```typescript
interface HistoryPanelProps {
  isOpen: boolean;        // パネルが表示されているかどうか
  onClose: () => void;    // パネルが閉じられたときのコールバック
  onSelect: (history: MagicCircleHistory) => void; // アイテムが選択されたときのコールバック
}
```

#### 特徴
- サムネイルを表示するグリッドレイアウト
- サムネイルのランクバッジ（S/A/B/Cで色分け）
- タイムスタンプ表示（相対時間のように「5分前」）
- Web Share APIフォールバックをクリップボードコピーに備えたシェアボタン
- ヒストリアイテムを削除するための削除ボタン
- ローディング状態と空の状態の処理
- レスポンシブグリッド（画面サイズに基づいて2-4列）
- スムーズなアニメーションとホバーエフェクト

#### 表示されるデータ
- パターン名（長すぎる場合は切り捨て）
- 作成タイムスタンプ
- ランクインディケーター（色分けされたバッジ）
- サムネイルプレビューまたはマジックサークル絵文字
- シェアと削除コントロール

#### 使用方法
```typescript
import HistoryPanel from '@/components/HistoryPanel';
import { useState } from 'react';

const [showHistory, setShowHistory] = useState(false);

// JSX内:
<HistoryPanel
  isOpen={showHistory}
  onClose={() => setShowHistory(false)}
  onSelect={handleHistorySelect}
/>
// トリガー方法:
<button onClick={() => setShowHistory(true)}>📜</button>
```

### HistoryDetail (`src/components/HistoryDetail.tsx`)
特定の描画の詳細情報を表示し、リプレイ機能を提供するモーダルダイアログ。

#### プロップス
```typescript
interface HistoryDetailProps {
  history: MagicCircleHistory | null; // 表示するヒストリアイテム
  onClose: () => void;                // モーダルが閉じられたときのコールバック
  onReEdit: (data: MagicCircleData) => void; // ユーザーが再描画したいときのコールバック
}
```

#### 特徴
- フルスクリーンのダークバックドロップ
- 詳細な描画情報:
  - パターン名
  - スコアとランク
  - 難易度レベル
  - ダメージ倍率
  - タイムスタンプ
  - サムネイルプレビュー（利用可能な場合）
- 描画の再生を視聴するリプレイボタン
- 描画をメインキャンバスに再ロードする再編集ボタン
- モーダルを閉じる閉じるボタン
- 欠落しているデータのエラーハンドリング

#### 使用方法
```typescript
import HistoryDetail from '@/components/HistoryDetail';
import { useState } from 'react';

const [selectedHistory, setSelectedHistory] = useState<MagicCircleHistory | null>(null);

// JSX内:
<HistoryDetail
  history={selectedHistory}
  onClose={() => setSelectedHistory(null)}
  onReEdit={handleReEdit}
/>
// トリガー方法:
<HistoryPanel onSelect={(history) => setSelectedHistory(history)} />
```

## スタイリングの一貫性
すべてのUIコンポーネントは共通のスタイリングテーマを共有しています:
- ダークバックグラウンド（高度な要素については`#0d0d1a`または`#0a0a14`）
- マジックシアン（`#00e5ff`）とパープル（`#7c4dff`）パレットからのアクセントカラー
- `linear-gradient(135deg, #00e5ff, #7c4dff)`を使用したグラデーションボタン
- 丸みを帯びた角（`rounded-lg`、`rounded-xl`、`rounded-full`）
- 奥行きを出すための控えめな境界とシャドウ
- 一貫したタイポグラフィとスペーシング
- タッチフレンドリーな最小ターゲットサイズ

## アニメーションとインタラクション
- CSS変換と不透明度を使用したオープン/クローズのスムーズなトランジション
- ボタンとインタラクティブな要素のホバー状態
- スケール遷移によるプレスフィードバック
- 必要に応じたローディングスピナーとスケルトン状態
- 一時的な色変更による成功/エラー状態の視覚フィードバック

## アクセシビリティに関する考慮事項
- テキストとアイコントの適切なコントラスト比
- タッチターゲットサイズ ≥ 48x48dp
- インタラクティブな要素の明確な視覚的指示
- 該当する場合は意味のあるHTML構造
- モーダルでのフォーカス管理（強化の余地あり）
- アイコン専用ボタンのARIAラベル

## パフォーマンスに関する注意点
- コンポーネントは軽量に設計されている
- HistoryPanelは大きなリストに対して効率的なレンダリングを使用
- 画像はレイアウトシフトを防ぐためにnext/imageまたは適切なサイズを使用
- イベント伝播は正しく処理されている（必要に応じてstopPropagationを使用）
- useEffectの戻り値関数でのサブスクリプションとタイマーのクリーンアップ