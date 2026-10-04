import { native } from '../juce/native';
import { useChoiceParameter } from '../juce/use-choice-parameter';
import { useSliderParameter } from '../juce/use-slider-parameter';
import { useToggleParameter } from '../juce/use-toggle-parameter';
import { ParameterSlider } from './parameter-slider';

// Shapes that use the gain parameter; names match shapeNames in parameters.h.
const shapesWithGain = new Set(['Bell', 'Low Shelf', 'High Shelf', 'Tilt Shelf']);

const formatFrequency = (hz: number) => (hz >= 1000 ? `${(hz / 1000).toFixed(2)} kHz` : `${hz.toFixed(0)} Hz`);

type BandStripProps = {
  band: number;
};

/** Controls of one EQ band, bound to the band<N>* plugin parameters. */
export const BandStrip = ({ band }: BandStripProps) => {
  const id = (field: string) => `band${band}${field}`;

  const [enabled, setEnabled] = useToggleParameter(id('Enabled'));
  const shape = useChoiceParameter(id('Shape'));
  const frequency = useSliderParameter(id('Frequency'), 'logarithmic');
  const gain = useSliderParameter(id('Gain'));
  const q = useSliderParameter(id('Q'), 'logarithmic');
  const slope = useChoiceParameter(id('Slope'));

  const shapeName = shape.choices[shape.index] ?? '';
  const isCut = shapeName === 'Low Cut' || shapeName === 'High Cut';

  return (
    <div className="band-strip">
      <label className="control">
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        On
      </label>
      <label className="control">
        Shape
        <select value={shape.index} onChange={(event) => void native.setBandShape(band, Number(event.target.value))}>
          {shape.choices.map((choice, index) => (
            <option key={choice} value={index}>
              {choice}
            </option>
          ))}
        </select>
      </label>
      <ParameterSlider label="Freq" parameter={frequency} format={formatFrequency} />
      <ParameterSlider
        label="Gain"
        parameter={gain}
        format={(value) => `${value.toFixed(1)} dB`}
        disabled={!shapesWithGain.has(shapeName)}
      />
      <ParameterSlider label="Q" parameter={q} format={(value) => value.toFixed(2)} />
      <label className="control" aria-disabled={!isCut}>
        Slope
        <select value={slope.index} disabled={!isCut} onChange={(event) => slope.setIndex(Number(event.target.value))}>
          {slope.choices.map((choice, index) => (
            <option key={choice} value={index}>
              {choice}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};
