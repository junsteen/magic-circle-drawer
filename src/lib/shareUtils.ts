import LZString from 'lz-string';

/**
 * Compress data for URL sharing
 * @param data - Object to compress and encode for URL
 * @returns URL-safe compressed string
 */
export function compressForUrl(data: unknown): string {
  try {
    const jsonStr = JSON.stringify(data);
    return LZString.compressToEncodedURIComponent(jsonStr);
  } catch (error) {
    console.error('Failed to compress data for URL:', error);
    return '';
  }
}

/**
 * Decompress data from URL
 * @param compressed - URL-safe compressed string
 * @returns Decompressed object or null if failed
 */
export function decompressFromUrl<T>(compressed: string): T | null {
  try {
    if (!compressed) return null;
    const jsonStr = LZString.decompressFromEncodedURIComponent(compressed);
    if (!jsonStr) return null;
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.error('Failed to decompress data from URL:', error);
    return null;
  }
}

/**
 * Optimized compression for sharing magic circle data
 * Reduces JSON size by using shorter field names and optimized number precision
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
    // Create optimized structure with shorter field names
    const optimized = {
      p: {
        n: data.pattern.name,
        v: data.pattern.vertices.map(v => ({
          x: Math.round(v.x * 100) / 100, // 2 decimal places
          y: Math.round(v.y * 100) / 100
        })),
        e: data.pattern.edges,
        c: data.pattern.circles.map(c => ({
          cx: Number((c.cx * 1000).toFixed(3)), // 3 decimal places for 0-1 range
          cy: Number((c.cy * 1000).toFixed(3)),
          r: Math.round(c.radius * 10) / 10 // 1 decimal place for radius
        }))
      },
      d: data.drawLogs.map(stroke =>
        stroke.map(event => ({
          x: Math.round(event.x * 100) / 100,
          y: Math.round(event.y * 100) / 100,
          t: event.t, // Keep timestamps as integers
          // Map event types to single characters
          ty: event.type === 'start' ? 's' : event.type === 'move' ? 'm' : 'e'
        }))
      ),
      s: data.score,
      r: data.rank,
      dif: data.difficulty,
      difM: Number((data.difficultyMultiplier * 10).toFixed(1)), // 1 decimal place
      dmgM: data.damageMultiplier
    };

    const jsonStr = JSON.stringify(optimized);
    return LZString.compressToEncodedURIComponent(jsonStr);
  } catch (error) {
    console.error('Failed to compress data for URL:', error);
    return '';
  }
}

/**
 * Optimized decompression for sharing magic circle data
 * Handles both optimized and legacy formats for backward compatibility
 * @param compressed - URL-safe compressed string
 * @returns Decompressed object or null if failed
 */
export function decompressFromUrlOptimized<T>(compressed: string): T | null {
  try {
    if (!compressed) return null;
    const jsonStr = LZString.decompressFromEncodedURIComponent(compressed);
    if (!jsonStr) return null;
    
    const parsed = JSON.parse(jsonStr);
    
    // Detect format: optimized format has single-letter keys (p, d, s, r, etc.)
    // Legacy format has full property names (pattern, drawLogs, score, rank, etc.)
    const isOptimizedFormat = !!parsed.p && !!parsed.d;
    
    if (isOptimizedFormat) {
      // Convert back from optimized structure
      const decompressed = {
        pattern: {
          name: parsed.p.n,
          vertices: parsed.p.v.map((v: {x: number; y: number}) => ({
            x: v.x,
            y: v.y
          })),
          edges: parsed.p.e,
          circles: parsed.p.c.map((c: {cx: number; cy: number; r: number}) => ({
            cx: c.cx / 1000, // Convert back from 0-1000 to 0-1 range
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
        difficultyMultiplier: parsed.difM / 10, // Convert back from tenths
        damageMultiplier: parsed.dmgM
      };
      
      return decompressed as T;
    } else {
      // Legacy format - return as-is (should match original interface)
      return parsed as T;
    }
  } catch (error) {
    console.error('Failed to decompress data from URL:', error);
    return null;
  }
}