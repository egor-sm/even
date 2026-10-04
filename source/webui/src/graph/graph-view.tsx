import { useEffect, useRef } from 'react';

import { DbAxis } from '~/axes/db-axis';
import { FrequencyAxis } from '~/axes/frequency-axis';
import { uiStore } from '~/model/ui';
import { startAnimator } from '~/graph/animator';
import { DbLabels, FrequencyLabels } from '~/graph/axis-labels';
import { backgroundDoubleClick, backgroundDown, pointerMove, pointerUp, toGraphPoint } from '~/graph/interactions';
import { BandNodes } from '~/graph/overlay/band-nodes';
import { Crosshair } from '~/graph/overlay/crosshair';
import { Dock } from '~/graph/overlay/dock';
import { QHandles } from '~/graph/overlay/q-handles';
import { SoloTag } from '~/graph/overlay/solo-tag';
import { TypeStrip } from '~/graph/overlay/type-strip';
import { GraphScene } from '~/graph/scene';

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
        onPointerMove={(event) => {
          if (uiStore.get().drag === null) uiStore.set({ cursor: point(event) });
        }}
        onPointerLeave={() => uiStore.set({ cursor: null })}
      />
      <div className="graph-layers" ref={layersRef} />
      <SoloTag />
      <Crosshair />
      <FrequencyLabels />
      <FrequencyAxis />
      <DbAxis />
      <DbLabels />
      <QHandles />
      <BandNodes />
      <TypeStrip />
      <Dock />
    </div>
  );
};
