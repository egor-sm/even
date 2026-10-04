import { ThemeButton, settingsStore } from '~/features/settings';
import { UndoRedoButtons } from '~/features/undo-redo';
import { useStore } from '~/shared/lib';
import { logoDark, logoLight } from '~/shared/ui';

/** Logo, undo and redo, theme switch. */
export const TopBar = () => {
  const theme = useStore(settingsStore, (state) => state.theme);

  return (
    <header className="top-bar">
      <img className="logo" src={theme === 'light' ? logoLight : logoDark} alt="Even" />
      <div className="bar-divider" />
      <UndoRedoButtons />
      <div className="bar-spacer" />
      <ThemeButton />
    </header>
  );
};
