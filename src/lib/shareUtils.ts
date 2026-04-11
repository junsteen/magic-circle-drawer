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