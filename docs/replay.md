# ▶️ Replay System

## Overview
The replay system allows users to view, share, and relive their magic circle drawings. It enables sharing drawings via URL parameters and provides an interactive replay experience.

## Core Components

### Replay Page (`/app/replay/page.tsx`)
The dedicated route for viewing shared drawings. It handles:
- URL parameter parsing (`?data=compressed_string`)
- Data decompression and validation
- Error handling for invalid or missing data
- Displaying the HistoryDetail component for replay
- Navigation back to home when closing

### HistoryDetail Component (`src/components/HistoryDetail.tsx`)
Responsible for displaying a specific drawing record and providing replay functionality.

## Data Flow

1. **Sharing**:
   - User completes a drawing and taps replay/share button
   - `handleReplay()` in useMagicCircle hook:
     - Evaluates drawing if not already scored
     - Creates history item with drawing data, score, and metadata
     - Compresses data using `compressForUrlOptimized()`
     - Navigates to `/replay?data=compressed_string`

2. **Replay Viewing**:
   - User visits shared URL (e.g., `https://app.domain.com/replay?data=abc123`)
   - ReplayPage extracts `data` parameter from URL
   - Data is decompressed using `decompressFromUrlOptimized()`
   - Validated decompressed data is passed to HistoryDetail
   - HistoryDetail displays the drawing and provides replay controls

3. **Replay Playback**:
   - HistoryDetail shows the drawing information
   - Users can replay the drawing stroke-by-stroke
   - Option to "Re-edit" (reload the drawing into the main canvas)
   - Option to close and return to home

## Technical Details

### URL Format
```
/replay?data={LZString-compressed-encoded-data}
```

### Data Structure (Optimized for Sharing)
When compressing for URL sharing, the data is optimized:
```javascript
{
  p: {                    // pattern
    n: string,           // name
    v: [{x:number, y:number}], // vertices (rounded to 2 decimal places)
    e: [{from:number, to:number}], // edges
    c: [{cx:number, cy:number, r:number}] // circles (cx,cy as 0-1000 ints, r rounded)
  },
  d: [{                  // drawLogs (strokes)
    [{                   // stroke (array of events)
      x:number, y:number, t:number, ty:'s'|'m'|'e' // type mapped: start->s, move->m, end->e
    }]
  }],
  s: number,             // score (0-100)
  r: string,             // rank ('S'|'A'|'B'|'C')
  dif: string,           // difficulty ('EASY'|'NORMAL'|'HARD'|'EXPERT')
  difM: number,          // difficultyMultiplier (x10 for 1 decimal place)
  dmgM: string           // damageMultiplier (e.g., '120%')
}
```

### Replay Mechanics
The HistoryDetail component uses the replay functionality from useMagicCircle:
- Sets `savedMagicData` to load the drawing strokes
- Uses `handleLoadData()` to populate the canvas with the drawing
- Provides replay button that triggers `handleReplay()` to create a new history item
- Shows detailed information: score, rank, pattern name, difficulty, timestamp

## Features

### Sharing
- **URL-based sharing**: No server storage required
- **Cross-platform**: Works on any device that can open the URL
- **Persistent**: Drawings can be revisited anytime via the same link
- **Compact**: Optimized compression keeps URLs reasonably short

### Replay Viewing
- **Complete metadata**: Shows score, rank, difficulty, and pattern info
- **Visual reproduction**: Exact stroke-by-stroke replay
- **Timestamp**: Shows when the original drawing was made
- **Thumbnail**: If available, shows canvas snapshot

### Interaction Options
- **Replay**: Watch the drawing being recreated
- **Re-edit**: Load the drawing into main canvas to trace again
- **Close**: Return to home screen

## Error Handling
- **Missing data parameter**: Shows error and provides home button
- **Invalid/decompression fails**: Shows corruption error
- **Missing required fields**: Validates data structure before use
- **Network/issues**: Graceful degradation with clear messaging

## Integration Points

### From Main Canvas
- `useMagicCircle.handleReplay()`: Initiates sharing process
- `useMagicCircle.handleLoadData()`: Loads shared drawing into canvas
- URL sync: Replay page reads `?data=` parameter on mount

### History System
- Replay creates history records via `addHistory()`
- Shared drawings are also stored in IndexedDB for persistence
- HistoryDetail can edit/replay existing history records

### UI/UX
- Replay page uses full-screen layout with dark background
- Loading spinner during data decompression
- Error states with clear messaging and recovery options
- Mobile-friendly touch controls
- Consistent styling with main application

## Performance Considerations
- Decompression happens during page load (acceptable delay)
- Replay uses existing canvas animation infrastructure
- No additional storage burden on sharing (URL contains all data)
- Optimized compression minimizes URL length

## Security & Privacy
- No personal data included in drawings
- Drawings only shared when user explicitly initiates
- No server storage of shared content (client-side only)
- Users control distribution via URL sharing
- Thumbnails are canvas snapshots, not camera captures

## Usage Example

### Sharing a Drawing
```typescript
// In useMagicCircle hook after drawing completion
const historyItem = {
  id: `history_${Date.now()}_${Math.random()}`,
  data: {
    seed: 123456,
    pattern: { /* pattern data */ },
    drawLogs: [ /* user's drawing strokes */ ],
    timestamp: Date.now()
  },
  score: 85,
  rank: 'A',
  difficulty: 'NORMAL',
  difficultyMultiplier: 1.0,
  damageMultiplier: '100%',
  thumbnail: 'data:image/png;base64,...',
  createdAt: Date.now()
};

// Compress for sharing
const compressed = compressForUrlOptimized({
  pattern: historyItem.data.pattern,
  drawLogs: historyItem.data.drawLogs,
  score: historyItem.score,
  rank: historyItem.rank,
  difficulty: historyItem.difficulty,
  difficultyMultiplier: 1.0,
  damageMultiplier: historyItem.damageMultiplier
});

// Navigate to share URL
router.push(`/replay?data=${compressed}`);
```

### Receiving a Shared Drawing
```typescript
// In ReplayPage.useEffect
const dataParam = searchParams.get('data');
const drawingData = decompressFromUrlOptimized<MagicCircleHistory>(dataParam);
// drawingData now contains all info to display and replay
```

## Future Enhancements
1. **Direct Sharing**: Integrate with Web Share API for native sharing dialogs
2. **Replay Controls**: Add playback speed control, pause/resume
3. **Comments/Annotations**: Allow adding text to shared drawings
4. **Collections**: Ability to save and share groups of drawings
5. **Embedding**: Provide HTML snippet for embedding replays in websites
6. **Offline Sharing**: Support for sharing via NFC, Bluetooth, etc.
7. **Replay Comparison**: Side-by-side replay of multiple attempts