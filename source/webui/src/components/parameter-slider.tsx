import type { SliderParameter } from '../juce/use-slider-parameter';

type ParameterSliderProps = {
  label: string;
  parameter: SliderParameter;
  format: (value: number) => string;
  disabled?: boolean;
};

/** A native range input bound to a plugin parameter (moves in normalised [0, 1] space). */
export const ParameterSlider = ({ label, parameter, format, disabled = false }: ParameterSliderProps) => (
  <label className="control" aria-disabled={disabled}>
    {label}
    <input
      type="range"
      min={0}
      max={1}
      step={0.001}
      value={parameter.normalised}
      disabled={disabled}
      onPointerDown={parameter.beginGesture}
      onPointerUp={parameter.endGesture}
      onChange={(event) => parameter.setNormalised(Number(event.target.value))}
    />
    <span className="value">{format(parameter.value)}</span>
  </label>
);
