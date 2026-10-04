import { useEffect, useRef } from 'react';

import { startAnimator } from './animator';
import { DbLabels, FrequencyLabels } from './axis-labels';
import { GraphScene } from './scene';

/** The EQ graph: canvas layers (grid, analyzer, curves) with labels and band controls on top. */
export const GraphView = () => {
  const layersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layers = layersRef.current;
    const themeRoot = layers?.closest<HTMLElement>('.eq');
    if (layers === null || themeRoot === null || themeRoot === undefined) throw new Error('Graph is not mounted');

    const scene = new GraphScene(layers, themeRoot);
    const stopAnimator = startAnimator();
    return () => {
      stopAnimator();
      scene.dispose();
    };
  }, []);

  return (
    <div className="graph">
      <div className="graph-layers" ref={layersRef} />
      <FrequencyLabels />
      <DbLabels />
    </div>
  );
};
