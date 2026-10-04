import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';

import './design/fonts';
import './design/tokens.css';
import './design/components.css';
import './design/base.css';

const root = document.querySelector('#root');
if (root === null) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
