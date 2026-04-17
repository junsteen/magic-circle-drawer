# 🔊 Voice Activation System (useVoiceActivation)

## Overview
The voice activation system allows users to trigger the "詠唱完了!" (chant completion) action using voice input instead of tapping the button. This provides an accessible, hands-free way to evaluate drawings.

## Core Features
- Real-time audio level monitoring using Web Audio API
- Configurable sensitivity and silence detection
- Automatic microphone access management
- Visual feedback for listening state
- Integration with the main drawing canvas via callback

## Implementation Details

### Audio Processing Pipeline
1. **Microphone Access**: Uses `navigator.mediaDevices.getUserMedia({ audio: true })`
2. **Audio Context**: Creates `AudioContext` (with webkit fallback) for audio processing
3. **Analyser Node**: Connects microphone input to `AnalyserNode` for frequency analysis
4. **Volume Calculation**: Computes RMS-like volume from frequency data (0-1 range)
5. **Voice Detection**: Compares volume against threshold to detect speech/sound
6. **Silence Detection**: Tracks time since last voice to determine when speech ends

### Configuration Options
```typescript
{
  threshold?: number;   // Volume threshold for voice detection (0-1, default: 0.1)
  silentTime?: number;  // Milliseconds of silence to consider speech ended (default: 500)
  checkInterval?: number; // Not currently used - checking happens via requestAnimationFrame
}
```

### State Management
- `isMicAccessible`: Whether microphone permission has been granted
- `isListening`: Whether voice is currently being detected (above threshold)
- Internal refs track actual state to prevent redundant state updates

## Usage in MagicCircleCanvas

The voice activation hook is used in `useMagicCircle` to:
1. Initialize voice detection with callback to auto-trigger evaluation
2. Provide microphone control button in UI
3. Show visual indicators for listening state
4. Handle microphone permission errors gracefully

### Integration Points
- Auto-calls `handleEvaluate()` when voice is detected during active drawing
- Button in UI toggles listening state (microphone icon)
- Visual feedback: 
  - Red dot/mic disabled when no mic access
  - Gray mic when available but not listening
  - Green mic when actively listening
  - Tooltip text changes based on state

## Flowchart
```
User Clicks Mic Button
        ↓
requestMicAccess() → getUserMedia()
        ↓
initAudioContext() → Create AudioContext + Analyser
        ↓
startListening() → Begin render loop
        ↓
checkAudioLevel() (via requestAnimationFrame)
        ↓
Analyse frequency data → Calculate volume
        ↓
Volume > threshold? 
        ↓ Yes → Set isListening = true, call onVoiceDetected()
        ↓ No  → Check silent duration
        ↓ Silent > silentTime? → Set isListening = false
```

## Browser Support
- Requires Web Audio API and getUserMedia
- Supported in modern browsers:
  - Chrome/Firefox/Safari/Edge (desktop)
  - Chrome/Firefox/Safari (mobile)
  - Some limitations in embedded webviews
- Graceful degradation: Shows error if APIs unavailable

## Error Handling
- Microphone permission denied: Shows error, sets `isMicAccessible = false`
- AudioContext creation fails: Shows error, stops listening
- Runtime audio errors: Caught and logged, resets listening state
- Component cleanup: Properly closes AudioContext and stops media tracks

## Accessibility Considerations
- Provides alternative input method for motor impairments
- Visual indicators convey audio state clearly
- Does not require precise timing like button tapping
- Can be used in conjunction with touch controls

## Performance
- Uses requestAnimationFrame for efficient checking
- Audio processing happens on audio thread, not blocking UI
- Proper cleanup prevents memory leaks
- Minimal garbage creation in audio callback

## Customization
The sensitivity can be adjusted via options:
- Lower threshold (e.g., 0.05) = more sensitive (may trigger on background noise)
- Higher threshold (e.g., 0.2) = less sensitive (may miss quiet speech)
- Shorter silentTime (e.g., 300ms) = faster response but may cut off speech
- Longer silentTime (e.g., 800ms) = more tolerant of pauses in speech

## Security & Privacy
- Only accesses microphone when explicitly activated by user
- No audio data is recorded or transmitted
- Audio processing happens entirely in-browser
- Microphone access released when component unmounts or listening stops
- Clear visual indication when microphone is active