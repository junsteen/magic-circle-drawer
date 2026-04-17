# 🎣 Hooks

## Overview
This document covers the custom React hooks used in the Arcane Tracer application to encapsulate reusable logic and state management.

## Custom Hooks

### useMagicCircle (`src/hooks/useMagicCircle.ts`)
The main hook that encapsulates all the core logic for the magic circle drawing canvas.

#### Returns
```typescript
interface UseMagicCircleReturn {
  // Canvas references and state
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasSize: number;
  isDrawing: boolean;
  userPath: { x: number; y: number }[];
  timeLeft: number;
  isActive: boolean;
  showResult: boolean;
  scoreResult: ScoringResult | null;
  debugMsg: string;
  setDebugMsg: (msg: string) => void;
  
  // Pattern information
  startPoint: { x: number; y: number };
  patternName: string;
  currentIndex: number;
  totalPatterns: number;
  difficulty: Difficulty;
  difficultyLabel: string;
  
  // Event handlers
  handleEvaluate: () => void;
  handleReset: () => void;
  handleNext: () => void;
  handlePrevious: () => void;
  changeDifficulty: (d: Difficulty) => void;
  getRankColor: (rank: string) => string;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  
  // Replay functionality
  drawLogs: DrawStroke[];
  savedMagicData: MagicCircleData | null;
  isReplaying: boolean;
  handleReplay: () => void;
  handleSaveData: () => MagicCircleData | null;
  handleLoadData: (data: MagicCircleData) => void;
  
  // Progress tracking
  completionStatus: { completed: number; total: number } | null;
  
  // Voice activation
  voiceActivation: {
    isMicAccessible: boolean;
    isListening: boolean;
    startListening: () => Promise<void>;
    stopListening: () => void;
  } | null;
  setVoiceActivation: (activation: {
    isMicAccessible: boolean;
    isListening: boolean;
    startListening: () => Promise<void>;
    stopListening: () => void;
  } | null) => void;
}
```

#### Parameters
- `onScore`: Callback when a drawing is evaluated
- `onReset`: Callback when drawing is reset
- `onCompletionUpdate`: Optional callback when completion status changes

#### Features Encapsulated
1. **Drawing State Management**:
   - Tracking drawing status (`isDrawing`, `isActive`, `showResult`)
   - Managing user path points
   - Handling canvas pointer events

2. **Timer System**:
   - Countdown based on difficulty
   - Automatic timeout handling
   - Timer reset on difficulty/pattern changes

3. **Pattern Management**:
   - Loading preset patterns
   - Generating random patterns
   - Navigating between patterns (next/previous)
   - Changing difficulty levels

4. **Scoring Integration**:
   - Evaluating drawings using scoring system
   - Managing score results and rankings
   - Updating completion status

5. **Replay System**:
   - Recording drawing strokes
   - Saving/loading drawing data
   - Replay functionality with history saving
   - URL sharing integration

6. **Completion Tracking**:
   - Monitoring which patterns have been mastered
   - Synchronizing completion status with parent component

7. **Voice Activation**:
   - Integrating voice control for hands-free evaluation
   - Managing microphone access and listening state

#### Usage
```typescript
import { useMagicCircle } from '@/hooks/useMagicCircle';

function MagicCircleCanvas({ /* props */ }) {
  const {
    canvasRef,
    isDrawing,
    userPath,
    // ... all other returned properties
  } = useMagicCircle(onScore, onReset, onCompletionUpdate);
  
  // Use returned properties and handlers in JSX
  return (
    <canvas 
      ref={canvasRef}
      // ... other props
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}
```

### useVoiceActivation (`src/hooks/useVoiceActivation.ts`)
A hook for voice activity detection using the Web Audio API.

#### Returns
```typescript
{
  isMicAccessible: boolean;   // Whether microphone permission granted
  isListening: boolean;       // Currently detecting voice
  startListening: () => Promise<void>;  // Start voice detection
  stopListening: () => void;  // Stop voice detection
}
```

#### Parameters
- `onVoiceDetected`: Callback when voice is detected
- `options`: Configuration object with:
  - `threshold`: Voice detection sensitivity (0-1, default: 0.1)
  - `silentTime`: Milliseconds of silence to end detection (default: 500)
  - `checkInterval`: Not used (checking via requestAnimationFrame)

#### Features
- Microphone access management
- Audio context creation and cleanup
- Real-time audio level analysis
- Voice activity detection with configurable sensitivity
- Silence detection to end listening state
- Proper resource cleanup on unmount
- Error handling for missing browser APIs

#### Usage
```typescript
import { useVoiceActivation } from '@/hooks/useVoiceActivation';

function SomeComponent() {
  const { isMicAccessible, isListening, startListening, stopListening } = 
    useVoiceActivation(() => {
      // Voice detected - trigger action
      console.log('Voice detected!');
    }, {
      threshold: 0.15, // More sensitive
      silentTime: 800  // Longer silence tolerance
    });
    
  return (
    <button onClick={isListening ? stopListening : startListening}>
      {isListening ? '🔇 Listening' : '🔊 Activate Voice'}
    </button>
  );
}
```

## Hook Design Patterns

### State Encapsulation
Both hooks encapsulate complex state logic that would otherwise clutter component code:
- Multiple related state variables managed together
- Complex initialization and cleanup logic
- Event handler creation with proper callbacks

### Separation of Concerns
- `useMagicCircle`: Handles drawing, scoring, timing, replay
- `useVoiceActivation`: Handles audio input and voice detection
- Components remain focused on UI rendering and user interaction

### Performance Considerations
- Proper use of `useCallback` to prevent unnecessary re-renders
- Cleanup functions in `useEffect` to prevent memory leaks
- Expensive calculations deferred or memoized where appropriate
- Animation frames properly cancelled

### Error Handling
- Graceful degradation when browser APIs unavailable
- Clear error states and debugging messages
- Resource cleanup even when errors occur
- User-friendly feedback for common issues (mic denied, etc.)

## Dependencies
- `useMagicCircle` depends on:
  - `useVoiceActivation` (nested hook)
  - Various lib functions (scoring, patterns, history, etc.)
  - Next.js router for navigation in replay feature
- `useVoiceActivation` depends only on browser Web APIs

## Testing Considerations
- Hooks are designed to be testable with React Hooks Testing Library
- External dependencies can be mocked (lib functions, router)
- Browser API mocking needed for voice activation tests
- Focus on testing the returned state and functions rather than internal implementation