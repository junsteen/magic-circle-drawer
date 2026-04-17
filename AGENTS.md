<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Arcane Tracer Project Guidelines

## Project Overview
Arcane Tracer is a mobile-friendly web application where users trace magic shapes on screen to score accuracy. Built with Next.js 16 (App Router), TypeScript, Tailwind CSS, and HTML5 Canvas.

## Technical Stack
- **Framework**: Next.js 16 (App Router) with static export
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Drawing**: HTML5 Canvas API
- **Touch Events**: Pointer Events API
- **Deployment**: Vercel, Cloudflare Pages (PWA support)

## Key Directories
- `/src` - Source code
  - `/src/app` - App router pages and layouts
  - `/src/components` - Reusable components
  - `/src/lib` - Utility functions and constants
  - `/src/hooks` - Custom React hooks
- `/public` - Static assets
- `/docs` - Documentation

## Development Workflow
1. Install dependencies: `npm install`
2. Start development: `npm run dev` (opens http://localhost:3000)
3. Build for production: `npm run build` (outputs to `/out`)
4. Type checking: `npm run type-check`

## Important Notes
- Uses Pointer Events API (`onPointerDown`/`onPointerMove`/`onPointerUp`) for touch support
- Implements PWA functionality for offline use and home screen installation
- Features voice input activation via sound detection
- Includes tutorial system for first-time users
- Score calculation based on drawing accuracy with letter grades (S/A/B/C)
- Difficulty settings affect time limits and score multipliers
- Static export configured via `next.config.ts` with `output: 'export'`

## Conventions
- Component naming: PascalCase
- File naming: kebab-case for components, camelCase for utilities
- State management: React hooks (useState, useEffect, useContext)
- Styling: Tailwind utility-first approach
- Constants: Located in `/src/lib/constants.ts`
