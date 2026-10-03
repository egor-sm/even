import { useState } from 'react';

import type { RendererKind } from './analyzer/spectrum-view';
import { Analyzer } from './components/analyzer';
import { BandStrip } from './components/band-strip';
import { Toolbar } from './components/toolbar';

export const App = () => {
  const [renderer, setRenderer] = useState<RendererKind>('webgl');

  return (
    <main className="app">
      <Toolbar renderer={renderer} onRendererChange={setRenderer} />
      <BandStrip band={1} />
      <Analyzer renderer={renderer} />
    </main>
  );
};
