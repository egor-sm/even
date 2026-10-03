import { defineConfig } from 'vite-plus';

export default defineConfig({
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
    categories: {
      correctness: 'error',
      suspicious: 'error',
      perf: 'warn',
    },
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: {
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
