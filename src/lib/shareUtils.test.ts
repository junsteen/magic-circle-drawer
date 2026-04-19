import { describe, expect, test } from 'vitest';
import { compressForUrl, decompressFromUrl, compressForUrlOptimized, decompressFromUrlOptimized } from './shareUtils';

// Test data simulating what gets shared
const testData = {
  pattern: {
    name: '五芒星',
    vertices: [
      { x: 100, y: 50 },
      { x: 150, y: 120 },
      { x: 200, y: 200 },
      { x: 50, y: 180 },
      { x: 180, y: 180 }
    ],
    edges: [
      { from: 0, to: 2 },
      { from: 2, to: 4 },
      { from: 4, to: 1 },
      { from: 1, to: 3 },
      { from: 3, to: 0 }
    ],
    circles: [
      { cx: 0.5, cy: 0.5, radius: 100 },
      { cx: 0.5, cy: 0.5, radius: 80 }
    ]
  },
  drawLogs: [
    [
      { x: 100, y: 50, t: 0, type: 'start' as const },
      { x: 110, y: 55, t: 100, type: 'move' as const },
      { x: 120, y: 60, t: 200, type: 'move' as const },
      { x: 130, y: 70, t: 300, type: 'end' as const }
    ],
    [
      { x: 150, y: 120, t: 400, type: 'start' as const },
      { x: 160, y: 130, t: 500, type: 'move' as const },
      { x: 170, y: 140, t: 600, type: 'end' as const }
    ]
  ],
  score: 95,
  rank: 'S',
  difficulty: 'hard',
  difficultyMultiplier: 1.3,
  damageMultiplier: '2.0x'
};

describe('shareUtils.ts', () => {
  test('should compress and decompress data correctly', () => {
    const originalJson = JSON.stringify(testData);
    
    // Test original compression
    const compressedOriginal = compressForUrl(testData);
    expect(compressedOriginal.length).toBeLessThan(originalJson.length);
    
    // Test optimized compression
    const compressedOptimized = compressForUrlOptimized(testData);
    expect(compressedOptimized.length).toBeLessThan(compressedOriginal.length);
    
    // Test decompression for both
    const decompressedOriginal = decompressFromUrl<typeof testData>(compressedOriginal);
    expect(decompressedOriginal).not.toBeNull();
    if (decompressedOriginal) {
      expect(JSON.stringify(decompressedOriginal)).toBe(JSON.stringify(testData));
    }
    
    const decompressedOptimized = decompressFromUrlOptimized<typeof testData>(compressedOptimized);
    expect(decompressedOptimized).not.toBeNull();
    if (decompressedOptimized) {
      expect(JSON.stringify(decompressedOptimized)).toBe(JSON.stringify(testData));
    }
  });
});