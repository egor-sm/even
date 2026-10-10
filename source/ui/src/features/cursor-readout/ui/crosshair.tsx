import { useShallow } from 'zustand/react/shallow';

import { useAnalyzerSettingsStore, useAnalyzerViewStore } from '~/entities/analyzer';
import { analyzerDbAt, createMapper, graph, maxHz, minHz, useViewportStore } from '~/entities/viewport';
import {
  clamp,
  formatAxisDb,
  formatCursorDb,
  formatFrequency,
  formatNote,
  useGestureStore,
  midiToFrequency,
  noteName,
} from '~/shared/lib';

import { useCursorStore } from '../model/cursor';

/** Left of the analyzer scale's control: the spectrum level shows only over the plot. */
const analyzerScaleLeft = graph.right - 44;

/**
 * Cursor readout over the empty graph: dashed crosshair with the frequency (and note) on the
 * frequency axis, the dB on the dB axis and the spectrum level on the analyzer scale. Over a key,
 * or while snapping to notes, the note's line.
 */
export function Crosshair() {
  const cursor = useCursorStore((state) => state.point);
  const dragging = useGestureStore((state) => state.active !== null);
  const { hotKey, axis, range } = useViewportStore(
    useShallow((state) => ({ hotKey: state.hotKey, axis: state.axis, range: state.view.range })),
  );
  const analyzerOn = useAnalyzerSettingsStore((state) => state.mode !== 'off');
  const analyzerRange = useAnalyzerViewStore((state) => state.range);
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
      {y !== null && analyzerOn && x < analyzerScaleLeft && (
        <div
          className="eq-ctag"
          style={{ position: 'absolute', zIndex: 7, right: 20, top: y, padding: '2px 4px', translate: '0 -50%' }}
        >
          {formatAxisDb(Math.round(analyzerDbAt(analyzerRange, y)))}
        </div>
      )}
    </>
  );
}
