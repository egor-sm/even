import { useEffect } from 'react';

import { connectBackend } from './bridge/connection';
import { BottomBar } from './chrome/bottom-bar';
import { TopBar } from './chrome/top-bar';
import { DevPanel } from './dev/dev-panel';
import { analyzerStats } from './dev/stats';
import { GraphView } from './graph/graph-view';
import { uiStore } from './model/ui';
import { shallowEqual, useStore } from './store/store';

const formatStats = () => analyzerStats.format(performance.now());

export const App = () => {
  const { theme, scale, devPanel } = useStore(
    uiStore,
    (state) => ({ theme: state.theme, scale: state.scale, devPanel: state.devPanel }),
    shallowEqual,
  );

  useEffect(() => connectBackend(), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd')
        uiStore.set(({ devPanel: shown }) => ({ devPanel: !shown }));
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
    <div className="eq" data-theme={theme} style={{ transform: `scale(${scale / 100})` }}>
      <TopBar />
      <GraphView />
      <BottomBar />
      {devPanel && <DevPanel stats={formatStats} />}
    </div>
  );
};
