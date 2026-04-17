# 📱 PWA/Manifest

## Overview
Arcane Tracer is a Progressive Web App (PWA) that can be installed on devices and used offline, providing a native-app-like experience while maintaining the reach of a web application.

## PWA Features

### Offline Functionality
- Core application works completely offline after initial load
- Service worker caches essential assets for offline use
- Fallback offline page when trying to access uncached content
- Drawing history persists via IndexedDB (available offline)

### Installability
- Users can install the app to their home screen
- Launches in standalone mode (no browser UI)
- Custom icons and splash screen
- Theme color matching for address bar integration

### Performance
- Assets cached on first visit for instant subsequent loads
- Efficient cache-first strategy for static assets
- Network-first strategy for dynamic data (if any were added)
- Background updates when online

## Core Files

### manifest.json (`/public/manifest.json`)
Defines the PWA metadata and appearance.

#### Key Properties
```json
{
  "name": "Arcane Tracer - 魔法陣詠唱ゲーム",
  "short_name": "ArcaneTracer",
  "description": "魔法陣をなぞって詠唱するゲーム",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0d0d1a",
  "theme_color": "#00e5ff",
  "orientation": "portrait",
  "icons": [/* Multiple sizes for different devices */],
  "screenshots": [/* Preview images */],
  "display_override": ["window-controls-overlay"]
}
```

#### Important Fields
- **name/full_name**: Full and abbreviated app names
- **description**: App description shown in install prompts
- **start_url**: URL that opens when app is launched
- **display**: "standalone" hides browser UI for app-like experience
- **background_color**: Splash screen background
- **theme_color**: Address bar color in supported browsers
- **orientation**: Locks to portrait for optimal drawing experience
- **icons**: Multiple sizes for different device resolutions
- **screenshots**: Showcase images for app store listings
- **display_override**: Experimental features for enhanced UI control

### Service Worker (`/public/sw.js`)
Handles caching strategies and offline functionality.

#### Caching Strategy
1. **Install**: Precaches essential assets
   - Root HTML
   - Manifest
   - Key icons
   - Offline fallback page
2. **Activate**: Cleans up old caches
3. **Fetch**: Implements intelligent caching:
   - **Navigation requests**: Network-first with offline fallback
   - **Asset requests** (images, scripts, styles, documents): Cache-first
   - **API/Data requests**: Network-first with cache fallback

#### Features
- **Cache Versioning**: `CACHE_NAME` allows forced updates
- **Offline Page**: Serves `/offline.html` when network unavailable
- **Skip Waiting**: Allows immediate activation of new service worker
- **Client Claiming**: Ensures service worker controls all clients
- **Cross-origin Safety**: Ignores requests to other domains
- **Message Handling**: Can receive skipWaiting messages from clients

### Offline Page (`/public/offline.html`)
Simple page shown when user attempts to navigate while offline.

## PWA Implementation Details

### Next.js Integration
- Static export (`next.config.ts` with `output: 'export'`) generates deployable static files
- All PWA assets placed in `/public` directory for direct serving
- No special Next.js configuration required for basic PWA support

### Asset Caching
Precached assets include:
- `/` (main HTML)
- `/manifest.json`
- Icon sizes: 192x192, 512x512 (minimum required)
- `/offline.html`

Runtime caching handles:
- Additional icons and screenshots
- Any future API endpoints
- User-generated content (if implemented)

### Icon Requirements
Manifest includes icons for various contexts:
- 72x72, 96x96, 128x128, 144x144, 152x152: Android Chrome
- 192x192: Recommended minimum
- 384x384, 512x512: High-resolution displays
- All icons marked with `purpose: "any maskable"` for adaptive icons

### Configuration Files
- **next.config.ts**: Contains `output: 'export'` for static generation
- **_headers** and **_redirects**: For deployment platforms (Vercel, Netlify, etc.)

## Installation Process

### Browser Support
PWAs are supported in:
- Chrome/Android: Full support with install prompts
- Edge/Android: Full support
- Safari/iOS: Limited but functional (standalone mode via Share→Add to Home Screen)
- Firefox: Support behind flag or via manual installation
- Desktop Chrome/Edge: Installable via address bar icon

