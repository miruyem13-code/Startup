import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    env: {
      DATABASE_URL: 'file:./test.db',
      NODE_ENV: 'test',
      DEMO_MODE: 'true',
      APP_ORIGIN: 'http://localhost:5173',
    },
  },
});
