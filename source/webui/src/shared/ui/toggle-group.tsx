import { ToggleGroup as Group } from '@ark-ui/react/toggle-group';
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
} from 'react';

type ToggleGroupProps = {
  label: string;
  /** The value that is on. */
  value: string;
  className?: string;
  style?: CSSProperties;
  /** E.g. Escape to close the group. */
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onDoubleClick?: (event: MouseEvent<HTMLDivElement>) => void;
  /** Moves the focus to the item that is on when the group appears (keyboard use right away). */
  focusOnMount?: boolean;
  children: ReactNode;
};

/**
 * A row of buttons with one of them on; arrows move the focus along the row (and loop), Enter or
 * Space picks. Picking is up to each item's onSelect, so picking the current item is reported too.
 */
export function ToggleGroup({
  label,
  value,
  className,
  style,
  onKeyDown,
  onPointerDown,
  onDoubleClick,
  focusOnMount = false,
  children,
}: ToggleGroupProps) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusOnMount) root.current?.querySelector<HTMLElement>('[data-state="on"]')?.focus({ preventScroll: true });
  }, [focusOnMount]);

  return (
    <Group.Root
      ref={root}
      className={className}
      style={style}
      aria-label={label}
      value={[value]}
      deselectable={false}
      loopFocus
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {children}
    </Group.Root>
  );
}

type ToggleGroupItemProps = {
  value: string;
  label?: string;
  className?: string;
  style?: CSSProperties;
  onSelect: () => void;
  /** Pointer over the item or keyboard focus on it: e.g. to preview it. */
  onHighlight?: (highlighted: boolean) => void;
  children: ReactNode;
};

export function ToggleGroupItem({
  value,
  label,
  className,
  style,
  onSelect,
  onHighlight,
  children,
}: ToggleGroupItemProps) {
  return (
    <Group.Item
      className={className}
      style={style}
      value={value}
      aria-label={label}
      onClick={onSelect}
      onMouseEnter={() => onHighlight?.(true)}
      onMouseLeave={() => onHighlight?.(false)}
      onFocus={() => onHighlight?.(true)}
      onBlur={() => onHighlight?.(false)}
    >
      {children}
    </Group.Item>
  );
}
