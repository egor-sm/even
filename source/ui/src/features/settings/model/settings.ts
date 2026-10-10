import { create } from 'zustand';

import { native } from '~/shared/api';

/** Preferences of the user (not of the project), kept in C++ (UserSettings) for every instance. */
export const useSettingsStore = create<{ theme: 'dark' | 'light'; scale: number }>()(() => ({
  theme: 'dark',
  scale: 100,
}));

export const uiScales = [75, 100, 125, 150, 175, 200] as const;

/** Takes the theme and the scale from the settings as C++ answers them. */
export const applySettings = (value: unknown): void => {
  if (typeof value !== 'object' || value === null) return;
  const theme = Reflect.get(value, 'theme');
  const scale = Reflect.get(value, 'scale');
  if (theme === 'dark' || theme === 'light') useSettingsStore.setState({ theme });
  if (typeof scale === 'number') useSettingsStore.setState({ scale });
};

export const toggleTheme = (): void => {
  const theme = useSettingsStore.getState().theme === 'dark' ? 'light' : 'dark';
  useSettingsStore.setState({ theme });
  void native.setSetting('theme', theme).then(applySettings);
};

/** Changing the scale resizes the plugin window. */
export const setScale = (scale: number): void => void native.setSetting('scale', scale).then(applySettings);
