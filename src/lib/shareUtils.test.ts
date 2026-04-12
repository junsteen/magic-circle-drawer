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

console.log('Testing share data compression...');
const originalJson = JSON.stringify(testData);
console.log('Original JSON size:', originalJson.length);

// Test original compression
const compressedOriginal = compressForUrl(testData);
console.log('Original compressed size:', compressedOriginal.length);
console.log('Original compression ratio:', (1 - compressedOriginal.length / originalJson.length) * 100 + '%');

// Test optimized compression
const compressedOptimized = compressForUrlOptimized(testData);
console.log('Optimized compressed size:', compressedOptimized.length);
console.log('Optimized compression ratio:', (1 - compressedOptimized.length / originalJson.length) * 100 + '');
console.log('Improvement:', ((compressedOriginal.length - compressedOptimized.length) / compressedOriginal.length * 100).toFixed(2) + '% smaller');

// Test decompression for both
const decompressedOriginal = decompressFromUrl<typeof testData>(compressedOriginal);
console.log('Original decompression successful:', !!decompressedOriginal);
if (decompressedOriginal) {
  console.log('Original data integrity check:', JSON.stringify(decompressedOriginal) === JSON.stringify(testData));
}

const decompressedOptimized = decompressFromUrlOptimized<typeof testData>(compressedOptimized);
console.log('Optimized decompression successful:', !!decompressedOptimized);
if (decompressedOptimized) {
  console.log('Optimized data integrity check:', JSON.stringify(decompressedOptimized) === JSON.stringify(testData));
}