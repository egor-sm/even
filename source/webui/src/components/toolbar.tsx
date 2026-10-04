import { useEffect, useState } from 'react';

import type { RendererKind } from '../analyzer/spectrum-view';
import { native } from '../juce/native';
import { useHistory } from '../juce/use-history';
import { usePluginInfo } from '../juce/use-plugin-info';
import { useToggleParameter } from '../juce/use-toggle-parameter';

type ToolbarProps = {
  renderer: RendererKind;
  onRendererChange: (renderer: RendererKind) => void;
};

export const Toolbar = ({ renderer, onRendererChange }: ToolbarProps) => {
  const [muted, setMuted] = useToggleParameter('mute');
  const [testSignal, setTestSignal] = useState(false);
  const [analyzerMode, setAnalyzerMode] = useState('prepost');
  const info = usePluginInfo();
  const history = useHistory();

  // The mode lives in C++ without being saved: hand it the page's choice when the page loads.
  useEffect(() => void native.setAnalyzerMode('prepost'), []);

  return (
    <header className="toolbar">
      <h1 className="title">Even</h1>
      <button type="button" disabled={!history.canUndo} onClick={history.undo}>
        Undo
      </button>
      <button type="button" disabled={!history.canRedo} onClick={history.redo}>
        Redo
      </button>
      <label className="control">
        Renderer
        <select
          value={renderer}
          onChange={(event) => onRendererChange(event.target.value === 'canvas2d' ? 'canvas2d' : 'webgl')}
        >
          <option value="webgl">WebGL</option>
          <option value="canvas2d">Canvas 2D</option>
        </select>
      </label>
      <label className="control">
        Analyzer
        <select
          value={analyzerMode}
          onChange={(event) => {
            setAnalyzerMode(event.target.value);
            void native.setAnalyzerMode(event.target.value);
          }}
        >
          <option value="prepost">Pre + Post</option>
          <option value="post">Post</option>
          <option value="pre">Pre</option>
          <option value="off">Off</option>
        </select>
      </label>
      <label className="control">
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
      <button className="mute" type="button" aria-pressed={muted} onClick={() => setMuted(!muted)}>
        {muted ? 'Muted' : 'Mute'}
      </button>
      <span className="info">
        {info === null
          ? 'Plugin backend is not available'
          : `${info.name} ${info.version} · ${info.wrapper} · ${info.juceVersion}`}
      </span>
    </header>
  );
};
