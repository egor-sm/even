import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useSettingsStore } from '~/features/settings';
import { UiRoot } from '~/shared/ui';
import { BandDock } from '~/widgets/band-dock';
import { BottomBar } from '~/widgets/bottom-bar';
import { analyzerStats, DevPanel } from '~/widgets/dev-panel';
import { GraphView } from '~/widgets/eq-graph';
import { TopBar } from '~/widgets/top-bar';

import { connectBackend } from './connect-backend';

const onAnalyzerDraw = (now: number) => analyzerStats.onRender(now);

export function App() {
  const { theme, scale } = useSettingsStore(useShallow((state) => state));
  const [devPanel, setDevPanel] = useState(import.meta.env.DEV);

  useEffect(() => connectBackend(), []);
  useEffect(() => analyzerStats.listen(), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') setDevPanel((shown) => !shown);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // The web view's own context menu (Reload, …) does not belong in a plugin. Development builds keep
  // it for Inspect Element.
  useEffect(() => {
    if (import.meta.env.DEV) return undefined;
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    window.addEventListener('contextmenu', onContextMenu);
    return () => window.removeEventListener('contextmenu', onContextMenu);
  }, []);

  return (
    <UiRoot theme={theme} scale={scale}>
      <TopBar />
      <GraphView overlay={<BandDock />} onAnalyzerDraw={onAnalyzerDraw} />
      <BottomBar />
      {devPanel && <DevPanel />}
    </UiRoot>
  );
}
