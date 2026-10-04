import { clsx } from 'clsx';

import {
  bandColorVar,
  findBand,
  formatSlope,
  hasGain,
  isCut,
  selectionStore,
  stripOrder,
  TypeIcon,
  typeNames,
  useDisplayBands,
} from '~/entities/band';
import { graph, nodePoint, viewportStore } from '~/entities/viewport';
import {
  clamp,
  formatFrequency,
  formatGain,
  formatNote,
  formatQ,
  gestureStore,
  shallowEqual,
  useStore,
} from '~/shared/lib';
import { UiIcon } from '~/shared/ui';

import { hoverType, openTypeMenu, setBandType, usePreviewedType } from '../model/type-preview';

const sizes = {
  pill: { width: 44, height: 28 },
  strip: { width: 248, height: 38 },
  readout: { width: 150, height: 28 },
};

/**
 * Above the selected node: a pill with the current type, which expands into a row of the eight
 * types; while the node is dragged, a readout of its frequency and gain.
 */
export const TypeStrip = () => {
  const bands = useDisplayBands();
  const { selected, strip } = useStore(
    selectionStore,
    (state) => ({ selected: state.selected, strip: state.typeMenu === 'strip' }),
    shallowEqual,
  );
  const { range, axis } = useStore(
    viewportStore,
    (state) => ({ range: state.view.range, axis: state.axis }),
    shallowEqual,
  );
  const gesture = useStore(gestureStore, (state) => state.active);
  const previewed = usePreviewedType();
  const band = findBand(bands, selected);
  if (band === undefined) return null;

  const moving = gesture?.kind === 'node' && gesture.moved === true;
  const mode = moving ? 'readout' : strip ? 'strip' : gesture === null ? 'pill' : null;
  if (mode === null) return null;

  const node = nodePoint(band.f, hasGain(band.type) ? band.g : 0, range);
  const { width, height } = sizes[mode];
  let top = node.y - 18 - height;
  const above = top >= 6;
  if (!above) top = node.y + 18;
  const left = clamp(node.x - width / 2, 8, graph.width - 8 - width);
  const position = { position: 'absolute', left, top, zIndex: 'var(--z-strip)' } as const;

  if (mode === 'readout') {
    const frequency = axis === 'note' ? formatNote(band.f) : formatFrequency(band.f);
    const second = isCut(band.type)
      ? formatSlope(band.slope)
      : hasGain(band.type)
        ? formatGain(band.g)
        : `Q ${formatQ(band.q)}`;
    return (
      <div className="eq-tpill is-readout" style={{ ...position, width }}>
        {frequency} · {second}
      </div>
    );
  }

  if (mode === 'pill')
    return (
      <button
        type="button"
        className="eq-tpill"
        aria-label="Change filter type"
        style={position}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => openTypeMenu('strip')}
      >
        <TypeIcon type={band.type} size={16} style={{ stroke: bandColorVar(band.color) }} />
        <UiIcon name="chevronDown" size={9} />
      </button>
    );

  return (
    <div
      className={clsx('eq-strip', !above && 'is-below')}
      role="menu"
      aria-label="Filter type"
      tabIndex={-1}
      style={{
        ...position,
        ['--band' as string]: bandColorVar(band.color),
        width,
        transformOrigin: `${clamp(node.x - left, 0, width)}px 50%`,
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {previewed !== null && <span className="eq-strip__name">{typeNames[previewed]}</span>}
      {stripOrder.map((type, i) => {
        const current = band.type === type;
        return (
          <button
            key={type}
            type="button"
            className={clsx('eq-strip__btn', current && 'is-on')}
            role="menuitemradio"
            aria-checked={current}
            aria-label={typeNames[type]}
            style={{ animationDelay: `${40 + Math.abs(i - 3.5) * 22}ms` }}
            onClick={() => setBandType(band.slot, type)}
            onMouseEnter={() => hoverType(type)}
            onMouseLeave={() => hoverType(null)}
          >
            <TypeIcon type={type} />
          </button>
        );
      })}
    </div>
  );
};
