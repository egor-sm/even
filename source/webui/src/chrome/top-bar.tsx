import { logoDark, logoLight, UiIcon } from '~/shared/ui';
import { commands } from '~/model/commands';
import { uiStore } from '~/model/ui';
import { shallowEqual, useStore } from '~/shared/lib';

const ThemeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" />
  </svg>
);

/** Logo, undo and redo, theme switch. */
export const TopBar = () => {
  const { theme, canUndo, canRedo } = useStore(
    uiStore,
    (state) => ({ theme: state.theme, canUndo: state.canUndo, canRedo: state.canRedo }),
    shallowEqual,
  );
  const themeLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <header className="top-bar">
      <img className="logo" src={theme === 'light' ? logoLight : logoDark} alt="Even" />
      <div className="bar-divider" />
      <div className="bar-group">
        <button type="button" className="eq-ib" aria-label="Undo" disabled={!canUndo} onClick={commands.undo}>
          <UiIcon name="undo" />
        </button>
        <button type="button" className="eq-ib" aria-label="Redo" disabled={!canRedo} onClick={commands.redo}>
          <UiIcon name="redo" />
        </button>
      </div>
      <div className="bar-spacer" />
      <button type="button" className="eq-ib" aria-label={themeLabel} title={themeLabel} onClick={commands.toggleTheme}>
        <ThemeIcon />
      </button>
    </header>
  );
};
