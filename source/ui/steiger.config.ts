import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

// Feature-Sliced Design checks for src/: layers import only downwards, slices only through their
// public index, and slices of a layer do not import each other.
export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      // A feature is a user action, even when only one widget shows it (merging it into the widget
      // would put gesture logic back into the composition).
      'fsd/insignificant-slice': 'off',
    },
  },
]);
