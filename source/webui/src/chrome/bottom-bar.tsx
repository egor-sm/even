import type { AnalyzerMode } from '../bridge/native';
import { UiIcon } from '../design/icons';
import { commands } from '../model/commands';
import { uiStore } from '../model/ui';
import { shallowEqual, useStore } from '../store/store';

const modes: readonly { mode: AnalyzerMode; name: string }[] = [
  { mode: 'prepost', name: 'Pre + Post' },
  { mode: 'post', name: 'Post' },
  { mode: 'pre', name: 'Pre' },
  { mode: 'off', name: 'Off' },
];

/** The analyzer mode menu, opening upwards from its pill. */
const AnalyzerMenu = ({ current }: { current: AnalyzerMode }) => (
  <>
    <div className="menu-backdrop" onPointerDown={() => uiStore.set({ analyzerMenu: false })} />
    <div className="eq-menu analyzer-menu" role="menu" aria-label="Analyzer">
      {modes.map(({ mode, name }) => (
        <div key={mode} className="menu-entry">
          {mode === 'off' && <div className="eq-menu__sep" />}
          <button
            type="button"
            className="eq-menu__item"
            role="menuitemradio"
            aria-checked={mode === current}
            style={mode === current ? { color: 'var(--text-primary)' } : undefined}
            onClick={() => commands.setAnalyzerMode(mode)}
          >
            <span>{name}</span>
            <UiIcon
              name="check"
              size={14}
              style={{ stroke: 'var(--state-focus)', opacity: mode === current ? 1 : 0 }}
            />
          </button>
        </div>
      ))}
    </div>
  </>
);

export const BottomBar = () => {
  const { mode, open } = useStore(
    uiStore,
    (state) => ({ mode: state.analyzerMode, open: state.analyzerMenu }),
    shallowEqual,
  );
  const name = modes.find((entry) => entry.mode === mode)?.name ?? '';

  // The menu is a sibling of the bar, not its child: the bar's stacking context sits below the graph,
  // so inside it the menu (and its click-outside backdrop) would end up under the graph.
  return (
    <>
      <footer className="bottom-bar">
        <button
          type="button"
          className="eq-pill"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => uiStore.set({ analyzerMenu: !open })}
        >
          <span className="eq-pill__label">Analyzer</span>
          <span>{name}</span>
          <UiIcon name="chevronDown" size={12} />
        </button>
      </footer>
      {open && <AnalyzerMenu current={mode} />}
    </>
  );
};
