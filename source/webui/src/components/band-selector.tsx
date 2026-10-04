import { bandColor } from '../band-colors';
import { numBands } from '../juce/bands';
import { useToggleParameter } from '../juce/use-toggle-parameter';

type BandTabProps = {
  band: number;
  selected: boolean;
  onSelect: (band: number) => void;
};

const BandTab = ({ band, selected, onSelect }: BandTabProps) => {
  const [used] = useToggleParameter(`band${band}Used`);

  return (
    <button
      type="button"
      className="band-tab"
      aria-pressed={selected}
      aria-label={`Band ${band}`}
      data-enabled={used}
      style={used ? { backgroundColor: bandColor(band) } : undefined}
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

/** One button per band slot: filled with the band color when the slot is used, outlined when selected. */
export const BandSelector = ({ selected, onSelect }: BandSelectorProps) => (
  <div className="band-selector">
    {Array.from({ length: numBands }, (_, i) => i + 1).map((band) => (
      <BandTab key={band} band={band} selected={band === selected} onSelect={onSelect} />
    ))}
  </div>
);
