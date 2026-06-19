module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src/__tests__"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^@medusajs/framework/utils$": "<rootDir>/node_modules/@medusajs/framework/dist/utils/index.js",
    "^@medusajs/framework/http$": "<rootDir>/node_modules/@medusajs/framework/dist/http/index.js",
    "^@medusajs/medusa$": "<rootDir>/node_modules/@medusajs/medusa/dist/index.js",
    "^@lib/(.*)$": "<rootDir>/src/lib/$1",
    "^@modules/(.*)$": "<rootDir>/src/modules/$1",
  },
  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "src/modules/**/*.ts",
    "!src/modules/**/index.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
}
