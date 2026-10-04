import { useEffect, useState } from 'react';

import { setScale, settingsStore, uiScales } from '~/features/settings';
import { native, setMute } from '~/shared/api';
import { useStore } from '~/shared/lib';

import { analyzerStats } from '../model/analyzer-stats';
import styles from './dev-panel.module.css';

/** Development aids, shown in dev builds or with Ctrl+Shift+D: test signal, mute, UI scale, analyzer stats. */
export const DevPanel = () => {
  const scale = useStore(settingsStore, (state) => state.scale);
  const [testSignal, setTestSignal] = useState(false);
  const [muted, setMuted] = useState(false);
  const [statsText, setStatsText] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setStatsText(analyzerStats.format(performance.now())), 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.panel}>
      <label>
        <input
          type="checkbox"
          checked={testSignal}
          onChange={(event) => {
            setTestSignal(event.target.checked);
            void native.setTestSignal(event.target.checked);
          }}
        />
        Test signal
      </label>
      <label>
        <input
          type="checkbox"
          checked={muted}
          onChange={(event) => {
            setMuted(event.target.checked);
            setMute(event.target.checked);
          }}
        />
        Mute
      </label>
      <label>
        Scale
        <select value={scale} onChange={(event) => setScale(Number(event.target.value))}>
          {uiScales.map((value) => (
            <option key={value} value={value}>
              {value}%
            </option>
          ))}
        </select>
      </label>
      <pre>{statsText}</pre>
    </div>
  );
};
