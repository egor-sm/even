import { useState } from 'react';

import type { RendererKind } from '../analyzer/spectrum-view';
import { native } from '../juce/native';
import { usePluginInfo } from '../juce/use-plugin-info';
import { useSliderParameter } from '../juce/use-slider-parameter';
import { useToggleParameter } from '../juce/use-toggle-parameter';

type ToolbarProps = {
  renderer: RendererKind;
  onRendererChange: (renderer: RendererKind) => void;
};

export const Toolbar = ({ renderer, onRendererChange }: ToolbarProps) => {
  const [muted, setMuted] = useToggleParameter('mute');
  const demoQ = useSliderParameter('demoQ');
  const [testSignal, setTestSignal] = useState(false);
  const [demoFilter, setDemoFilter] = useState('off');
  const [analyzerSource, setAnalyzerSource] = useState('input');
  const info = usePluginInfo();

  return (
    <header className="toolbar">
      <h1 className="title">Equalize It</h1>
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
        Filter
        <select
          value={demoFilter}
          onChange={(event) => {
            setDemoFilter(event.target.value);
            void native.setDemoFilter(event.target.value);
          }}
        >
          <option value="off">Off</option>
          <option value="lowCut6">Low Cut 6 dB/oct</option>
          <option value="highCut6">High Cut 6 dB/oct</option>
          <option value="lowCut12">Low Cut 12 dB/oct</option>
          <option value="highCut12">High Cut 12 dB/oct</option>
          <option value="bandPass">Band Pass</option>
        </select>
        @ 1 kHz
      </label>
      <label className="control">
        Q
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={demoQ.normalised}
          onPointerDown={demoQ.beginGesture}
          onPointerUp={demoQ.endGesture}
          onChange={(event) => demoQ.setNormalised(Number(event.target.value))}
        />
        <span className="value">{demoQ.value.toFixed(2)}</span>
      </label>
      <label className="control">
        Analyzer
        <select
          value={analyzerSource}
          onChange={(event) => {
            setAnalyzerSource(event.target.value);
            void native.setAnalyzerSource(event.target.value);
          }}
        >
          <option value="input">Input</option>
          <option value="output">Output</option>
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
