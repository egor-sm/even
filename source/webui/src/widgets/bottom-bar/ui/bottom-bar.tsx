import { useState } from 'react';

import { AnalyzerModeMenu, AnalyzerModePill } from '~/features/analyzer-mode';

import styles from './bottom-bar.module.css';

/** The analyzer mode, for now the only control of the bottom bar. */
export const BottomBar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  // The menu is a sibling of the bar, not its child: the bar's stacking context sits below the graph,
  // so inside it the menu (and its click-outside backdrop) would end up under the graph.
  return (
    <>
      <footer className={styles.bar}>
        <AnalyzerModePill open={menuOpen} onToggle={() => setMenuOpen((open) => !open)} />
      </footer>
      {menuOpen && <AnalyzerModeMenu onClose={() => setMenuOpen(false)} />}
    </>
  );
};
