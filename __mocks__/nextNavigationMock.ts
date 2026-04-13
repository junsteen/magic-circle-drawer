// Mock for next/navigation
export const usePathname = () => '/';
export const useSearchParams = () => new URLSearchParams();
export const useRouter = () => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn(),
  beforePopState: jest.fn()
});