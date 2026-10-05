import { Checkbox as Box } from '@ark-ui/react/checkbox';
import type { ReactNode } from 'react';

import { UiIcon } from './icons';

type CheckboxProps = { checked: boolean; onCheckedChange: (checked: boolean) => void; children: ReactNode };

export function Checkbox({ checked, onCheckedChange, children }: CheckboxProps) {
  return (
    <Box.Root
      className="kit-checkbox"
      checked={checked}
      onCheckedChange={(details) => onCheckedChange(details.checked === true)}
    >
      <Box.Control className="kit-checkbox__control">
        <Box.Indicator>
          <UiIcon name="check" size={10} />
        </Box.Indicator>
      </Box.Control>
      <Box.Label>{children}</Box.Label>
      <Box.HiddenInput />
    </Box.Root>
  );
}
