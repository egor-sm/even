import type { SliderParameter } from '../juce/use-slider-parameter';

type ParameterSliderProps = {
  label: string;
  parameter: SliderParameter;
  format: (value: number) => string;
  disabled?: boolean;
};

/** A native range input bound to a plugin parameter; moves along the parameter's scale. */
export const ParameterSlider = ({ label, parameter, format, disabled = false }: ParameterSliderProps) => (
  <label className="control" aria-disabled={disabled}>
    {label}
    <input
      type="range"
      min={0}
      max={1}
      step={0.001}
      value={parameter.position}
      disabled={disabled}
      onPointerDown={parameter.beginGesture}
      onPointerUp={parameter.endGesture}
      onChange={(event) => parameter.setPosition(Number(event.target.value))}
    />
    <span className="value">{format(parameter.value)}</span>
  </label>
);
