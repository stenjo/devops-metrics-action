module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testMatch: ['**/*.test.ts'],
  coverageReporters: ['lcov','json-summary', 'text', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
};