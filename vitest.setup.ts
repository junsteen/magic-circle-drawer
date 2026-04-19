// vitest.setup.ts
import '@testing-library/jest-dom';

// Mock next/navigation if needed
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
      query: {},
    };
  },
  useSearchParams() {
    return [new URLSearchParams(), vi.fn()];
  },
  usePathname() {
    return '';
  },
  Link: vi.fn(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
}));

// Mock next/image if needed
vi.mock('next/image', () => ({
  ...require('next/image'),
  default: vi.fn(),
}));