import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '~/app';
import { hasPluginBackend, setBackend } from '~/shared/api';

import '~/shared/ui';
import '~/design/base.css';

// In a plain browser (`vp dev` without the plugin) a mock stands in for C++. Not part of release builds.
if (import.meta.env.DEV && !hasPluginBackend()) setBackend((await import('~/dev/mock-backend')).mockBackend);

const root = document.querySelector('#root');
if (root === null) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
