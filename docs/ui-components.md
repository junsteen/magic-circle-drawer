# 🧩 UI Components

## Overview
This document covers the reusable UI components used throughout the Arcane Tracer application, including modals, panels, and interactive elements.

## Components

### HelpModal (`src/components/HelpModal.tsx`)
A modal dialog that displays instructions and scoring information.

#### Props
```typescript
interface HelpModalProps {
  onClose: () => void; // Callback when user closes the modal
}
```

#### Features
- Full-screen dark backdrop with click-to-close
- Centered card with rounded borders and gradient accents
- Step-by-step instructions with numbered indicators
- Score breakdown showing rank thresholds and damage multipliers
- Consistent styling with tutorial overlay
- Touch-friendly close button

#### Usage
```typescript
import HelpModal from '@/components/HelpModal';
import { useState } from 'react';

const [showHelp, setShowHelp] = useState(false);

// In JSX:
{showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
// Trigger with:
<button onClick={() => setShowHelp(true)}>?</button>
```

### HistoryPanel (`src/components/HistoryPanel.tsx`)
A bottom sheet panel that displays the user's drawing history with sharing capabilities.

#### Props
```typescript
interface HistoryPanelProps {
  isOpen: boolean;        // Whether panel is visible
  onClose: () => void;    // Callback when panel is closed
  onSelect: (history: MagicCircleHistory) => void; // Callback when item is selected
}
```

#### Features
- Grid layout showing drawing thumbnails
- Rank badges on thumbnails (S/A/B/C color-coded)
- Timestamp display (relative time like "5分前")
- Share button with Web Share API fallback to clipboard
- Delete button for removing history items
- Loading states and empty state handling
- Responsive grid (2-4 columns based on screen size)
- Smooth animations and hover effects

#### Data Displayed
- Pattern name (truncated if too long)
- Creation timestamp
- Rank indicator (colored badge)
- Thumbnail preview or magic circle emoji
- Share and delete controls

#### Usage
```typescript
import HistoryPanel from '@/components/HistoryPanel';
import { useState } from 'react';

const [showHistory, setShowHistory] = useState(false);

// In JSX:
<HistoryPanel
  isOpen={showHistory}
  onClose={() => setShowHistory(false)}
  onSelect={handleHistorySelect}
/>
// Trigger with:
<button onClick={() => setShowHistory(true)}>📜</button>
```

### HistoryDetail (`src/components/HistoryDetail.tsx`)
A modal dialog that displays detailed information about a specific drawing and provides replay functionality.

#### Props
```typescript
interface HistoryDetailProps {
  history: MagicCircleHistory | null; // The history item to display
  onClose: () => void;                // Callback when modal is closed
  onReEdit: (data: MagicCircleData) => void; // Callback when user wants to redraw
}
```

#### Features
- Full-screen dark backdrop
- Detailed drawing information:
  - Pattern name
  - Score and rank
  - Difficulty level
  - Damage multiplier
  - Timestamp
  - Thumbnail preview (if available)
- Replay button to watch drawing recreation
- Re-edit button to reload drawing into main canvas
- Close button to dismiss modal
- Error handling for missing data

#### Usage
```typescript
import HistoryDetail from '@/components/HistoryDetail';
import { useState } from 'react';

const [selectedHistory, setSelectedHistory] = useState<MagicCircleHistory | null>(null);

// In JSX:
<HistoryDetail
  history={selectedHistory}
  onClose={() => setSelectedHistory(null)}
  onReEdit={handleReEdit}
/>
// Trigger with:
<HistoryPanel onSelect={(history) => setSelectedHistory(history)} />
```

## Styling Consistency
All UI components share common styling themes:
- Dark background (`#0d0d1a` or `#0a0a14` for elevated elements)
- Accent colors from the magic cyan (`#00e5ff`) and purple (`#7c4dff`) palette
- Gradient buttons using `linear-gradient(135deg, #00e5ff, #7c4dff)`
- Rounded corners (`rounded-lg`, `rounded-xl`, `rounded-full`)
- Subtle borders and shadows for depth
- Consistent typography and spacing
- Touch-friendly minimum target sizes

## Animation & Interaction
- Smooth transitions for opening/closing (using CSS transforms and opacity)
- Hover states on buttons and interactive elements
- Press feedback with scale transitions
- Loading spinners and skeleton states where appropriate
- Visual feedback for success/error states (temporary color changes)

## Accessibility Considerations
- Proper contrast ratios for text and icons
- Touch target sizes ≥ 48x48dp
- Clear visual indication of interactive elements
- Semantic HTML structure where applicable
- Focus management in modals (could be enhanced)
- ARIA labels for icon-only buttons

## Performance Notes
- Components are designed to be lightweight
- HistoryPanel uses efficient rendering for large lists
- Images use next/image or appropriate sizing to prevent layout shifts
- Event propagation is handled correctly (stopPropagation where needed)
- Cleanup of subscriptions and timers in useEffect return functions