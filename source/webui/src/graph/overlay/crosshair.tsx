import {
  clamp,
  formatCursorDb,
  formatFrequency,
  formatNote,
  midiToFrequency,
  noteName,
  shallowEqual,
  useStore,
} from '~/shared/lib';
import { uiStore } from '~/model/ui';
import { createMapper, graph, maxHz, minHz, viewportStore } from '~/entities/viewport';

/**
 * Cursor readout over the empty graph: dashed crosshair with the frequency (and note) on the
 * frequency axis and the dB on the dB axis. Over a key, or while snapping to notes, the note's line.
 */
export const Crosshair = () => {
  const { cursor, dragging } = useStore(
    uiStore,
    (state) => ({ cursor: state.cursor, dragging: state.drag !== null }),
    shallowEqual,
  );
  const { hotKey, axis, range } = useStore(
    viewportStore,
    (state) => ({ hotKey: state.hotKey, axis: state.axis, range: state.view.range }),
    shallowEqual,
  );
  const mapper = createMapper(range);
  const notes = axis === 'note';
  const tagTop = (notes ? 606 : 640) - 3;

  let x: number;
  let y: number | null = null;
  let text: string;
  if (hotKey !== null) {
    x = mapper.noteX(hotKey);
    text = `${noteName(hotKey)} · ${formatFrequency(midiToFrequency(hotKey))}`;
  } else if (cursor !== null && !dragging && cursor.x > graph.left) {
    x = cursor.x;
    y = clamp(cursor.y, graph.top, graph.bottom);
    const hz = clamp(mapper.frequencyAt(x), minHz, maxHz);
    text = notes ? `${formatNote(hz)} · ${formatFrequency(hz)}` : `${formatFrequency(hz)} · ${formatNote(hz)}`;
  } else return null;

  return (
    <>
      <svg
        width={graph.width}
        height={graph.height}
        style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <path
          d={`M${x} ${graph.top}V${graph.bottom}`}
          strokeWidth={1}
          strokeDasharray="2 3"
          style={{ stroke: 'var(--state-focus)', strokeOpacity: 'var(--alpha-crosshair)' }}
        />
        {y !== null && (
          <path
            d={`M${graph.left} ${y}H${graph.right}`}
            strokeWidth={1}
            strokeDasharray="2 3"
            strokeOpacity={0.25}
            style={{ stroke: 'var(--state-focus)' }}
          />
        )}
      </svg>
      <div className="eq-ctag" style={{ position: 'absolute', zIndex: 7, left: x, top: tagTop, translate: '-50% 0' }}>
        {text}
      </div>
      {y !== null && (
        <div
          className="eq-ctag"
          style={{
            position: 'absolute',
            zIndex: 7,
            left: 2,
            width: 40,
            top: y,
            padding: '2px 4px',
            textAlign: 'right',
            translate: '0 -50%',
          }}
        >
          {formatCursorDb(mapper.dbAt(y))}
        </div>
      )}
    </>
  );
};
