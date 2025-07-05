module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: ["/node_modules/(?!(preact)/)"],
  globals: {
    'ts-jest': {
      tsconfig: {
        module: 'commonjs',
        jsx: 'react-jsx',
      },
    },
  },
};
