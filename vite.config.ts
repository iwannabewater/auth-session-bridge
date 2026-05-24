import { defineConfig } from 'vitest/config';

const repositoryBase = process.env.GITHUB_ACTIONS ? '/GPTSession2CPAandSub2API/' : '/';

export default defineConfig({
  base: repositoryBase,
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/core/**/*.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 80,
      },
    },
  },
});
