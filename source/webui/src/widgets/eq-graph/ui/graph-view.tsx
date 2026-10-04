import { type ReactNode, useEffect, useRef } from 'react';

import { selectBand, selectionStore } from '~/entities/band';
import { DbLabels, FrequencyLabels, startAnimator, toGraphPoint } from '~/entities/viewport';
import { QHandles } from '~/features/adjust-band-q';
import { TypeStrip } from '~/features/change-band-type';
import { Crosshair, setCursor } from '~/features/cursor-readout';
import { DbAxis } from '~/features/display-range';
import { BandNodes, createBandAt } from '~/features/edit-band-node';
import { FrequencyAxis } from '~/features/frequency-axis';
import { SoloTag } from '~/features/solo-band';
import { endGesture, gestureStore, moveGesture } from '~/shared/lib';

import { GraphScene } from '../model/scene';

/** Pointer down on the empty graph: the first click folds the type strip, the next one deselects. */
const backgroundDown = () => {
  const { typeMenu, selected } = selectionStore.get();
  if (typeMenu === 'strip') selectionStore.set({ typeMenu: null });
  else if (selected !== null || typeMenu !== null) selectBand(null);
};

type GraphViewProps = {
  /** Placed over the graph after its own controls, e.g. the band dock. */
  overlay?: ReactNode;
  /** Called after every analyzer frame drawn (development stats). */
  onAnalyzerDraw?: (now: number) => void;
};

/** The EQ graph: canvas layers (grid, analyzer, curves) with labels and band controls on top. */
export const GraphView = ({ overlay, onAnalyzerDraw }: GraphViewProps) => {
  const graphRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layers = layersRef.current;
    const themeRoot = layers?.closest<HTMLElement>('.eq');
    if (layers === null || themeRoot === null || themeRoot === undefined) throw new Error('Graph is not mounted');

    const scene = new GraphScene(layers, themeRoot, onAnalyzerDraw);
    const stopAnimator = startAnimator();
    return () => {
      stopAnimator();
      scene.dispose();
    };
  }, [onAnalyzerDraw]);

  const point = (event: { clientX: number; clientY: number }) => toGraphPoint(event, graphRef.current ?? document.body);

  // Gestures capture the pointer on the element that starts them; its events bubble up to here.
  return (
    <div
      className="graph"
      ref={graphRef}
      onPointerMove={(event) => moveGesture(point(event), { shiftKey: event.shiftKey })}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
    >
      <div
        className="graph-background"
        onPointerDown={(event) => {
          if (event.button === 0) backgroundDown();
        }}
        onDoubleClick={(event) => createBandAt(point(event))}
        onPointerMove={(event) => {
          if (gestureStore.get().active === null) setCursor(point(event));
        }}
        onPointerLeave={() => setCursor(null)}
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
      {overlay}
    </div>
  );
};
