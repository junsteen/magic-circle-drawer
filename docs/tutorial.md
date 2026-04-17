# 🎓 Tutorial System

## Overview
The tutorial system provides an interactive onboarding experience for new users, teaching them how to play Arcane Tracer through a series of steps that include explanations, visual demonstrations, and animated examples.

## Components

### TutorialOverlay.tsx
The main tutorial container that manages step-by-step presentation of tutorial content.

#### Props
```typescript
interface TutorialOverlayProps {
  onStart: () => void; // Called when tutorial completes
}
```

#### Steps
The tutorial consists of 4 steps:
1. **Welcome**: Introduction to the app concept
2. **Instructions**: Basic tracing mechanics and time limits
3. **Demo Animation**: Visual demonstration of how to trace patterns
4. **Completion**: Explanation of scoring and encouragement to play

#### Features
- Step progression with visual indicators (dots)
- Conditional rendering of canvas animation in step 3
- Start button that transitions to main app
- Semi-transparent dark overlay focusing attention on tutorial content
- Responsive design for mobile and desktop

### TutorialCanvasAnimation.tsx
An animated canvas that demonstrates how to trace a magic triangle pattern.

#### Animation Details
- **Canvas Size**: 180x180 pixels (smaller than main canvas for overlay)
- **Pattern**: Equilateral triangle (same as first preset pattern)
- **Edge Drawing**: Each side draws sequentially with glow effect
- **Timing**: 
  - 800ms per edge to draw
  - 1500ms pause between loops
  - Total loop duration: 3900ms (3*800 + 1500)
- **Visual Elements**:
  - Template circles (outer and inner) as reference
  - Dashed template edges for guidance
  - Pulsating red start marker
  - Numbered edges (1→2→3) indicating drawing order
  - "START" label at starting vertex
  - Glowing edge effect with trailing light point
  - Subtle shadow effects for depth

#### Technical Implementation
- Uses `requestAnimationFrame` for smooth animation
- Time-based progression using modulo arithmetic
- Canvas clearing and redrawing each frame
- Glow effect achieved with `shadowBlur` and `shadowColor`
- Proper cleanup of animation frame on unmount

## Usage
The tutorial system is automatically shown to new users or can be triggered via the help system.

### In Main Application
```typescript
// In MagicCircleCanvas component
const [showTutorial, setShowTutorial] = useState(false);
// Set to true to show tutorial (e.g., first visit or user request)
// onStart callback sets showTutorial to false

<TutorialOverlay onStart={() => setShowTutorial(false)} />
```

### Trigger Conditions
1. **First Visit**: Shown automatically on initial load (could be extended with localStorage flag)
2. **Help System**: Accessible from help modal for review
3. **Manual Trigger**: Could be added to settings or profile

## Customization
### Modifying Tutorial Content
Edit the `steps` array in `TutorialOverlay.tsx`:
- Change title/body text for localization
- Adjust `showCanvas` flag to show/hide animation per step
- Add/remove steps as needed
- Modify button text

### Adjusting Animation
Modify constants in `TutorialCanvasAnimation.tsx`:
- `CANVAS_SIZE`: Overall size of demonstration
- `EDGE_DURATION`: Speed of drawing each edge (ms)
- `LOOP_PAUSE`: Pause between animation loops (ms)
- Animation colors and effects in drawing functions

## Accessibility Considerations
- High contrast colors for visibility
- Text labels for all visual elements
- Non-essential animation (can be considered decorative)
- Touch-friendly button sizes
- Clear visual progression indicators

## Integration
- Overlay uses fixed positioning to cover entire viewport
- Z-index ensures it appears above all other content
- Semi-transparent background allows slight visibility of background
- Centered content box with responsive padding
- Touch events pass through to underlying elements when not interacted with

## Future Enhancements
1. **Progress Tracking**: Store completion status to skip on subsequent visits
2. **Multiple Patterns**: Show different patterns in tutorial (triangle, circle, star)
3. **Interactive Practice**: Allow tracing attempt during tutorial
4. **Voice Demo**: Demonstrate voice activation feature
5. **Settings Access**: Allow reviewing tutorial from options menu
6. **Accessibility Options**: Reduce motion preference, screen reader support