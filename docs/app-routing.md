# 📱 App/Routing

## Overview
This document covers the application structure, routing, and page components in the Arcane Tracer Next.js application using the App Router.

## Application Structure

### `/src/app/` Directory
```
src/app/
├── layout.tsx         # Root layout
├── page.tsx           # Home page
├── favicon.ico        # Application favicon
├── globals.css        # Global CSS styles
└── replay/            # Replay route segment
    └── page.tsx       # Replay page
```

### Routing System
The application uses Next.js 16 App Router with file-system based routing:
- `/` → `src/app/page.tsx` (Home page)
- `/replay` → `src/app/replay/page.tsx` (Replay page)

## Key Files

### `src/app/layout.tsx`
The root layout that wraps all pages and provides shared UI elements.

#### Features
- Sets up basic HTML structure
- Includes global CSS
- Provides metadata and viewport settings
- Could be extended for authentication, theme providers, etc.

### `src/app/page.tsx` (Home Page)
The main application page that contains:
- Header with title and subtitle
- Difficulty selector buttons
- Main MagicCircleCanvas component
- Score result display
- Completion progress indicator

#### Props and State
- Manages last score result
- Tracks completion status
- Handles difficulty selection
- Passes callbacks to canvas component

### `src/app/replay/page.tsx` (Replay Page)
Handles displaying shared drawings from URL parameters.

#### Features
- Extracts `data` parameter from URL
- Decompresses drawing data using shareUtils
- Shows loading, error, and empty states
- Renders HistoryDetail component for replay functionality
- Handles navigation back to home

#### Implementation Details
- Uses `useSearchParams` to get URL parameters
- Uses `useRouter` for navigation
- Implements Suspense for fallback loading UI
- Separates data fetching logic into `ReplayContent` component
- Validates decompressed data before display

## Navigation Patterns

### Internal Navigation
- Router.push() for programmatic navigation
- Used in:
  - Replay feature: navigating to `/replay?data=...`
  - HistoryDetail: navigating home on close
  - HistoryPanel: navigating home on re-edit (could be enhanced)

### URL Structure
- Home: `/`
- Replay: `/replay?data={compressed_drawing_data}`
- No other routes currently defined

## Next.js Specific Features

### App Router Benefits
- Server Components by default (though this app uses mostly Client Components)
- Streaming and Suspense support
- Parallel Routes (not used)
- Route Groups (not used)
- Improved metadata handling

### Client Components
All components in this app are marked as `'use client'` because they:
- Use React hooks (useState, useEffect, etc.)
- Access browser APIs (canvas, localStorage, etc.)
- Need event handlers and interactivity
- Use Next.js router hooks (useRouter, useSearchParams)

### Static Export
The application is configured for static export via `next.config.ts`:
- `output: 'export'` generates static HTML
- Enables deployment to Vercel, Cloudflare Pages, Netlify, etc.
- No server-side dependencies required

## SEO and Metadata
Currently minimal - could be enhanced with:
- Custom metadata in layout.tsx
- Open Graph tags for sharing
- JSON-LD structured data
- Dynamic titles based on difficulty or progress

## Internationalization
Not currently implemented but could be added:
- Using next-i18next or similar
- Locale-based routing
- Message files for different languages

## Error Handling
- Next.js built-in error boundaries
- Custom error pages could be added:
  - `src/app/error.tsx` for global errors
  - `src/app/replay/error.tsx` for route-specific errors
- Graceful degradation when features unavailable

## Performance Considerations
- Client Components bundle JavaScript for interactivity
- Static export means no server costs at runtime
- Images and assets optimized via Next.js
- Route-based code splitting (automatic)
- Prefetching could be added for better navigation

## Future Enhancements
1. **Authentication**: Add user accounts for syncing progress across devices
2. **Database Integration**: Replace IndexedDB with remote backend
3. **Admin Routes**: Add `/admin` section for managing patterns or viewing analytics
4. **API Routes**: Add `/api` endpoints for cloud features
5. **Preview Routes**: Add `/preview` for sharing work-in-progress
6. **Internationalization**: Add language support
7. **Advanced Routing**: Use parallel routes for modals or parallel features