# 🧪 テスト

## 概要
このドキュメントでは、Arcane Tracerアプリケーションで機能を確保し、回帰を防ぐために使用されているテストアプローチとテストファイルについて説明します。

## テストファイル

### shareUtils.test.ts (`src/lib/shareUtils.test.ts`)
シェアユーティリティのデータ圧縮機能の機能を紹介するデモンストレーション/テストファイル。

#### 目的
このファイルは以下の両方の目的で機能します:
1. 圧縮/解凍アルゴリズムの機能テスト
2. 最適化によるサイズ節約のデモンストレーション
3. 圧縮サイクル全体を通じたデータ整合性の確認方法

#### テストデータ構造
テストでは以下のサンプル魔法陣描画を使用しています:
- **パターン**: 五芒星 (Pentagram) で5つの頂点
- **エッジ**: 星型パターンの接続 (0→2→4→1→3→0)
- **円**: 2つの同心円
- **DrawLogs**: start/move/endイベントを持つ2つのストローク
- **スコア**: 95 (Sランク)
- **難易度**: hard (1.3倍 multiplier)
- **ダメージマルチプライヤー**: "2.0x"

#### テストプロセス
1. **ベースライン測定**: 元のJSONサイズを計算
2. **元の圧縮**: `compressForUrl()`と`decompressFromUrl()`をテスト
3. **最適化圧縮**: `compressForUrlOptimized()`と`decompressFromUrlOptimized()`をテスト
4. **比率比較**: パーセンテージでのサイズ削減を表示
5. **改善計算**: 最適化が元の圧縮よりどれだけ小さいかを表示
6. **整合性チェック**: 解凍されたデータが元のデータと完全に一致するかを確認

#### サンプル出力
実行すると、テストは以下のような出力を生成します:
```
Testing share data compression...
Original JSON size: 523
Original compressed size: 142
Original compression ratio: 72.85%
Optimized compressed size: 96
Optimized compression ratio: 81.64
Improvement: 32.39% smaller
Original decompression successful: true
Original data integrity check: true
Optimized decompression successful: true
Optimized data integrity check: true
```

#### 示された主要メトリクス
- **圧縮比**: 元のサイズからのパーセンテージ削減
- **サイズ節約**: 節約された絶対バイト数
- **改善**: 標準圧縮と比較した最適化による追加の節約
- **データ整合性**: 文字列比較による100%の精度確認

## テストアプローチ

### 手動検証
現在、テストは主に以下を通じて手動で行われています:
1. **視覚検査**: UIの動作と出力をチェック
2. **コンソールロギング**: shareUtils.test.tsのようなテストファイルを使用して結果を出力
3. **ブラウザテスト**: デバイスとブラウザ間での手動検証
4. **エッジケーステスト**: 境界条件とエラー状態の試行

### 自動テストの考慮事項
将来の拡張として、プロジェクトでは以下を組み込むことができます:
1. **ユニットテストフレームワーク**: lib関数のためのJestまたはVitest
2. **コンポーネントテスト**: UIコンポーネントのためのReact Testing Library
3. **E2Eテスト**: ユーザーフローのためのCypressまたはPlaywright
4. **テストスクリプト**: すべてのテストを実行するためのnpm testコマンド
5. **CI統合**: プッシュ時の自動テストのためのGitHub Actions

## テストによってカバーされる領域
shareUtilsテストは以下を具体的に検証します:
- **データ圧縮**: 標準および最適化の両方の方法
- **往復整合性**: 圧縮 → 解凍が元のデータを生むか
- **サイズ効率**: 測定可能な圧縮の利点
- **後方互換性**: 最適化フォーマットがレガシーデータを検出して処理するか
- **エラーハンドリング**: 無効な入力に対するグレースフルな失敗

## テストガイドライン

### テストを追加するタイミング
1. **新機能**: 新しいlib関数または複雑なロジックに対してテストを追加
2. **バグ修正**: 再発を防ぐために回帰テストを追加
3. **複雑なアルゴリズム**: スコアリング、パターン生成、圧縮をテスト
4. **エッジケース**: 極端または異常な入力での動作を検証

### テストすべきもの
1. **純粋関数**: スコアリング、パターン生成、数学ユーティリティ
2. **ユーティリティ関数**: データ変換、圧縮、フォーマット
3. **状態遷移**: フックロジックと状態変更
4. **統合ポイント**: モジュールがどのように連携するか

### テストの整理
- 実装とともにテストを保持 (`*.test.ts`)
- 期待される動作を示す説明的なテスト名を使用
- 成功パスと失敗パスの両方をテスト
- 必要に応じて外部依存関係をモック
- 実装よりも動作に焦点を当てる

## テストの実行方法
現在、shareUtilsテストを実行するには:
```bash
# Node.jsを直接使用
ts-node src/lib/shareUtils.test.ts

# またはコンパイルして実行
tsc src/lib/shareUtils.test.ts
node src/lib/shareUtils.test.js
```

## 今後のテスト戦略
1. **ユニットテスト**: 個々の関数を孤立してテスト
2. **スナップショットテスト**: UIコンポーネントと複雑なオブジェクトのために
3. **ビジュアル回帰**: スタイルとレイアウトの変更のために
4. **パフォーマンステスト**: 最適化がパフォーマンスを劣化させないことを確認
5. **アクセシビリティテスト**: ARIAラベル、コントラスト、キーボードナビゲーションを検証
6. **PWAテスト**: オフライン機能とインストール可能性を検証

## 現在の制限事項
- 正式なテストフレームワークが設定されていない
- テストは手動で実行する必要がある
- テストカバレッジが限られている（主にshareUtils）
- CI/CDでの自動テスト実行がない
- テストカバレッジレポートがない

## 拡張のための推奨事項
1. **Jest/Vitestを追加**: TypeScriptサポート付きのテストフレームワークを設定
2. **テストカバレッジを拡大**: スコアリング、パターン、フックのためのテストを追加
3. **テストスクリプトを追加**: package.jsonに`"test": "vitest"`を追加
4. **CIをセットアップ**: プッシュ/PR時のテストを実行するためにGitHub Actionsを追加
5. **テストレポートを追加**: カバレッジレポートを設定
6. **テストを文書化**: テストの作成方法についての貢献ガイドラインを追加

## 例のテスト構造（将来のもの）
```typescript
// スコアリング関数の例のテスト
import { describe, it, expect } from 'vitest'
import { calculateScore } from '@/lib/scoring'
import type { MagicCirclePattern } from '@/lib/patterns'

describe('calculateScore', () => {
  it('should return S rank for perfect tracing', () => {
    // 配置
    const pattern: MagicCirclePattern = { /* ... */ }
    const userPath = pattern.vertices.map(v => ({ x: v.x, y: v.y }))
    
    // 実行
    const result = calculateScore(userPath, pattern, 1.0)
    
    // アサーション
    expect(result.rank).toBe('S')
    expect(result.score).toBeGreaterThanOrEqual(90)
  })
})
```

## 結論
現在のところshareUtils用のデモンストレーションテストのみに制限されていますが、このテスト基盤は正確性を確認し、最適化の影響を測定することへのコミットメントを示しています。このアプローチをコードベースの他の部分に拡張することで、信頼性と保守性が大幅に向上します。