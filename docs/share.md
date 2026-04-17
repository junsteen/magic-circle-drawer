# 📤 シェア/エクスポート機能 (shareUtils.ts)

## 概要
シェアユーティリティは、URL圧縮とウェブ共有APIを介してユーザーが魔法陣の描画を保存、共有、および再読み込みできるようにします。この機能により、プレイヤーは実績を保存し、他人と共有することができます。

## コア機能

### URL圧縮システム
このシステムは、LZStringライブラリを使用して描画データをURL安全な文字列に圧縮し、ウェブリンク経由での共有を可能にします。

#### compressForUrl(data)
- 任意のJSONシリアライズ可能なデータの一般的な圧縮
- オブジェクトをJSON文字列に変換し、URL用に圧縮
- URL安全な圧縮文字列を返す

#### decompressFromUrl<T>(compressed)
- URL安全な文字列を元のオブジェクトに戻す解凍
- 型安全のためのジェネリックタイプパラメータ
- 解凍に失敗した場合はnullを返す

### 魔法陣描画データの最適化圧縮
サイズ最適化のための魔法陣描画データを圧縮する専門関数。

#### compressForUrlOptimized(data)
魔法陣の描画データを次の最適化で圧縮:
1. **フィールド名の短縮**: JSON内の単一文字キー（p, d, s, r, など）
2. **精度の削減**: 
   - 頂点座標: 2桁の小数点
   - 円の中心: 3桁の小数点（0-1範囲）
   - 円の半径: 1桁の小数点
   - 難易度倍率: 1桁の小数点
3. **イベントタイプのマッピング**: 
   - 'start' → 's'
   - 'move' → 'm' 
   - 'end' → 'e'
4. **タイムスタンプの保持**: 描画イベントのタイムスタンプを整数として保持

入力フォーマット:
```typescript
{
  pattern: {
    name: string;
    vertices: { x: number; y: number }[];
    edges: { from: number; to: number }[];
    circles: { cx: number; cy: number; radius: number }[];
  };
  drawLogs: { x: number; y: number; t: number; type: 'start' | 'move' | 'end' }[][];
  score: number;
  rank: string;
  difficulty: string;
  difficultyMultiplier: number;
  damageMultiplier: string;
}
```

#### decompressFromUrlOptimized<T>(compressed)
- 最適化フォーマットとレガシーフォーマットを自動検出
- 最適化フォーマットを完全な構造に戻す
- 古い圧縮データとの後方互換性を処理
- 解凍に失敗した場合はnullを返す

## データ構造

### DrawStroke & DrawEvent
```typescript
type DrawStroke = DrawEvent[];

interface DrawEvent {
  x: number;      // X座標
  y: number;      // Y座標
  t: number;      // タイムスタンプ（ミリ秒）
  type: 'start' | 'move' | 'end'; // ポインターエベントタイプ
}
```

### MagicCircleData
```typescript
interface MagicCircleData {
  seed: number;                           // パターン再生用のランダムシード
  pattern: {                              // 描画されているパターン
    name: string;
    vertices: Point[];
    edges: Edge[];
    circles: CircleDef[];
  };
  drawLogs: DrawStroke[];                 // ユーザーの描画記録
  timestamp: number;                      // 描画が行われた時間
}
```

### MagicCircleHistory (共有用)
MagicCircleDataに以下を含む:
- score: number (0-100)
- rank: string ('S'|'A'|'B'|'C')
- difficulty: string ('EASY'|'NORMAL'|'HARD'|'EXPERT')
- difficultyMultiplier: number
- damageMultiplier: string
- thumbnail?: string (Data URL)
- createdAt: number

## 使用例

### 共有のために描画を保存
```typescript
import { compressForUrlOptimized } from '@/lib/shareUtils';

// 描画セッションからデータを準備
const dataToShare = {
  pattern: currentPatternData,
  drawLogs: userDrawingStrokes,
  score: currentScore,
  rank: currentRank,
  difficulty: difficultyLabel,
  difficultyMultiplier: difficultyMult,
  damageMultiplier: damageMultStr
};

// URL用に圧縮
const compressed = compressForUrlOptimized(dataToShare);
if (compressed) {
  const shareUrl = `${window.location.origin}/replay?data=${compressed}`;
  // Web Share APIまたはクリップボードにコピーを使用
}
```

### 共有データのロード
```typescript
import { decompressFromUrlOptimized } from '@/lib/shareUtils';
import { useRouter } from 'next/navigation';

// リプレイページ内
const router = useRouter();
const { data } = router.query;

if (typeof data === 'string') {
  const drawingData = decompressFromUrlOptimized(data);
  if (drawingData) {
    // handleLoadData()を介してキャンバスにロード
  }
}
```

### Web Share APIの統合
```typescript
import { share } from '@/lib/shareUtils'; // ラッパーが存在すると仮定

async function handleShare() {
  const compressed = compressForUrlOptimized(drawingData);
  if (!compressed) return;
  
  const shareData = {
    title: `My Magic Circle: ${drawingData.pattern.name}`,
    text: `I scored ${drawingData.score} points! Can you beat it?`,
    url: `${window.location.origin}/replay?data=${compressed}`
  };
  
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      // フォールバック: クリップボードにコピー
      await navigator.clipboard.writeText(shareData.url);
    }
  } catch (err) {
    console.error('Share failed:', err);
  }
}
```

## サイズ最適化結果
典型的な圧縮比:
- 生JSON: 複雑な描画で~3-5KB
- 標準のLZString圧縮: ~1-2KB
- 最適化圧縮: ~0.5-1.5KB
- 最終URLパラメータ: ~0.7-2KB（URLエンコード後）

これにより、ブラウザ互換性のために推奨されるURL長制限（< 8KB）以内でも複雑な描画を共有することが可能になります。

## ブラウザ互換性
- LZStringライブラリを必要とする（依存関係として含まれる）
- 次をサポートするすべてのモダンブラウザで動作:
  - LocalStorage/IndexedDB（フォールバック用）
  - URLエンコード/デコード
  - 基本的なJSONパース
- Web Share APIはHTTPSが必要でモバイルに焦点を当てている
- クリップボードへのコピーへのフォールバックは普遍的に機能する

## エラーハンドリング
- 無効または破損した圧縮データはnullを返す
- 圧縮が失敗したときのグレースフルデグラデーション
- 間違ったデータからのクラッシュを防ぐ入力検証
- 圧縮問題のデバッグのためのコンソールロギング

## セキュリティ考慮事項
- ユーザーが明示的に提供したデータのみを共有
- 描画には個人情報が含まれない
- サムネイルはキャンバススナップショットで、カメラ画像ではない
- URLベースの共有はデータをクライアントサイドに置く（サーバーストレージなし）
- ユーザーは何を共有し、いつ共有するかをコントロールする

## 統合ポイント
1. **MagicCircleCanvas**:
   - `handleReplay()`: リプレイを保存するときに圧縮および共有
   - `handleSaveData()`: 描画をローカルに保存
   - `handleLoadData()`: 共有データから描画をロード
   - URL同期: ページロード時に`?data=`パラメータを読み取り

2. **リプレイページ** (`/app/replay/page.tsx`):
   - URLパラメータをパース
   - 共有された描画を解凍して表示
   - 他のユーザーのパフォーマンスをリプレイ可能

3. **UIコンポーネント**:
   - スコアオーバーレイのシェアボタン
   - ヒストリーパネルのインポート/エクスポート機能