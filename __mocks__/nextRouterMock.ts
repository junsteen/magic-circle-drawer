// Mock for next/router
export const useRouter = () => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn(),
  beforePopState: jest.fn()
});

export const usePathname = () => '';
export const useSearchParams = () => new URLSearchParams();