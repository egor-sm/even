import { native } from '~/shared/api';
import { createStore } from '~/shared/lib';

/** Preferences of the user (not of the project), kept in C++ (UserSettings) for every instance. */
export const settingsStore = createStore<{ theme: 'dark' | 'light'; scale: number }>({ theme: 'dark', scale: 100 });

export const uiScales = [75, 100, 125, 150, 175, 200] as const;

/** Takes {theme, scale} as C++ answers it. */
export const applySettings = (value: unknown): void => {
  if (typeof value !== 'object' || value === null) return;
  const theme = Reflect.get(value, 'theme');
  const scale = Reflect.get(value, 'scale');
  if (theme === 'dark' || theme === 'light') settingsStore.set({ theme });
  if (typeof scale === 'number') settingsStore.set({ scale });
};

export const toggleTheme = (): void => {
  const theme = settingsStore.get().theme === 'dark' ? 'light' : 'dark';
  settingsStore.set({ theme });
  void native.setSetting('theme', theme).then(applySettings);
};

/** Changing the scale resizes the plugin window. */
export const setScale = (scale: number): void => void native.setSetting('scale', scale).then(applySettings);
