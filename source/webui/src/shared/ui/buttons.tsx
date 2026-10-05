import { clsx } from 'clsx';
import type { ReactNode } from 'react';

type ButtonBase = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
};

/** A square icon button of the bars (undo, redo, theme). */
export function IconButton({ label, onClick, disabled, children, title }: ButtonBase & { title?: string }) {
  return (
    <button type="button" className="eq-ib" aria-label={label} title={title} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

/** A small action of the dock (bypass, solo, delete); `tone` colors it while on. */
export function ActionButton({
  label,
  onClick,
  pressed,
  tone,
  children,
}: ButtonBase & { pressed?: boolean; tone?: 'danger' | 'band' }) {
  return (
    <button
      type="button"
      className={clsx('eq-act', tone === 'danger' && 'is-danger', tone === 'band' && 'is-solo')}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
