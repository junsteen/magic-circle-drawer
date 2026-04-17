# 🎨 Styling/Theming

## Overview
This document covers the styling approach, CSS structure, and design system used in the Arcane Tracer application.

## CSS Architecture

### Global Styles (`src/app/globals.css`)
The foundation of the application's styling, built on Tailwind CSS with custom extensions.

#### Key Features
- **Tailwind Integration**: `@import "tailwindcss"` for utility-first styling
- **CSS Variables**: Defined in `:root` for theme colors and effects
- **Custom Animations**: Keyframes for visual feedback and micro-interactions
- **Base Styles**: Body formatting, font choices, and reset overrides

### Theme Colors
Defined in `:root` and exposed via Tailwind config:
```css
:root {
  --background: #0d0d1a;      /* Deep space blue-black */
  --foreground: #e0e0ff;      /* Soft lavender-white */
  --magic-color: #00e5ff;     /* Electric cyan (primary accent) */
  --glow-color: rgba(0, 229, 255, 0.6); /* Glow effect */
}
```

### Custom Animations
1. **glow-pulse**: Pulsing outer glow for interactive elements
2. **magic-burst**: Expanding fade effect for magical effects
3. **draw-triangle**: Line drawing animation (used in SVG contexts)
4. **pulse-marker**: Pulsating scale animation for start markers
5. **fade-in**: Entrance animation for overlays and modals
6. **spin-slow**: Slow continuous rotation for loading indicators

## Typography
- **Font Family**: `'Georgia', serif` - chosen for classic, readable feel
- **Text Colors**: 
  - Primary: `--foreground` (`#e0e0ff`)
  - Accents: `--magic-color` (`#00e5ff`) and variants
  - Muted: `#7676aa`, `#c0c0e0`, `#999` for secondary text
  - Rank colors: Gold (`#ffd700`), Cyan (`#00e5ff`), Green (`#76ff03`), Pink (`#ff4081`)

## Component Styling Patterns

### Buttons
Primary button style:
```css
style={{ background: 'linear-gradient(135deg, #00e5ff, #7c4dff)' }}
```
Features:
- Gradient background using magic colors
- Rounded corners (`rounded-md`, `rounded-lg`)
- Text styling (`font-bold`, `text-black` for contrast)
- Hover effects (`hover:opacity-80`, `transition-opacity`)
- Disabled states (`opacity-40`, `cursor-not-allowed`)

### Overlays & Modals
Common pattern:
- Backdrop: `fixed inset-0 bg-black/[opacity]`
- Container: `mx-4 max-w-sm rounded-xl p-6`
- Background: `#1a1a2e` (slightly lighter than main background)
- Border: `1px solid rgba(0,229,255,0.3)`
- Z-index: High values (`z-[200]`, `z-40`, `z-50`) for layering

### Cards & Panels
- Background: `#0a0a14` (very dark) or `#0d0d1a` (main background)
- Borders: `border border-gray-700` or `border-gray-800`
- Rounded corners: `rounded-lg`, `rounded-xl`
- Padding: `p-4`, `p-6`, `space-y-*` for internal spacing

## Responsive Design
- Mobile-first approach with Tailwind breakpoints
- Flexible containers: `max-w-sm`, `flex-1`, `h-full`/`w-full` as needed
- Touch-friendly controls: Minimum 44x44pt tap targets
- Grid layouts: Adaptive columns (2-4 based on screen width)
- Overflow handling: `overflow-y-auto` for scrollable content

## Dark Mode Considerations
The application is designed exclusively for dark mode:
- Dark backgrounds reduce eye strain in low-light environments
- Bright accent colors provide clear visual hierarchy
- Glow effects enhance magical/theme consistency
- Contrast ratios checked for readability

## Visual Effects & Feedback

### Glow Effects
Used throughout for interactive elements:
- Button glows via `box-shadow` in hover states
- Magic color accents with variable opacity
- Pulsing animations for attention drawing

### Interactive Feedback
- Press states: `active:scale-95` for subtle press feedback
- Hover states: `hover:bg-gray-800`, `hover:opacity-80`
- Focus states: Could be enhanced with `focus-visible` styles
- Loading states: `animate-spin` spinners and skeleton screens

### Magical Theme Elements
- Star/magic symbols (✨, 🔮, 📜, ⚡, 🌟)
- Animated elements with timing functions
- Gradient backgrounds suggesting energy
- Particle-like effects in tutorials and overlays

## Implementation Details

### Tailwind Configuration
Extended via `next.config.ts`:
- Custom animation definitions
- Potential color extensions
- Font loading if needed

### CSS-in-JS vs Utility Classes
Approach:
- Utility classes for layout, spacing, positioning (`flex`, `p-4`, `mt-2`)
- Inline style objects for complex gradients and dynamic values
- CSS variables for theme colors used in JS
- Custom animations defined in CSS and referenced in JS

### Performance Considerations
- Minimal CSS footprint - mostly utilities
- No render-blocking CSS beyond essential globals
- Animations use transform and opacity where possible for GPU acceleration
- Media queries handled efficiently by Tailwind

## Accessibility
- Color contrast ratios meet WCAG AA for text/icons
- Focus management could be enhanced in modals
- Touch target sizes meet minimum recommendations
- Respects user preference for reduced motion (could add `motion-safe:` variants)
- Semantic HTML structure in components

## Customization Guide

### Changing Theme Colors
1. Update `:root` variables in `globals.css`
2. Ensure gradients and effects use updated variables
3. Rank colors in components may need updating if significantly changed

### Adding New Animations
1. Define keyframes in `globals.css`
2. Add to Tailwind config if needed for utility class usage
3. Reference in component style objects or class names

### Modifying Spacing/Sizing
- Adjust Tailwind spacing scale in config if needed
- Use consistent spacing tokens (p-2, p-4, p-6, etc.)
- Maintain vertical rhythm with space-y-* utilities

### Dark Mode Toggle (Future)
Would require:
- CSS variables for light/dark theme pairs
- Class switching on `<html>` or `<body>`
- Persistent storage of preference
- Automatic system preference detection

## Browser Support
- Modern CSS features used (custom properties, animations)
- Fallbacks could be added for older browsers if needed
- Tested in Chrome, Firefox, Safari, Edge (desktop and mobile)
- Graceful degradation for unsupported features

## Design Philosophy
- **Magical Academia**: Blend of mystical elements with clean, readable interface
- **Focus on Content**: UI minimizes distraction from core drawing experience
- **Feedback Rich**: Clear visual and animation feedback for all interactions
- **Touch First**: Optimized for mobile use while maintaining desktop usability
- **Performance Conscious**: Visual effects balanced with performance considerations