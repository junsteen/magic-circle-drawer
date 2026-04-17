import LZString from 'lz-string';

/**
 * データをURL共有用に圧縮
 * @param data - URL用に圧縮およびエンコードするオブジェクト
 * @returns URLセーフな圧縮文字列
 */
export function compressForUrl(data: unknown): string {
  try {
    const jsonStr = JSON.stringify(data);
    return LZString.compressToEncodedURIComponent(jsonStr);
  } catch (error) {
    console.error('URL用データ圧縮に失敗:', error);
    return '';
  }
}

/**
 * URLからデータを解凍
 * @param compressed - URLセーフな圧縮文字列
 * @returns 解凍されたオブジェクトまたは失敗時はnull
 */
export function decompressFromUrl<T>(compressed: string): T | null {
  try {
    if (!compressed) return null;
    const jsonStr = LZString.decompressFromEncodedURIComponent(compressed);
    if (!jsonStr) return null;
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.error('URLデータ解凍に失敗:', error);
    return null;
  }
}

/**
 * 魔法陣データ共有用の最適化圧縮
 * フィールド名を短縮し数値精度を最適化することでJSONサイズを削減
 */
export function compressForUrlOptimized(data: {
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
}): string {
  try {
    // 短縮フィールド名を使用した最適化構造を作成
    const optimized = {
      p: {
        n: data.pattern.name,
        v: data.pattern.vertices.map(v => ({
          x: Math.round(v.x * 100) / 100, // 小数点以下2桁
          y: Math.round(v.y * 100) / 100
        })),
        e: data.pattern.edges,
        c: data.pattern.circles.map(c => ({
          cx: Number((c.cx * 1000).toFixed(3)), // 0-1範囲の小数点以下3桁
          cy: Number((c.cy * 1000).toFixed(3)),
          r: Math.round(c.radius * 10) / 10 // 半径の小数点以下1桁
        }))
      },
      d: data.drawLogs.map(stroke =>
        stroke.map(event => ({
          x: Math.round(event.x * 100) / 100,
          y: Math.round(event.y * 100) / 100,
          t: event.t, // タイムスタンプは整数のまま保持
          // イベントタイプを単一文字にマッピング
          ty: event.type === 'start' ? 's' : event.type === 'move' ? 'm' : 'e'
        }))
      ),
      s: data.score,
      r: data.rank,
      dif: data.difficulty,
      difM: Number((data.difficultyMultiplier * 10).toFixed(1)), // 小数点以下1桁
      dmgM: data.damageMultiplier
    };

    const jsonStr = JSON.stringify(optimized);
    return LZString.compressToEncodedURIComponent(jsonStr);
  } catch (error) {
    console.error('URL用データ圧縮に失敗:', error);
    return '';
  }
}

/**
 * 魔法陣データ共有用の最適化解凍
 * 後方互換性のため最適化形式とレガシー形式の両方を処理
 * @param compressed - URLセーフな圧縮文字列
 * @returns 解凍されたオブジェクトまたは失敗時はnull
 */
export function decompressFromUrlOptimized<T>(compressed: string): T | null {
  try {
    if (!compressed) return null;
    const jsonStr = LZString.decompressFromEncodedURIComponent(compressed);
    if (!jsonStr) return null;
    
    const parsed = JSON.parse(jsonStr);
    
    // フォーマットを検出: 最適化形式は単一文字キー(p, d, s, rなど)
    // レガシー形式は完全なプロパティ名(pattern, drawLogs, score, rankなど)
    const isOptimizedFormat = !!parsed.p && !!parsed.d;
    
    if (isOptimizedFormat) {
      // 最適化構造から変換
      const decompressed = {
        pattern: {
          name: parsed.p.n,
          vertices: parsed.p.v.map((v: {x: number; y: number}) => ({
            x: v.x,
            y: v.y
          })),
          edges: parsed.p.e,
          circles: parsed.p.c.map((c: {cx: number; cy: number; r: number}) => ({
            cx: c.cx / 1000, // 0-1000から0-1範囲に戻す
            cy: c.cy / 1000,
            radius: c.r
          }))
        },
        drawLogs: parsed.d.map((stroke: any[]) =>
          stroke.map((event: any) => ({
            x: event.x,
            y: event.y,
            t: event.t,
            type: event.ty === 's' ? 'start' : event.ty === 'm' ? 'move' : 'end' as const
          }))
        ),
        score: parsed.s,
        rank: parsed.r,
        difficulty: parsed.dif,
        difficultyMultiplier: parsed.difM / 10, // 10分の1から戻す
        damageMultiplier: parsed.dmgM
      };
      
      return decompressed as T;
    } else {
      // レガシー形式 - 元のインターフェースに合致するようにそのまま返す
      return parsed as T;
    }
  } catch (error) {
    console.error('URLデータ解凍に失敗:', error);
    return null;
  }
}