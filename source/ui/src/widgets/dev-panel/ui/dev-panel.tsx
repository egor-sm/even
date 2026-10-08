import { useEffect, useState } from 'react';

import { setScale, useSettingsStore, uiScales } from '~/features/settings';
import { native, setMute } from '~/shared/api';
import { Checkbox, SelectMenu, UiIcon } from '~/shared/ui';

import { analyzerStats } from '../model/analyzer-stats';
import { AnalyzerTuning } from './analyzer-tuning';
import styles from './dev-panel.module.css';

const scaleOptions = uiScales.map((value) => ({ value: String(value), label: `${value}%` }));

// Whether the panel is open survives reloads (hot reload, reopening the plug-in) in this browser.
const openKey = 'even.devPanel.open';
const readOpen = (): boolean => {
  try {
    return localStorage.getItem(openKey) === 'true';
  } catch {
    return false;
  }
};
const writeOpen = (open: boolean): void => {
  try {
    localStorage.setItem(openKey, String(open));
  } catch {
    // Storage unavailable: the panel just starts closed next time.
  }
};

/**
 * Development aids behind a button in the bottom right corner, available in dev builds or with
 * Ctrl+Shift+D: test signal, mute, UI scale, analyzer variants and stats.
 */
export function DevPanel() {
  const [open, setOpen] = useState(readOpen);
  const toggle = () => {
    setOpen(!open);
    writeOpen(!open);
  };

  return (
    <>
      <button
        type="button"
        className={styles.toggle}
        aria-label="Development panel"
        aria-expanded={open}
        title="Development panel (Ctrl+Shift+D hides it)"
        onClick={toggle}
      >
        <UiIcon name="bug" size={16} />
      </button>
      {open && <DevPanelContent />}
    </>
  );
}

function DevPanelContent() {
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
      <AnalyzerTuning />
      <pre>{statsText}</pre>
    </div>
  );
}