### Install Triggers
1. **Automatic Prompt**: Chrome shows install criteria-based prompt
2. **Manual Installation**:
   - Chrome: Menu → "Install ArcaneTracer"
   - Edge: Similar to Chrome
   - Safari: Share Button → "Add to Home Screen"
   - Firefox: Custom implementation needed or manual bookmark

### Install Criteria (Chrome)
To show the automatic install prompt, the PWA must:
- Have a web app manifest with required fields
- Be served over HTTPS (or localhost)
- Have a registered service worker with fetch handler
- Not already be installed
- Meet engagement heuristics (user interaction)

## Offline Functionality

### What Works Offline
1. **Core Application**: Load and play the game
2. **Drawing Canvas**: Create new drawings
3. **Pattern Selection**: Change difficulty and get new patterns
4. **Scoring System**: Evaluate drawings and get scores
5. **History Access**: View previously saved drawings
6. **Voice Activation**: Use voice controls (requires microphone permission)
7. **Replay Local Drawings**: View drawings saved in IndexedDB

### What Requires Online
1. **Sharing Drawings**: URL sharing requires network to create links
2. **Initial Load**: First visit needs network to fetch assets
3. **Updates**: Getting new versions of the app
4. **External Resources**: Any future API integrations

### Data Persistence
- **IndexedDB**: History and completion data persist offline
- **Canvas State**: Drawing state resets on reload (expected)
- **Service Worker Updates**: New versions activate on next load

## Technical Implementation

### Service Worker Lifecycle
1. **Registration**: Automatic via Next.js or could be added to layout
2. **Install**: Precaches assets, then calls `self.skipWaiting()`
3. **Activate**: Cleans old caches, then calls `self.clients.claim()`
4. **Fetch**: Handles requests with appropriate caching strategy
5. **Update**: New version waits for activation until all clients close

### Cache Management
- **Precache**: Static assets that don't change
- **Runtime Cache**: Assets fetched during use
- **Cache Expiry**: Manually managed via version changes
- **Storage Limits**: Browser-dependent, typically 50MB+ origins

### Performance Optimization
- **Cache-first for assets**: Instant loading of UI and core logic
- **Network-first for data**: Freshest data when available
- **Stale-while-revalidate**: Could be implemented for better UX
- **Background sync**: Potential for future features

## Security Considerations
- **HTTPS Required**: PWAs require secure contexts (except localhost)
- **Service Worker Scope**: Limited to directory it's placed in (root)
- **Content Security Policy**: Should be configured appropriately
- **No Sensitive Data**: Application doesn't handle personal information
- **Isolated Storage**: IndexedDB is origin-specific

## Best Practices Followed
1. **Manifest Validation**: All required fields present
2. **Icon Consistency**: Multiple sizes for different contexts
3. **Theme Colors**: Matching UI colors for seamless transition
4. **Offline Fallow**: Meaningful offline experience, not just error
5. **Update Strategy**: Clear cache versioning mechanism
6. **Performance**: Minimal precache, efficient runtime strategies
7. **Accessibility**: Maintains web accessibility in standalone mode

## Testing the PWA
1. **Lighthouse Audit**: Use Chrome DevTools to verify PWA criteria
2. **Application Panel**: Check manifest, service worker, and caches
3. **Offline Testing**: Enable offline mode in DevTools or disconnect network
4. **Install Test**: Try installing on various devices
5. **Update Testing**: Change version number and verify update process

## Future Enhancements
1. **Background Sync**: For sending sharing requests when online again
2. **Push Notifications**: For pattern completion reminders or challenges
3. **Offline Sharing**: Queue shares to send when connectivity returns
4. **App Badge**: Show completion count on app icon (where supported)
5. **File Handling**: Allow importing/exporting drawing files
6. **Protocol Handling**: Custom URL schemes for sharing
7. **Dark/Light Theme**: System theme preference respect
8. **Installation Prompting**: Custom install guidance for unsupported browsers

## Deployment Notes
- Works on any static host: Vercel, Netlify, Cloudflare Pages, GitHub Pages, etc.
- Ensure service worker is served from root (not subdirectory)
- Check that mime types are correct for JSON and JS files
- Verify HTTPS is enabled for production
- Test install flow on target devices