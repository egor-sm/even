import { SegmentGroup } from '@ark-ui/react/segment-group';
import type { ReactNode } from 'react';

export type Segment<Value extends string> = { value: Value; content: ReactNode; label?: string };

type SegmentedControlProps<Value extends string> = {
  label: string;
  value: Value;
  segments: readonly Segment<Value>[];
  onValueChange: (value: Value) => void;
  /** `compact`: the small segments of an axis tag. */
  variant?: 'default' | 'compact';
  className?: string;
};

/** One of a few options, side by side; arrows move between them. */
export function SegmentedControl<Value extends string>({
  label,
  value,
  segments,
  onValueChange,
  variant = 'default',
  className,
}: SegmentedControlProps<Value>) {
  const item = variant === 'compact' ? 'eq-axis__seg' : 'eq-seg';
  return (
    <SegmentGroup.Root
      className={className ?? (variant === 'default' ? 'eq-segs' : undefined)}
      aria-label={label}
      orientation="horizontal"
      value={value}
      onValueChange={(details) => {
        const segment = segments.find((candidate) => candidate.value === details.value);
        if (segment !== undefined) onValueChange(segment.value);
      }}
    >
      {segments.map((segment) => (
        <SegmentGroup.Item key={segment.value} className={item} value={segment.value}>
          <SegmentGroup.ItemText aria-label={segment.label}>{segment.content}</SegmentGroup.ItemText>
          <SegmentGroup.ItemControl />
          <SegmentGroup.ItemHiddenInput />
        </SegmentGroup.Item>
      ))}
    </SegmentGroup.Root>
  );
}
