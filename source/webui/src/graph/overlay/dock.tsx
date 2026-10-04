import { useLayoutEffect, useState } from 'react';
import { clsx } from 'clsx';

import { bandColorVar, findBand, hasGain, selectionStore, useDisplayBands } from '~/entities/band';
import { graph, nodePoint, viewportStore } from '~/entities/viewport';
import { TypeButton, TypePicker } from '~/features/change-band-type';
import { ScrubField } from '~/features/scrub-band-field';
import { SoloButton } from '~/features/solo-band';
import { BypassButton, DeleteButton } from '~/features/toggle-band';
import { clamp, gestureStore, shallowEqual, useStore } from '~/shared/lib';

const dockWidth = 540;
const dockTop = 572;
const edge = 12;
const glide = 0.3; // of the remaining distance per frame, when the selection moves to another band

const dockX = (nodeX: number) => clamp(nodeX - dockWidth / 2, edge, graph.width - edge - dockWidth);

/**
 * The inspector of the selected band in the bottom lane of the graph, centred under its node and
 * following it; it holds still while a value inside it is scrubbed.
 */
export const Dock = () => {
  const bands = useDisplayBands();
  const { selected, picker } = useStore(
    selectionStore,
    (state) => ({ selected: state.selected, picker: state.typeMenu === 'picker' }),
    shallowEqual,
  );
  const range = useStore(viewportStore, (state) => state.view.range);
  const scrubbing = useStore(gestureStore, (state) => state.active?.kind === 'scrub');
  const band = findBand(bands, selected);

  // Position at the last commit: the dock glides from there when the selection moves to another band.
  const [committed, setCommitted] = useState<{ slot: number; x: number; gliding: boolean } | null>(null);
  const node = band === undefined ? null : nodePoint(band.f, hasGain(band.type) ? band.g : 0, range);

  let x = 0;
  let gliding = false;
  if (band !== undefined && node !== null) {
    const target = dockX(node.x);
    x = target;
    if (committed !== null && scrubbing) x = committed.x;
    else if (committed !== null && (committed.slot !== band.slot || committed.gliding)) {
      x = committed.x + (target - committed.x) * glide;
      gliding = Math.abs(target - x) > 0.5;
      if (!gliding) x = target;
    }
  }
  const slot = band?.slot ?? null;

  useLayoutEffect(() => {
    const next = slot === null ? null : { slot, x, gliding };
    const update = () =>
      setCommitted((previous) =>
        previous?.slot === next?.slot && previous?.x === next?.x && previous?.gliding === next?.gliding
          ? previous
          : next,
      );
    // Following the node: record at once. Gliding: the next step comes with the next frame.
    if (!gliding) update();
    const frame = gliding ? requestAnimationFrame(update) : null;
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [slot, x, gliding]);

  if (band === undefined || node === null) return null;

  // A node down in the dock's lane stays on top; the dock turns translucent until hovered.
  const underDock = node.y + 13 > dockTop - 8 && node.x > x - edge && node.x < x + dockWidth + edge;

  return (
    <div
      className={clsx('eq-dock is-entering', underDock && 'is-ghost', !band.on && 'is-bypassed')}
      style={{
        ['--band' as string]: bandColorVar(band.color),
        position: 'absolute',
        left: x,
        top: dockTop,
        width: dockWidth,
        zIndex: picker ? 'var(--z-strip)' : 'var(--z-dock)',
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <TypeButton band={band} open={picker} />
      <div className="eq-divider" />
      <ScrubField band={band} field="f" />
      <ScrubField band={band} field="g" />
      <ScrubField band={band} field="q" />
      <div className="eq-divider" />
      <div className="eq-acts">
        <BypassButton band={band} />
        <SoloButton slot={band.slot} />
        <DeleteButton slot={band.slot} />
      </div>
      {picker && <TypePicker band={band} />}
    </div>
  );
};
