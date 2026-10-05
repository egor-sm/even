import { clsx } from 'clsx';
import { useShallow } from 'zustand/react/shallow';

import {
  bandColorVar,
  findBand,
  formatSlope,
  hasGain,
  isCut,
  useSelectionStore,
  stripOrder,
  TypeIcon,
  typeNames,
  useDisplayBands,
} from '~/entities/band';
import { graph, nodePoint, useViewportStore } from '~/entities/viewport';
import { clamp, formatFrequency, formatGain, formatNote, formatQ, useGestureStore } from '~/shared/lib';
import { ToggleGroup, ToggleGroupItem, UiIcon } from '~/shared/ui';

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
export function TypeStrip() {
  const bands = useDisplayBands();
  const { selected, strip } = useSelectionStore(
    useShallow((state) => ({ selected: state.selected, strip: state.typeMenu === 'strip' })),
  );
  const { range, axis } = useViewportStore(useShallow((state) => ({ range: state.view.range, axis: state.axis })));
  const gesture = useGestureStore((state) => state.active);
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
    <ToggleGroup
      label="Filter type"
      value={band.type}
      focusOnMount
      className={clsx('eq-strip', !above && 'is-below')}
      style={{
        ...position,
        ['--band' as string]: bandColorVar(band.color),
        width,
        transformOrigin: `${clamp(node.x - left, 0, width)}px 50%`,
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') useSelectionStore.setState({ typeMenu: null });
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {previewed !== null && <span className="eq-strip__name">{typeNames[previewed]}</span>}
      {stripOrder.map((type, i) => (
        <ToggleGroupItem
          key={type}
          value={type}
          label={typeNames[type]}
          className="eq-strip__btn"
          style={{ animationDelay: `${40 + Math.abs(i - 3.5) * 22}ms` }}
          onSelect={() => setBandType(band.slot, type)}
          onHighlight={(highlighted) => hoverType(highlighted ? type : null)}
        >
          <TypeIcon type={type} />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
