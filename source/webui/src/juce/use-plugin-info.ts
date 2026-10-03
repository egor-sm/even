import { useEffect, useState } from 'react';

import { native } from './native';

export type PluginInfo = {
  name: string;
  version: string;
  juceVersion: string;
  wrapper: string;
};

const pluginInfoKeys = ['name', 'version', 'juceVersion', 'wrapper'] as const;

const isPluginInfo = (value: unknown): value is PluginInfo =>
  typeof value === 'object' &&
  value !== null &&
  pluginInfoKeys.every((key) => typeof Reflect.get(value, key) === 'string');

/** Plugin info from C++; null while loading or when no backend is available. */
export const usePluginInfo = (): PluginInfo | null => {
  const [info, setInfo] = useState<PluginInfo | null>(null);

  useEffect(() => {
    let cancelled = false;

    native
      .getPluginInfo()
      .then((result) => {
        if (!cancelled && isPluginInfo(result)) setInfo(result);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return info;
};
