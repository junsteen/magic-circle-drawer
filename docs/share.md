# 📤 Share/Export Functionality (shareUtils.ts)

## Overview
The share utilities enable users to save, share, and reload their magic circle drawings through URL compression and web sharing APIs. This feature allows players to preserve their achievements and share them with others.

## Core Functions

### URL Compression System
The system uses LZString library to compress drawing data into URL-safe strings, allowing sharing via web links.

#### compressForUrl(data)
- General purpose compression for any JSON-serializable data
- Converts object to JSON string, then compresses for URL use
- Returns URL-safe compressed string

#### decompressFromUrl<T>(compressed)
- Decompresses URL-safe string back to original object
- Generic type parameter for type safety
- Returns null if decompression fails

### Optimized Magic Circle Compression
Specialized functions for compressing magic circle drawing data with size optimizations.

#### compressForUrlOptimized(data)
Compresses magic circle data with these optimizations:
1. **Shorter field names**: Single-letter keys in JSON (p, d, s, r, etc.)
2. **Reduced precision**: 
   - Vertex coordinates: 2 decimal places
   - Circle centers: 3 decimal places (0-1 range)
   - Circle radii: 1 decimal place
   - Difficulty multipliers: 1 decimal place
3. **Event type mapping**: 
   - 'start' → 's'
   - 'move' → 'm' 
   - 'end' → 'e'
4. **Timestamp preservation**: Keeps draw event timestamps as integers

Input format:
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
- Automatically detects optimized vs legacy format
- Converts optimized format back to full structure
- Handles backward compatibility with older compressed data
- Returns null if decompression fails

## Data Structures

### DrawStroke & DrawEvent
```typescript
type DrawStroke = DrawEvent[];

interface DrawEvent {
  x: number;      // X coordinate
  y: number;      // Y coordinate
  t: number;      // Timestamp (milliseconds)
  type: 'start' | 'move' | 'end'; // Pointer event type
}
```

### MagicCircleData
```typescript
interface MagicCircleData {
  seed: number;                           // Random seed for pattern regeneration
  pattern: {                              // The pattern being drawn
    name: string;
    vertices: Point[];
    edges: Edge[];
    circles: CircleDef[];
  };
  drawLogs: DrawStroke[];                 // Recording of user's drawing
  timestamp: number;                      // When drawing was made
}
```

### MagicCircleHistory (for sharing)
Includes all MagicCircleData plus:
- score: number (0-100)
- rank: string ('S'|'A'|'B'|'C')
- difficulty: string ('EASY'|'NORMAL'|'HARD'|'EXPERT')
- difficultyMultiplier: number
- damageMultiplier: string
- thumbnail?: string (Data URL)
- createdAt: number

## Usage Examples

### Saving a Drawing for Sharing
```typescript
import { compressForUrlOptimized } from '@/lib/shareUtils';

// Prepare data from drawing session
const dataToShare = {
  pattern: currentPatternData,
  drawLogs: userDrawingStrokes,
  score: currentScore,
  rank: currentRank,
  difficulty: difficultyLabel,
  difficultyMultiplier: difficultyMult,
  damageMultiplier: damageMultStr
};

// Compress for URL
const compressed = compressForUrlOptimized(dataToShare);
if (compressed) {
  const shareUrl = `${window.location.origin}/replay?data=${compressed}`;
  // Use Web Share API or copy to clipboard
}
```

### Loading Shared Data
```typescript
import { decompressFromUrlOptimized } from '@/lib/shareUtils';
import { useRouter } from 'next/navigation';

// In replay page
const router = useRouter();
const { data } = router.query;

if (typeof data === 'string') {
  const drawingData = decompressFromUrlOptimized(data);
  if (drawingData) {
    // Load into canvas via handleLoadData()
  }
}
```

### Web Share API Integration
```typescript
import { share } from '@/lib/shareUtils'; // Assuming wrapper exists

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
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareData.url);
    }
  } catch (err) {
    console.error('Share failed:', err);
  }
}
```

## Size Optimization Results
Typical compression ratios:
- Raw JSON: ~3-5KB for complex drawing
- Standard LZString compression: ~1-2KB
- Optimized compression: ~0.5-1.5KB
- Final URL parameter: ~0.7-2KB (after URL encoding)

This allows sharing even complex drawings within reasonable URL length limits (< 8KB recommended for browser compatibility).

## Browser Compatibility
- Requires LZString library (included as dependency)
- Works in all modern browsers that support:
  - LocalStorage/IndexedDB (for fallback)
  - URL encoding/decoding
  - Basic JSON parsing
- Web Share API requires HTTPS and is mobile-focused
- Fallback to clipboard copying works universally

## Error Handling
- Invalid or corrupted compressed data returns null
- Graceful degradation when compression fails
- Input validation prevents crashes from malformed data
- Console logging for debugging compression issues

## Security Considerations
- Only shares data explicitly provided by user
- No personal information included in drawings
- Thumbnails are canvas snapshots, not camera images
- URL-based sharing puts data client-side (no server storage)
- Users control what they share and when

## Integration Points
1. **MagicCircleCanvas**:
   - `handleReplay()`: Compresses and shares when saving replay
   - `handleSaveData()`: Saves drawing locally
   - `handleLoadData()`: Loads drawing from shared data
   - URL sync: Reads `?data=` parameter on page load

2. **Replay Page** (`/app/replay/page.tsx`):
   - Parses URL parameter
   - Decompresses and displays shared drawings
   - Allows replaying others' performances

3. **UI Components**:
   - Share button in score overlay
   - Import/export functionality in history panels