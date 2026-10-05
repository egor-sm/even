import { Menu } from '@ark-ui/react/menu';
import { Portal } from '@ark-ui/react/portal';
import { Fragment } from 'react';

import { UiIcon } from './icons';
import { usePortalContainer } from './ui-root';

export type SelectMenuOption<Value extends string> = {
  value: Value;
  label: string;
  /** A separator line goes above this option. */
  separated?: boolean;
};

type SelectMenuProps<Value extends string> = {
  /** Shown before the value on the pill, e.g. "Analyzer". */
  label: string;
  value: Value;
  options: readonly SelectMenuOption<Value>[];
  onValueChange: (value: Value) => void;
  /** Where the menu opens relative to the pill. */
  placement?: 'top-start' | 'bottom-start';
};

/**
 * A pill showing a choice, opening a menu of the options (the current one checked). Keyboard: arrows
 * move, Enter picks, Escape closes; a click outside closes too.
 */
export function SelectMenu<Value extends string>({
  label,
  value,
  options,
  onValueChange,
  placement = 'top-start',
}: SelectMenuProps<Value>) {
  const container = usePortalContainer();
  const current = options.find((option) => option.value === value);

  return (
    <Menu.Root positioning={{ placement, gutter: 4 }} aria-label={label}>
      <Menu.Trigger className="eq-pill">
        <span className="eq-pill__label">{label}</span>
        <span>{current?.label}</span>
        <UiIcon name="chevronDown" size={12} />
      </Menu.Trigger>
      <Portal container={container}>
        <Menu.Positioner className="kit-positioner">
          <Menu.Content className="eq-menu kit-menu">
            <Menu.RadioItemGroup
              value={value}
              onValueChange={(details) => {
                const option = options.find((candidate) => candidate.value === details.value);
                if (option !== undefined) onValueChange(option.value);
              }}
            >
              {options.map((option) => (
                <Fragment key={option.value}>
                  {option.separated === true && <Menu.Separator className="eq-menu__sep" />}
                  <Menu.RadioItem className="eq-menu__item" value={option.value}>
                    <Menu.ItemText>{option.label}</Menu.ItemText>
                    <Menu.ItemIndicator className="kit-check">
                      <UiIcon name="check" size={14} />
                    </Menu.ItemIndicator>
                  </Menu.RadioItem>
                </Fragment>
              ))}
            </Menu.RadioItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
