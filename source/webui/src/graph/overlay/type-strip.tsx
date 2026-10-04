import { TypeIcon, UiIcon } from '../../design/icons';
import { bandColorVar, findBand } from '../../model/bands';
import { commands } from '../../model/commands';
import { hasGain, isCut, stripOrder, typeNames } from '../../model/filter-types';
import { formatFrequency, formatGain, formatNote, formatQ, formatSlope } from '../../model/format';
import { uiStore } from '../../model/ui';
import { shallowEqual, useStore } from '../../store/store';
import { clamp, graph } from '../geometry';
import { nodePosition } from '../interactions';
import { useDisplayBands } from './use-bands';

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
  const ui = useStore(
    uiStore,
    (state) => ({
      selected: state.selected,
      drag: state.drag,
      strip: state.strip,
      range: state.view.range,
      axis: state.axis,
      hoverType: state.hoverType,
    }),
    shallowEqual,
  );
  const band = findBand(bands, ui.selected);
  if (band === undefined) return null;

  const moving = ui.drag?.kind === 'node' && ui.drag.moved;
  const mode = moving ? 'readout' : ui.strip ? 'strip' : ui.drag === null ? 'pill' : null;
  if (mode === null) return null;

  const node = nodePosition(band, ui.range);
  const { width, height } = sizes[mode];
  let top = node.y - 18 - height;
  const above = top >= 6;
  if (!above) top = node.y + 18;
  const left = clamp(node.x - width / 2, 8, graph.width - 8 - width);
  const position = { position: 'absolute', left, top, zIndex: 'var(--z-strip)' } as const;

  if (mode === 'readout') {
    const frequency = ui.axis === 'note' ? formatNote(band.f) : formatFrequency(band.f);
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
        onClick={() => uiStore.set({ strip: true, picker: false, hoverType: null })}
      >
        <TypeIcon type={band.type} size={16} style={{ stroke: bandColorVar(band.color) }} />
        <UiIcon name="chevronDown" size={9} />
      </button>
    );

  return (
    <div
      className={`eq-strip${above ? '' : ' is-below'}`}
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
      {ui.hoverType !== null && <span className="eq-strip__name">{typeNames[ui.hoverType]}</span>}
      {stripOrder.map((type, i) => {
        const current = band.type === type;
        return (
          <button
            key={type}
            type="button"
            className={`eq-strip__btn${current ? ' is-on' : ''}`}
            role="menuitemradio"
            aria-checked={current}
            aria-label={typeNames[type]}
            style={{ animationDelay: `${40 + Math.abs(i - 3.5) * 22}ms` }}
            onClick={() => commands.setType(band.slot, type)}
            onMouseEnter={() => uiStore.set({ hoverType: type })}
            onMouseLeave={() => uiStore.set({ hoverType: null })}
          >
            <TypeIcon type={type} />
          </button>
        );
      })}
    </div>
  );
};
