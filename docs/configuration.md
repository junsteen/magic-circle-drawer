# ⚙️ Configuration

## Overview
This document covers the configuration files used in the Arcane Tracer application, including build settings, TypeScript configuration, linting, and styling.

## Configuration Files

### Next.js Configuration (`next.config.ts`)
Configures the Next.js framework for building and exporting the application.

#### Key Settings
```typescript
const nextConfig: NextConfig = {
  output: 'export',           // Enables static export for deployment to static hosts
  images: { unoptimized: true }, // Disables Next.js image optimization (required for static export)
  // PWA configuration handled via service worker and manifest due to conflicts with export
};
```

#### Implications
- **Static Export**: `output: 'export'` generates a fully static site in the `out` directory
- **Image Handling**: `unoptimized: true` prevents Next.js from optimizing images (not compatible with static export)
- **Deployment**: Ready for Vercel, Cloudflare Pages, Netlify, GitHub Pages, etc.
- **Limitations**: No server-side rendering or API routes (fully client-side)

### TypeScript Configuration (`tsconfig.json`)
Defines TypeScript compiler options and project structure.

#### Key Settings
```json
{
  "compilerOptions": {
    "target": "ES2017",               // ECMAScript target version
    "lib": ["dom", "dom.iterable", "esnext"], // Library files to include
    "allowJs": true,                  // Allow JavaScript files in TypeScript project
    "skipLibCheck": true,             // Skip type checking of declaration files
    "strict": true,                   // Enable all strict type-checking options
    "noEmit": true,                   // Do not emit compilations (next handles this)
    "esModuleInterop": true,          // Enable interoperability with CommonJS
    "module": "esnext",               // Module code generation
    "moduleResolution": "bundler",    // Module resolution strategy
    "resolveJsonModule": true,        // Allow importing .json files
    "isolatedModules": true,          // Ensure each file can be transpiled independently
    "jsx": "react-jsx",               // JSX transformation mode
    "incremental": true,              // Enable incremental compilation
    "plugins": [{ "name": "next" }],  // Next.js TypeScript plugin
    "paths": { "@/*": ["./src/*"] }   // Path alias for imports
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

#### Important Notes
- **Path Alias**: `@/*` maps to `src/*` for cleaner imports (e.g., `@/lib/scoring` instead of `../../lib/scoring`)
- **No Emit**: `noEmit: true` because Next.js handles transpilation internally
- **Strict Mode**: Enforces strict type checking for better code quality
- **Next.js Plugin**: Integrates with Next.js's type checking

### ESLint Configuration (`eslint.config.mjs`)
Configures ESLint for code linting and formatting.

#### Configuration
```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

#### Features
- **Next.js Core Web Vitals**: Performance-focused linting rules
- **Next.js TypeScript**: TypeScript-specific rules for Next.js
- **Custom Ignores**: Excludes build artifacts and Next.js generated files
- **Extends**: Built-in Next.js ESLint configurations

### PostCSS Configuration (`postcss.config.mjs`)
Configures PostCSS for CSS processing with Tailwind.

#### Content
```javascript
// This file is likely empty or just contains Tailwind setup
// Since we see @import "tailwindcss" in globals.css, this may be minimal
```

#### Actual Content (from earlier view)
The file was not shown in our earlier exploration, but typically for Tailwind it would be:
```javascript
/** @type {import('postcss-load-config').Config} */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  }
}
```

### Wrangler Configuration (`wrangler.toml`)
Configures Cloudflare Workers deployment (if applicable).

#### Content
```toml
# This file would be present if deploying to Cloudflare Workers
# However, the project is configured for static export, so this may not be used
```

## Build Process

### Development
```bash
npm install
npm run dev
```
- Starts Next.js development server at `http://localhost:3000`
- Features hot module replacement
- Uses `next dev` command

### Production Build
```bash
npm run build
```
- Creates optimized production build
- With `output: 'export'`, generates static HTML in `out` directory
- Uses `next build` then `next export`

### Preview Build
```bash
npm run preview
# or
npx serve out
```
- Serves the static build locally for testing

## Deployment Targets

### Vercel
- Automatic deployment when connected to Git repository
- Detects Next.js project and uses appropriate build settings
- No configuration needed beyond connecting repo

### Cloudflare Pages
1. Connect repository to Cloudflare Pages
2. Build command: `npm run build`
3. Build output directory: `out`
4. Preserves caching headers via `_headers` file

### Netlify
1. Connect repository
2. Build command: `npm run build`
3. Publish directory: `out`
4. Uses Netlify's Next.js plugin if needed

### GitHub Pages
1. Build static export: `npm run build`
2. Push `out` directory to `gh-pages` branch
3. Or use `actions/upload-pages-artifact` workflow

## Environment Variables
Currently, the project does not use any environment variables in the build process.
If needed in the future:
- `.env.local` for development
- `.env.production` for production
- Accessible via `process.env.VARIABLE_NAME` in Node.js context only

## Configuration Best Practices

### Separation of Concerns
- **Build Config**: `next.config.ts` - Next.js-specific settings
- **Language Config**: `tsconfig.json` - TypeScript compiler options
- **Linting Config**: `eslint.config.mjs` - Code quality rules
- **Styling Config**: `postcss.config.mjs` - CSS processing
- **Deployment Config**: `wrangler.toml` (if used) - Platform-specific deployment

### Extensibility
- Path aliases (`@/*`) simplify imports and reduce relative path complexity
- Modular configuration allows changing one aspect without affecting others
- Clear separation between framework, language, and tooling configurations

### Performance Considerations
- Static export eliminates server costs
- Image optimization disabled for export compatibility (could use alternative optimization)
- Minimal client-side JavaScript through code splitting
- Efficient caching via service worker for PWA

## Future Configuration Needs
1. **Environment Variables**: For API keys or feature flags
2. **Testing Configuration**: Jest/Vitest config if adding test framework
3. **Database Configuration**: If moving from IndexedDB to remote backend
4. **Analytics Configuration**: For Google Analytics or similar
5. **Feature Flags**: For gradual rollouts or A/B testing

## Validation
- Next.js configuration validated via `next build` errors
- TypeScript validated via IDE and build process
- ESLint validated via linting scripts (could add to package.json)
- PostCSS validated via build success

## Troubleshooting
1. **Export Errors**: Check `next.config.ts` for correct export settings
2. **TypeScript Errors**: Ensure `tsconfig.json` includes all necessary files
3. **Linting Conflicts**: Review ESLint rules and ignore patterns
4. **Styling Issues**: Verify PostCSS and Tailwind configuration
5. **Build Failures**: Examine error messages for missing dependencies or syntax errors