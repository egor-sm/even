import { useEffect, useState } from 'react';

import { setScale, useSettingsStore, uiScales } from '~/features/settings';
import { native, setMute } from '~/shared/api';
import { Checkbox, SelectMenu } from '~/shared/ui';

import { analyzerStats } from '../model/analyzer-stats';
import styles from './dev-panel.module.css';

const scaleOptions = uiScales.map((value) => ({ value: String(value), label: `${value}%` }));

/** Development aids, shown in dev builds or with Ctrl+Shift+D: test signal, mute, UI scale, analyzer stats. */
export function DevPanel() {
  const scale = useSettingsStore((state) => state.scale);
  const [testSignal, setTestSignal] = useState(false);
  const [muted, setMuted] = useState(false);
  const [statsText, setStatsText] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setStatsText(analyzerStats.format(performance.now())), 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.panel}>
      <Checkbox
        checked={testSignal}
        onCheckedChange={(checked) => {
          setTestSignal(checked);
          void native.setTestSignal(checked);
        }}
      >
        Test signal
      </Checkbox>
      <Checkbox
        checked={muted}
        onCheckedChange={(checked) => {
          setMuted(checked);
          setMute(checked);
        }}
      >
        Mute
      </Checkbox>
      <SelectMenu
        label="Scale"
        value={String(scale)}
        options={scaleOptions}
        onValueChange={(value) => setScale(Number(value))}
      />
      <pre>{statsText}</pre>
    </div>
  );
}
