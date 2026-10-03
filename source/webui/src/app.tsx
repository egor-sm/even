import { useState } from 'react';

import type { RendererKind } from './analyzer/spectrum-view';
import { Analyzer } from './components/analyzer';
import { Toolbar } from './components/toolbar';

export const App = () => {
  const [renderer, setRenderer] = useState<RendererKind>('webgl');

  return (
    <main className="app">
      <Toolbar renderer={renderer} onRendererChange={setRenderer} />
      <Analyzer renderer={renderer} />
    </main>
  );
};
