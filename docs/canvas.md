# 🎨 Canvas/Drawing Core (MagicCircleCanvas)

## Overview
The `MagicCircleCanvas` component is the heart of the Arcane Tracer application, responsible for rendering the drawing canvas, handling user input, managing the drawing state, and coordinating with the scoring system.

## Key Responsibilities
- Render HTML5 canvas for drawing magic circles
- Handle touch/pointer events for drawing
- Manage drawing state (active, completed, showing results)
- Coordinate with pattern system and scoring
- Provide replay functionality
- Manage UI overlays (help, tutorial, history)

## Interface
```typescript
interface MagicCircleCanvasProps {
  onScore: (result: ScoringResult) => void;
  onReset: () => void;
  initialDifficulty: Difficulty;
  onLoadDataRef?: (loadFn: (data: MagicCircleData) => void) => void;
  onCompletionUpdate?: (status: { completed: number; total: number } | null) => void;
}
```

## Features
### Drawing Mechanics
- Uses Pointer Events API for cross-device touch/mouse support
- Real-time stroke rendering with visual feedback
- Automatic path smoothing and optimization

### State Management
- `isDrawing`: Tracks if user is currently drawing
- `isActive`: Tracks if drawing session is timed and active
- `showResult`: Controls result display visibility
- `timeLeft`: Countdown timer based on difficulty

### Replay System
- Captures drawing strokes for later playback
- Generates thumbnail previews
- Shares drawings via URL compression

### UI Components Integrated
- HelpModal: Instructions and controls guide
- HistoryPanel: Browse past drawings
- HistoryDetail: Detailed view of specific drawings
- TutorialOverlay: Animated tutorial for new users
- TutorialCanvasAnimation: Demonstrates pattern drawing

## Data Flow
1. User touches canvas → `onPointerDown` starts drawing
2. User moves finger → `onPointerMove` records path points
3. User lifts finger → `onPointerUp` ends stroke
4. User taps "詠唱完了!" → `handleEvaluate` triggers scoring
5. Score calculated → `onScore` callback sends result to parent
6. Result displayed → User can replay or get new pattern

## Dependencies
- `useMagicCircle` hook: Core drawing logic and state
- Pattern system: Provides template patterns to trace
- Scoring system: Evaluates drawing accuracy
- History system: Saves and retrieves drawings
- Voice activation: Optional voice-controlled evaluation

## Performance Considerations
- Uses requestAnimationFrame for smooth replay
- Limits vertex checking for complex patterns
- Optimizes path storage for replay functionality
- Efficient canvas clearing and redrawing