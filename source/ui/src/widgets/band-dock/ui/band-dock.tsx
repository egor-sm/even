import { clsx } from 'clsx';
import { useLayoutEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { bandColorVar, findBand, hasGain, useSelectionStore, useDisplayBands } from '~/entities/band';
import { graph, nodePoint, useViewportStore } from '~/entities/viewport';
import { TypeButton, TypePicker } from '~/features/change-band-type';
import { useGlideTargetStore } from '~/features/frequency-axis';
import { ScrubField } from '~/features/scrub-band-field';
import { SoloButton } from '~/features/solo-band';
import { BypassButton, DeleteButton } from '~/features/toggle-band';
import { clamp, useGestureStore } from '~/shared/lib';

const dockWidth = 540;
const dockTop = 572;
const edge = 12;
const glide = 0.3; // of the remaining distance per frame, when the selection moves to another band

const dockX = (nodeX: number) => clamp(nodeX - dockWidth / 2, edge, graph.width - edge - dockWidth);

/**
 * The inspector of the selected band in the bottom lane of the graph, centred under its node and
 * following it; it holds still while a value inside it is scrubbed.
 */
export function BandDock() {
  const bands = useDisplayBands();
  const { selected, picker } = useSelectionStore(
    useShallow((state) => ({ selected: state.selected, picker: state.typeMenu === 'picker' })),
  );
  const range = useViewportStore((state) => state.view.range);
  const scrubbing = useGestureStore((state) => state.active?.kind === 'scrub');
  const glideTarget = useGlideTargetStore((state) => state.target);
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

  // While the band glides to a clicked key, its frequency shows the note it is going to.
  const frequencyBand = glideTarget?.slot === band.slot ? { ...band, f: glideTarget.f } : band;

  // A node down in the dock's lane stays on top; the dock turns translucent until hovered.
  const underDock = node.y + 13 > dockTop - 8 && node.x > x - edge && node.x < x + dockWidth + edge;

  return (
    <div
      className={clsx('eq-dock is-entering', underDock && 'is-ghost', !band.on && 'is-bypassed')}
      style={{
        ['--band' as string]: bandColorVar(band.color),
        position: 'absolute',
        left: 0,
        top: dockTop,
        // Moved with translate, not left: WebKit does not repaint what changes inside a composited box in the
        // frame it moves with left, and the old value stays on screen. Whole pixels keep the text sharp.
        translate: `${Math.round(x)}px 0`,
        width: dockWidth,
        zIndex: picker ? 'var(--z-strip)' : 'var(--z-dock)',
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <TypeButton band={band} open={picker} />
      <div className="eq-divider" />
      <ScrubField band={frequencyBand} field="f" />
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
}
