# 🔺 パターンシステム (patterns.ts)

## 概要
パターンシステムは、ユーザーがなぞることができるすべての魔法陣テンプレートを定義します。プリセットパターン（幾何学的形状、シンボル）と手順的に生成されるランダムパターンを含みます。

## コアデータ構造

### Point
```typescript
interface Point {
  x: number; // キャンバスのX座標
  y: number; // キャンバスのY座標
}
```

### Edge
```typescript
interface Edge {
  from: number; // 頂点配列での開始頂点のインデックス
  to: number;   // 頂点配列での終了頂点のインデックス
}
```

### CircleDef
```typescript
interface CircleDef {
  cx: number; // 相対X中心（0-1、0.5 = キャンバス中心）
  cy: number; // 相対Y中心（0-1、0.5 = キャンバス中心）
  radius: number; // ピクセル単位の半径
}
```

### MagicCirclePattern
```typescript
interface MagicCirclePattern {
  name: string;           // パターンの表示名
  vertices: Point[];      // 角/制御点の配列
  edges: Edge[];          // 頂点間の接続
  circles: CircleDef[];   // 装飾用の補助円
  vertexCount: number;    // 頂点の数
  edgeCount: number;      // エッジの数
  circleCount: number;    // 円の数
}
```

## プリセットパターン
システムには9つの事前定義されたパターンが含まれます:

1. **三角形 (Triangle)** - 基本的な3辺の多角形
2. **五芒星 (Pentagram)** - 5つの点を持つ星
3. **六芒星 (Hexagram)** - ダビデの星（2つの重なった三角形）
4. **円 (Circle)** - 60点で近似された円
5. **複合魔法陣 (Complex Magic Circle)** - 内部接続を持つ8点の星
6. **八芒星 (Octagram)** - 8点の星
7. **三重円 (Triple Circle)** - 3つの同心円
8. **五重星結界 (Pentagram Seal)** - 外部五角形フレームを持つ五芒星
9. **魔方陣風 (Magic Square Style)** - 3x3グリッドパターン

## パターン生成

### createPresetPattern(canvasSize)
指定されたキャンバスサイズにすべてのプリセットパターンをスケーリングして生成します。
- パターンをキャンバスの中心に配置
- 基本半径として canvasSize * 0.35 を使用してスケーリング
- MagicCirclePattern オブジェクトの配列を返す

### generateRandomPattern(config)
難易度に基づいて手続き的に生成されるパターンを作成:
```typescript
interface RandomPatternConfig {
  difficulty: Difficulty;   // easy, normal, hard, expert
  canvasSize: number;       // キャンバスの寸法
}
```

#### 難易度ベースの生成
- **Easy**: 3つの頂点、1つの円
- **Normal**: 3-5つの頂点、1-2つの円
- **Hard**: 4-6つの頂点、1-3つの円
- **Expert**: 5-9つの頂点、1-3つの円 + 追加のエッジ

#### 特徴
- 難易度範囲内でのランダムな頂点数
- ポリゴンまたは星型のエッジの選択
- エキスパート難易度での追加ランダムエッジ
- スケールされた半径変動（基準の85%-115%）
- 動的命名: "Lv.[難易度] #[番号]"

## ヘルパー関数

### 頂点生成
- `regularPolygonVertices(cx, cy, radius, n)`: 円上に等間隔の点を作成
- `polygonEdges(n)`: 連続する頂点を結ぶエッジを作成（閉じた形状）
- `starEdges(n, step)`: 頂点をスキップして星型パターンを作成
- `generateEdgePoints(vertices, edges, pointsPerEdge)`: エッジに沿った点をサンプリングしてレンダリング

### テンプレートユーティリティ
- `getPatternVerticesForTemplate(pattern)`: 生の頂点を返す
- `getPatternTemplatePoints(pattern, pointsPerEdge)`: エッジに沿ったサンプリング点を返して衝突検出を行う

## 使用例

### 現在のパターンを取得
```typescript
const currentPattern = patterns[currentIdx];
const patternName = currentPattern?.name ?? '';
```

### テンプレートを描画
```typescript
// キャンバスレンダリング内で
drawTemplate(pattern, highlight); // 頂点、エッジ、および円を描画
```

### スコアリング
```typescript
// スコアリング関数にパターンを渡す
const result = calculateScore(userPath, pattern, difficultyTolerance);
```

## 設計ノート

### 座標系
- 原点(0,0)はキャンバスの左上隅
- 中心は(canvasSize/2, canvasSize/2)
- Y軸は下方向に増加（標準のキャンバス座標）

### スケーリング
すべてのパターンはキャンバスサイズに比例してスケーリングされます
基本半径 = canvasSize * 0.35
パターンはキャンバスの寸法に関係なくアスペクト比を維持

### パフォーマンス
- プリセットパターンは初期化時に一度計算
- ランダムパターンは必要に応じてオンデマンドで生成
- エッジサンプリングにより衝突検出の精度を調整可能
- 複雑なパターンは頂点サンプリングを使用してパフォーマンス問題を回避