const tsJestPath = require.resolve('ts-jest');

module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@campusfit/rule-engine$': '<rootDir>/../../packages/rule-engine/src',
  },
  transform: {
    '^.+\\.ts$': [tsJestPath, { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'js'],
};
