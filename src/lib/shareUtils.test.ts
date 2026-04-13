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

describe('shareUtils functions', () => {
  it('should compress and decompress data using original algorithm', () => {
    // Test original compression
    const compressed = compressForUrl(testData);
    expect(compressed).toBeDefined();
    expect(typeof compressed).toBe('string');
    expect(compressed.length).toBeGreaterThan(0);
    
    // Test decompression
    const decompressed = decompressFromUrl(compressed);
    expect(decompressed).toBeDefined();
    expect(decompressed).not.toBeNull();
    
    // Test data integrity
    if (decompressed) {
      expect(decompressed.pattern.name).toBe(testData.pattern.name);
      expect(decompressed.drawLogs).toHaveLength(testData.drawLogs.length);
    }
  });
  
  it('should compress and decompress data using optimized algorithm', () => {
    // Test optimized compression
    const compressed = compressForUrlOptimized(testData);
    expect(compressed).toBeDefined();
    expect(typeof compressed).toBe('string');
    expect(compressed.length).toBeGreaterThan(0);
    
    // Test decompression
    const decompressed = decompressFromUrlOptimized(compressed);
    expect(decompressed).toBeDefined();
    expect(decompressed).not.toBeNull();
    
    // Test data integrity
    if (decompressed) {
      expect(decompressed.pattern.name).toBe(testData.pattern.name);
      expect(decompressed.drawLogs).toHaveLength(testData.drawLogs.length);
    }
  });
  
  it('should produce smaller output with optimized compression', () => {
    const compressedOriginal = compressForUrl(testData);
    const compressedOptimized = compressForUrlOptimized(testData);
    
    // Optimized version should be smaller or equal
    expect(compressedOptimized.length).toBeLessThanOrEqual(compressedOriginal.length);
  });
  
  it('should handle empty data gracefully', () => {
    const emptyData = {
      pattern: {
        name: '',
        vertices: [],
        edges: [],
        circles: []
      },
      drawLogs: [],
      score: 0,
      rank: '',
      difficulty: '',
      difficultyMultiplier: 0,
      damageMultiplier: ''
    };
    
    const compressed = compressForUrl(emptyData);
    expect(compressed).toBeDefined();
    
    const decompressed = decompressFromUrl(compressed);
    expect(decompressed).toBeDefined();
  });
});