import { useCallback, useEffect, useState } from 'react';

import { native } from './native';

/** Preferences of the user (not of the project), kept in C++ (UserSettings) for every instance. */
export type Settings = { theme: 'dark' | 'light'; scale: number };

export const uiScales = [75, 100, 125, 150, 175, 200] as const;

const toSettings = (value: unknown): Settings | null => {
  if (typeof value !== 'object' || value === null) return null;
  const theme = Reflect.get(value, 'theme');
  const scale = Reflect.get(value, 'scale');
  if ((theme !== 'dark' && theme !== 'light') || typeof scale !== 'number') return null;
  return { theme, scale };
};

/** The settings (null until loaded) and a setter; changing the scale resizes the plugin window. */
export const useSettings = () => {
  const [settings, setSettings] = useState<Settings | null>(null);

  const update = useCallback((result: unknown) => {
    const next = toSettings(result);
    if (next !== null) setSettings(next);
  }, []);

  useEffect(() => {
    native
      .getSettings()
      .then(update)
      .catch(() => {});
  }, [update]);

  const setSetting = useCallback(
    <Key extends keyof Settings>(key: Key, value: Settings[Key]) => void native.setSetting(key, value).then(update),
    [update],
  );

  return { settings, setSetting };
};
