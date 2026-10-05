import { createContext, type ReactNode, type RefObject, useContext, useRef } from 'react';

const PortalContainer = createContext<RefObject<HTMLDivElement | null> | null>(null);

type UiRootProps = {
  theme: 'dark' | 'light';
  /** UI scale in percent: the 1280 × 760 window is scaled as a whole. */
  scale: number;
  children: ReactNode;
};

/**
 * The window: the theme and the UI scale apply to everything inside, so popups (menus, selects)
 * open inside it rather than in <body>, where they would lose both.
 */
export function UiRoot({ theme, scale, children }: UiRootProps) {
  const root = useRef<HTMLDivElement>(null);
  return (
    <PortalContainer value={root}>
      <div ref={root} className="eq" data-theme={theme} style={{ transform: `scale(${scale / 100})` }}>
        {children}
      </div>
    </PortalContainer>
  );
}

/** Where popups of the kit are rendered: the window root (undefined outside a UiRoot, e.g. in tests). */
export const usePortalContainer = (): RefObject<HTMLDivElement | null> | undefined =>
  useContext(PortalContainer) ?? undefined;
