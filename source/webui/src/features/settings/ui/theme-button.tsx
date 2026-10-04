import { useSettingsStore, toggleTheme } from '../model/settings';

function ThemeIcon() {
  return (
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
}

export function ThemeButton() {
  const theme = useSettingsStore((state) => state.theme);
  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <button type="button" className="eq-ib" aria-label={label} title={label} onClick={toggleTheme}>
      <ThemeIcon />
    </button>
  );
}
