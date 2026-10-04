import { useEffect, useState } from 'react';

import { native } from '../bridge/native';
import { setMute } from '../bridge/parameters';
import { commands } from '../model/commands';
import { uiStore } from '../model/ui';
import { useStore } from '../store/store';

const scales = [75, 100, 125, 150, 175, 200];

/** Development aids, shown in dev builds or with Ctrl+Shift+D: test signal, mute, UI scale, analyzer stats. */
export const DevPanel = ({ stats }: { stats: () => string }) => {
  const scale = useStore(uiStore, (state) => state.scale);
  const [testSignal, setTestSignal] = useState(false);
  const [muted, setMuted] = useState(false);
  const [statsText, setStatsText] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setStatsText(stats()), 500);
    return () => clearInterval(timer);
  }, [stats]);

  return (
    <div className="dev-panel">
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
        <select value={scale} onChange={(event) => commands.setScale(Number(event.target.value))}>
          {scales.map((value) => (
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
