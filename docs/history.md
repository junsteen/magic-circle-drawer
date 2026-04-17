# 📜 History/Completion System

## Overview
The history and completion system tracks user progress, saves drawing attempts, and manages achievement data for the Arcane Tracer application.

## Modules

### historyDB.ts
Handles saving and retrieving drawing history records using IndexedDB.

#### Data Structures

##### MagicCircleData
```typescript
interface MagicCircleData {
  seed: number;                           // Random seed used for pattern generation
  pattern: {                              // The pattern that was attempted
    name: string;
    vertices: Point[];
    edges: Edge[];
    circles: CircleDef[];
  };
  drawLogs: DrawStroke[];                 // Recording of user's drawing strokes
  timestamp: number;                      // When the drawing was made
}
```

##### MagicCircleHistory (stored record)
```typescript
interface MagicCircleHistory extends MagicCircleData {
  id: string;                             // Unique identifier
  score: number;                          // 0-100 score
  rank: string;                           // S/A/B/C rank
  difficulty: string;                     // EASY/NORMAL/HARD/EXPERT label
  difficultyMultiplier: number;           // From DIFFICULTY_MULTIPLIER
  damageMultiplier: number;               // Numeric damage multiplier
  thumbnail?: string;                     // Data URL of canvas snapshot
  createdAt: number;                      // When record was created
}
```

#### Functions
- `addHistory(historyItem: MagicCircleHistory): Promise<void>` - Save a drawing attempt
- `getHistory(limit?: number): Promise<MagicCircleHistory[]>` - Retrieve recent history
- `deleteHistory(id: string): Promise<void>` - Remove a specific history item
- `clearHistory(): Promise<void>` - Delete all history records

### completionDB.ts
Tracks which patterns users have successfully completed and at what skill level.

#### Functions
- `updateCompletion(patternName: string, score: number, rank: string): Promise<void>` - Mark pattern as completed if score meets threshold
- `isPatternCompleted(patternName: string): Promise<boolean>` - Check if pattern is completed
- `getCompletedCount(): Promise<number>` - Get count of completed patterns
- `getTotalPatternsCount(): Promise<number>` - Get total number of unique patterns attempted
- `resetCompletion(): Promise<void>` - Clear all completion data

## Completion Logic
A pattern is considered "completed" when:
- User achieves a score of 70 or higher (Rank A or better)
- This threshold ensures users demonstrate reasonable proficiency before marking a pattern as mastered

## Usage in Application

### In useMagicCircle Hook
1. On initialization: Load completion status and update UI
2. After successful drawing (score ≥ 70): 
   - Call `updateCompletion()` to record achievement
   - Refresh completion status
   - Notify parent component via `onCompletionUpdate` callback
3. UI displays progress: "魔法陣修得: X / Y" with celebration when complete

### History Features
- **Replay**: Save drawing strokes to replay later
- **Sharing**: Compress history data for URL sharing
- **Editing**: Reload previous attempts to try again
- **Persistence**: Data survives browser sessions via IndexedDB

## Storage Details
- Uses IndexedDB via `idb` wrapper library
- Database name: `magicCircleDB`
- Object stores: 
  - `history`: Stores MagicCircleHistory records
  - `completion`: Stores completed pattern names with best scores
- Automatic versioning and schema management

## Example Usage
```typescript
// Saving a drawing
import { addHistory } from '@/lib/historyDB';
import { updateCompletion, isPatternCompleted } from '@/lib/completionDB';

const historyItem: MagicCircleHistory = {
  // ... populated from drawing session
};

await addHistory(historyItem);

if (historyItem.score >= 70) {
  await updateCompletion(historyItem.pattern.name, historyItem.score, historyItem.rank);
}

// Loading history
import { getHistory } from '@/lib/historyDB';

const recentDrawings = await getHistory(10); // Get 10 most recent
```

## Backup and Migration
- History data is browser-specific (not synced across devices)
- Users can export/import via sharing functionality
- Clearing website data will delete all history and progress