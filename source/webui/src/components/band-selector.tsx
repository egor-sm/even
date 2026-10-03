import { bandColor } from '../band-colors';
import { useToggleParameter } from '../juce/use-toggle-parameter';

// Must match parameters::numBands on the C++ side.
const numBands = 12;

type BandTabProps = {
  band: number;
  selected: boolean;
  onSelect: (band: number) => void;
};

const BandTab = ({ band, selected, onSelect }: BandTabProps) => {
  const [enabled] = useToggleParameter(`band${band}Enabled`);

  return (
    <button
      type="button"
      className="band-tab"
      aria-pressed={selected}
      aria-label={`Band ${band}`}
      data-enabled={enabled}
      style={enabled ? { backgroundColor: bandColor(band) } : undefined}
      onClick={() => onSelect(band)}
    >
      {band}
    </button>
  );
};

type BandSelectorProps = {
  selected: number;
  onSelect: (band: number) => void;
};

/** One button per band: filled with the band color when the band is on, outlined when selected. */
export const BandSelector = ({ selected, onSelect }: BandSelectorProps) => (
  <div className="band-selector">
    {Array.from({ length: numBands }, (_, i) => i + 1).map((band) => (
      <BandTab key={band} band={band} selected={band === selected} onSelect={onSelect} />
    ))}
  </div>
);
