import type { Config } from '@jest/module-search-options';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: [
    '<rootDir>/src/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/*.spec.{ts,tsx}'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/lib/shareUtils.test.ts', // Already has its own tests
    '!src/components/HistoryDetail.test.tsx', // New test file
    '!src/components/MagicCircleCanvas.test.tsx', // New test file
    '!src/lib/useMagicCircle.test.ts' // New test file
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  // Mock Next.js and CSS modules
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^next/router$': '<rootDir>/__mocks__/nextRouterMock.ts',
    '^next/navigation$': '<rootDir>/__mocks__/nextNavigationMock.ts'
  }
};

export default config;