import LZString from 'lz-string';

/**
 * データをURL共有用に圧縮
 * @param data - URL用に圧縮およびエンコードするオブジェクト
 * @returns URLセーフな圧縮文字列
 */
export function compressForUrl(data: unknown): string {
  try {
    const jsonStr = JSON.stringify(data);
    // encodeURIComponent で + や $ を %2B / %24 に変換しURLセーフにする
    return encodeURIComponent(LZString.compressToEncodedURIComponent(jsonStr));
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
    if (!compressed || typeof compressed !== 'string') return null;
    // compressForUrl が encodeURIComponent で二重エンコードした場合に対応
    // URLSearchParams.get() 経由の場合は既に一度デコード済みのため no-op になる
    const decoded = compressed.includes('%') ? decodeURIComponent(compressed) : compressed;
    const jsonStr = LZString.decompressFromEncodedURIComponent(decoded);

    // jsonStr が空でないことを確認
    if (!jsonStr || jsonStr.trim() === '') {
      console.warn('URLデータの解凍結果が空です');
      return null;
    }

    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.error('URLデータ解凍に失敗:', error);
    return null;
  }
}

/**
 * 魔法陣データ共有用の最適化圧縮 (v2)
 * v1からの改善点：
 * - タイムスタンプをストローク内デルタ値に変換（大幅なバイト削減）
 * - 座標を整数（*1000）で保存（小数点排除）
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
  createdAt?: number;
}): string {
  try {
    const optimized = {
      v: 2, // フォーマットバージョン
      p: {
        n: data.pattern.name,
        v: data.pattern.vertices.map(v => ({
          x: Math.round(v.x * 100) / 100,
          y: Math.round(v.y * 100) / 100
        })),
        e: data.pattern.edges,
        c: data.pattern.circles.map(c => ({
          cx: Number((c.cx * 1000).toFixed(3)),
          cy: Number((c.cy * 1000).toFixed(3)),
          r: Math.round(c.radius * 10) / 10
        }))
      },
      // タイムスタンプをデルタ化、座標を整数化（小数点排除）
      d: data.drawLogs.map(stroke =>
        stroke.map((event, i) => ({
          x: Math.round(event.x * 1000),
          y: Math.round(event.y * 1000),
          t: i === 0 ? event.t : event.t - stroke[i - 1].t, // デルタタイムスタンプ
          ty: event.type === 'start' ? 's' : event.type === 'move' ? 'm' : 'e'
        }))
      ),
      s: data.score,
      r: data.rank,
      dif: data.difficulty,
      difM: Number((data.difficultyMultiplier * 10).toFixed(1)),
      dmgM: data.damageMultiplier,
      ca: data.createdAt
    };

    const jsonStr = JSON.stringify(optimized);
    return encodeURIComponent(LZString.compressToEncodedURIComponent(jsonStr));
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
    if (!compressed || typeof compressed !== 'string') return null;
    // compressForUrlOptimized が encodeURIComponent で二重エンコードした場合に対応
    const decoded = compressed.includes('%') ? decodeURIComponent(compressed) : compressed;
    const jsonStr = LZString.decompressFromEncodedURIComponent(decoded);

    // jsonStr が空でないことを確認
    if (!jsonStr || jsonStr.trim() === '') {
      console.warn('URLデータの解凍結果が空です');
      return null;
    }

    const parsed = JSON.parse(jsonStr);

    // フォーマットを検出: 最適化形式は単一文字キー(p, d, s, rなど)
    // レガシー形式は完全なプロパティ名(pattern, drawLogs, score, rankなど)
    const isOptimizedFormat = !!parsed.p && !!parsed.d;

    if (isOptimizedFormat) {
      const isV2 = parsed.v === 2;

      const decompressed = {
        pattern: {
          name: parsed.p.n,
          vertices: parsed.p.v.map((v: {x: number; y: number}) => ({ x: v.x, y: v.y })),
          edges: parsed.p.e,
          circles: parsed.p.c.map((c: {cx: number; cy: number; r: number}) => ({
            cx: c.cx / 1000,
            cy: c.cy / 1000,
            radius: c.r
          }))
        },
        drawLogs: (parsed.d as Array<Array<{ x: number; y: number; t: number; ty: string }>>).map(stroke => {
          let absTime = 0;
          return stroke.map((event, i) => {
            if (isV2) {
              // v2: 座標を1/1000に戻す、タイムスタンプをデルタから絶対値に復元
              absTime = i === 0 ? event.t : absTime + event.t;
              return {
                x: event.x / 1000,
                y: event.y / 1000,
                t: absTime,
                type: event.ty === 's' ? 'start' : event.ty === 'm' ? 'move' : 'end' as const
              };
            }
            // v1: 座標はそのまま、タイムスタンプは絶対値
            return {
              x: event.x,
              y: event.y,
              t: event.t,
              type: event.ty === 's' ? 'start' : event.ty === 'm' ? 'move' : 'end' as const
            };
          });
        }),
        score: parsed.s,
        rank: parsed.r,
        difficulty: parsed.dif,
        difficultyMultiplier: parsed.difM / 10,
        damageMultiplier: parsed.dmgM,
        createdAt: parsed.ca
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