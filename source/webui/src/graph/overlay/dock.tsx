import { type ReactNode, useLayoutEffect, useState } from 'react';

import { TypeIcon, UiIcon } from '../../design/icons';
import { bandColorVar, findBand } from '../../model/bands';
import { commands } from '../../model/commands';
import { hasGain, isCut, typeNames } from '../../model/filter-types';
import { formatFrequency, formatGain, formatNote, formatQ, formatSlope } from '../../model/format';
import { type ScrubField, uiStore } from '../../model/ui';
import { shallowEqual, useStore } from '../../store/store';
import { clamp, graph } from '../geometry';
import { nodePosition, scrubDown, toGraphPoint } from '../interactions';
import { TypePicker } from './type-picker';
import { useDisplayBands } from './use-bands';

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
  const ui = useStore(
    uiStore,
    (state) => ({
      selected: state.selected,
      solo: state.solo,
      drag: state.drag,
      range: state.view.range,
      axis: state.axis,
      picker: state.picker,
      hoverType: state.hoverType,
    }),
    shallowEqual,
  );
  const band = findBand(bands, ui.selected);

  // Position at the last commit: the dock glides from there when the selection moves to another band.
  const [committed, setCommitted] = useState<{ slot: number; x: number; gliding: boolean } | null>(null);
  const node = band === undefined ? null : nodePosition(band, ui.range);

  let x = 0;
  let gliding = false;
  if (band !== undefined && node !== null) {
    const target = dockX(node.x);
    x = target;
    if (committed !== null && ui.drag?.kind === 'scrub') x = committed.x;
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

  const cut = isCut(band.type);
  const withGain = hasGain(band.type);
  const shownType = ui.hoverType ?? band.type;
  const previewing = ui.hoverType !== null && ui.hoverType !== band.type;
  const underDock = node.y + 13 > dockTop - 8 && node.x > x - edge && node.x < x + dockWidth + edge;
  const activeField = ui.drag?.kind === 'scrub' ? ui.drag.field : ui.drag?.kind === 'q' ? 'q' : null;
  const noteAxis = ui.axis === 'note';

  const field = (name: ScrubField, label: ReactNode, value: string, extra = '') => (
    <button
      type="button"
      className={['eq-field', extra, activeField === name ? 'is-active' : ''].filter(Boolean).join(' ')}
      aria-label={`${name === 'f' ? 'Frequency' : name === 'q' ? 'Q' : 'Gain or slope'}, drag to change`}
      onPointerDown={(event) => {
        if (event.button !== 0 || extra.includes('is-disabled')) return;
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        const graphElement = event.currentTarget.closest('.graph');
        if (graphElement !== null) scrubDown(band, name, toGraphPoint(event, graphElement));
      }}
    >
      <span className="eq-field__l">{label}</span>
      <span className="eq-field__v">{value}</span>
    </button>
  );

  return (
    <div
      className={['eq-dock', 'is-entering', underDock ? 'is-ghost' : '', band.on ? '' : 'is-bypassed']
        .filter(Boolean)
        .join(' ')}
      style={{
        ['--band' as string]: bandColorVar(band.color),
        position: 'absolute',
        left: x,
        top: dockTop,
        width: dockWidth,
        zIndex: ui.picker ? 'var(--z-strip)' : 'var(--z-dock)',
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={['eq-typeb', ui.picker ? 'is-hover' : '', previewing ? 'is-preview' : ''].filter(Boolean).join(' ')}
        aria-label="Filter type"
        aria-expanded={ui.picker}
        onClick={() => uiStore.set(({ picker }) => ({ picker: !picker, strip: false, hoverType: null }))}
      >
        <TypeIcon type={shownType} style={{ stroke: 'var(--band)' }} />
        <span>{typeNames[shownType]}</span>
        <span className="eq-chev" style={{ flex: 'none', display: 'grid' }}>
          <UiIcon name="chevronDown" size={12} />
        </span>
      </button>
      <div className="eq-divider" />
      {field(
        'f',
        <>
          Freq<span className="eq-field__note">{noteAxis ? formatFrequency(band.f) : formatNote(band.f)}</span>
        </>,
        noteAxis ? formatNote(band.f) : formatFrequency(band.f),
        'is-freq',
      )}
      {field(
        'g',
        cut ? 'Slope' : 'Gain',
        cut ? formatSlope(band.slope) : withGain ? formatGain(band.g) : '—',
        cut || withGain ? '' : 'is-disabled',
      )}
      {field('q', 'Q', formatQ(band.q))}
      <div className="eq-divider" />
      <div className="eq-acts">
        <button
          type="button"
          className={`eq-act${band.on ? '' : ' is-danger'}`}
          aria-label="Bypass band"
          aria-pressed={!band.on}
          onClick={() => commands.toggleBypass(band)}
        >
          <UiIcon name="power" size={14} />
        </button>
        <button
          type="button"
          className={`eq-act${ui.solo === band.slot ? ' is-solo' : ''}`}
          aria-label="Solo band"
          aria-pressed={ui.solo === band.slot}
          onClick={() => commands.toggleSolo(band.slot)}
        >
          <UiIcon name="solo" size={14} />
        </button>
        <button
          type="button"
          className="eq-act"
          aria-label="Delete band"
          onClick={() => commands.deleteBand(band.slot)}
        >
          <UiIcon name="close" size={13} />
        </button>
      </div>
      {ui.picker && <TypePicker band={band} />}
    </div>
  );
};
