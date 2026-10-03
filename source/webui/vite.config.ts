import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [react()],
  // Assets are served by the app's ResourceProvider, so keep URLs relative.
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  fmt: {
    ignorePatterns: ['dist/**'],
    printWidth: 120,
    singleQuote: true,
    semi: true,
    sortPackageJson: true,
  },
  lint: {
    ignorePatterns: ['dist/**'],
    plugins: ['typescript', 'unicorn', 'oxc', 'react', 'jsx-a11y'],
    categories: {
      correctness: 'error',
      suspicious: 'error',
      perf: 'warn',
    },
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: {
      'vite-plus/prefer-vite-plus-imports': 'error',
      // Not needed with the automatic JSX runtime (React 17+).
      'react/react-in-jsx-scope': 'off',
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
