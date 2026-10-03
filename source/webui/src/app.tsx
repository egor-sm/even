import { useState } from 'react';

import type { RendererKind } from './analyzer/spectrum-view';
import { Analyzer } from './components/analyzer';
import { BandSelector } from './components/band-selector';
import { BandStrip } from './components/band-strip';
import { Toolbar } from './components/toolbar';

export const App = () => {
  const [renderer, setRenderer] = useState<RendererKind>('webgl');
  const [selectedBand, setSelectedBand] = useState(1);

  return (
    <main className="app">
      <Toolbar renderer={renderer} onRendererChange={setRenderer} />
      <div className="band-bar">
        <BandSelector selected={selectedBand} onSelect={setSelectedBand} />
        <BandStrip band={selectedBand} />
      </div>
      <Analyzer renderer={renderer} selectedBand={selectedBand} onSelectBand={setSelectedBand} />
    </main>
  );
};
