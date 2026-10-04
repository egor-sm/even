import { useEffect, useRef } from 'react';

import { startAnimator } from './animator';
import { DbLabels, FrequencyLabels } from './axis-labels';
import { backgroundDoubleClick, backgroundDown, pointerMove, pointerUp, toGraphPoint } from './interactions';
import { BandNodes } from './overlay/band-nodes';
import { Dock } from './overlay/dock';
import { QHandles } from './overlay/q-handles';
import { TypeStrip } from './overlay/type-strip';
import { GraphScene } from './scene';

/** The EQ graph: canvas layers (grid, analyzer, curves) with labels and band controls on top. */
export const GraphView = () => {
  const graphRef = useRef<HTMLDivElement>(null);
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

  const point = (event: { clientX: number; clientY: number }) => toGraphPoint(event, graphRef.current ?? document.body);

  return (
    <div
      className="graph"
      ref={graphRef}
      onPointerMove={(event) => pointerMove(point(event), event.shiftKey)}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
    >
      <div
        className="graph-background"
        onPointerDown={(event) => {
          if (event.button === 0) backgroundDown();
        }}
        onDoubleClick={(event) => backgroundDoubleClick(point(event))}
      />
      <div className="graph-layers" ref={layersRef} />
      <FrequencyLabels />
      <DbLabels />
      <QHandles />
      <BandNodes />
      <TypeStrip />
      <Dock />
    </div>
  );
};
