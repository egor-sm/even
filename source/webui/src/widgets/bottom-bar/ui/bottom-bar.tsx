import { AnalyzerModeMenu } from '~/features/analyzer-mode';

import styles from './bottom-bar.module.css';

/** The analyzer mode, for now the only control of the bottom bar. */
export function BottomBar() {
  return (
    <footer className={styles.bar}>
      <AnalyzerModeMenu />
    </footer>
  );
}
