import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    setupFiles: ['./src/lib/__tests__/setup.ts'],
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '#imports': path.resolve(__dirname, 'src/lib/__tests__/imports-mock.ts'),
    },
  },
});
