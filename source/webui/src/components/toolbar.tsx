import { useState } from 'react';

import type { RendererKind } from '../analyzer/spectrum-view';
import { native } from '../juce/native';
import { usePluginInfo } from '../juce/use-plugin-info';
import { useSliderParameter } from '../juce/use-slider-parameter';
import { useToggleParameter } from '../juce/use-toggle-parameter';
import { ParameterSlider } from './parameter-slider';

type ToolbarProps = {
  renderer: RendererKind;
  onRendererChange: (renderer: RendererKind) => void;
};

export const Toolbar = ({ renderer, onRendererChange }: ToolbarProps) => {
  const [muted, setMuted] = useToggleParameter('mute');
  const demoQ = useSliderParameter('demoQ');
  const demoGain = useSliderParameter('demoGain');
  const [testSignal, setTestSignal] = useState(false);
  const [demoShape, setDemoShape] = useState('off');
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
        Band
        <select
          value={demoShape}
          onChange={(event) => {
            setDemoShape(event.target.value);
            void native.setDemoShape(event.target.value);
          }}
        >
          <option value="off">Off</option>
          <option value="bell">Bell</option>
          <option value="lowShelf">Low Shelf</option>
          <option value="highShelf">High Shelf</option>
          <option value="lowCut">Low Cut</option>
          <option value="highCut">High Cut</option>
          <option value="notch">Notch</option>
          <option value="bandPass">Band Pass</option>
        </select>
        @ 1 kHz
      </label>
      <ParameterSlider label="Gain" parameter={demoGain} format={(value) => `${value.toFixed(1)} dB`} />
      <ParameterSlider label="Q" parameter={demoQ} format={(value) => value.toFixed(2)} />
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
