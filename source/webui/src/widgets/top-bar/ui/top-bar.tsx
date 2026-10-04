import { ThemeButton, settingsStore } from '~/features/settings';
import { UndoRedoButtons } from '~/features/undo-redo';
import { useStore } from '~/shared/lib';
import { logoDark, logoLight } from '~/shared/ui';

import styles from './top-bar.module.css';

/** Logo, undo and redo, theme switch. */
export function TopBar() {
  const theme = useStore(settingsStore, (state) => state.theme);

  return (
    <header className={styles.bar}>
      <img className={styles.logo} src={theme === 'light' ? logoLight : logoDark} alt="Even" />
      <div className={styles.divider} />
      <UndoRedoButtons />
      <div className={styles.spacer} />
      <ThemeButton />
    </header>
  );
}
