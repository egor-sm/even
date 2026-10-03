import type { SliderParameter } from '../juce/use-slider-parameter';

type ParameterSliderProps = {
  label: string;
  parameter: SliderParameter;
  format: (value: number) => string;
};

/** A native range input bound to a plugin parameter (moves in normalised [0, 1] space). */
export const ParameterSlider = ({ label, parameter, format }: ParameterSliderProps) => (
  <label className="control">
    {label}
    <input
      type="range"
      min={0}
      max={1}
      step={0.001}
      value={parameter.normalised}
      onPointerDown={parameter.beginGesture}
      onPointerUp={parameter.endGesture}
      onChange={(event) => parameter.setNormalised(Number(event.target.value))}
    />
    <span className="value">{format(parameter.value)}</span>
  </label>
);
