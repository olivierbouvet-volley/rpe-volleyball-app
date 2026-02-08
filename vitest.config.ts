import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    environment: 'happy-dom',
    setupFiles: ['./packages/viewer/tests/setup.ts'],
    include: [
      'packages/*/src/**/*.test.ts',
      'packages/*/tests/**/*.test.ts',
    ],
    env: {
      NODE_ENV: 'test',
    },
  },
});
