import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/app/',
        'src/components/',
        'src/hooks/',
        'src/lib/shareUtils.test.ts', // existing test file
        'vitest.config.ts',
        'vitest.setup.ts'
      ]
    }
  }
});