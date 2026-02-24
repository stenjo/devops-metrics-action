import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.spec.ts'],
    environment: 'node',
    clearMocks: true,
    coverage: {
      include: ['src/**'],
      reporter: ['json-summary', 'text', 'lcov']
    }
  }
})
