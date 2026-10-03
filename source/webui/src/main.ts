import * as Juce from '@juce-framework/webview';

import { decodeBase64Frame } from './analyzer/frame';
import { Spectrum } from './analyzer/spectrum';
import { SpectrumView } from './analyzer/spectrum-view';
import { AnalyzerStats } from './analyzer/stats';

import './style.css';

declare global {
  interface Window {
    /** Called by C++ (PluginEditor::handleAsyncUpdate) via evaluateJavascript for every analyzer frame. */
    eqitOnAnalyzerFrame?: (sentAtMs: number, frameBase64: string) => void;
  }
}

type PluginInfo = {
  name: string;
  version: string;
  juceVersion: string;
  wrapper: string;
};

const element = <T extends Element>(selector: string, type: new () => T): T => {
  const found = document.querySelector(selector);
  if (!(found instanceof type)) throw new Error(`Missing element ${selector}`);
  return found;
};

const muteButton = element('#mute', HTMLButtonElement);
const infoLabel = element('#info', HTMLSpanElement);
const rendererSelect = element('#renderer', HTMLSelectElement);
const testSignalToggle = element('#test-signal', HTMLInputElement);
const statsLabel = element('#stats', HTMLPreElement);

// Mute: bound to the "mute" parameter through WebToggleButtonRelay on the C++ side.
const muteState = Juce.getToggleState('mute');

const renderMute = () => {
  const muted = muteState.getValue();
  muteButton.textContent = muted ? 'Muted' : 'Mute';
  muteButton.setAttribute('aria-pressed', String(muted));
};

muteButton.addEventListener('click', () => muteState.setValue(!muteState.getValue()));
muteState.valueChangedEvent.addListener(renderMute);
renderMute();

// Plugin info: a plain native function call.
const pluginInfoKeys = ['name', 'version', 'juceVersion', 'wrapper'] as const;

const isPluginInfo = (value: unknown): value is PluginInfo =>
  typeof value === 'object' &&
  value !== null &&
  pluginInfoKeys.every((key) => typeof Reflect.get(value, key) === 'string');

Juce.getNativeFunction('getPluginInfo')()
  .then((info) => {
    if (!isPluginInfo(info)) throw new Error('Unexpected getPluginInfo() result');
    infoLabel.textContent = `${info.name} ${info.version} · ${info.wrapper} · ${info.juceVersion}`;
  })
  .catch(() => {
    infoLabel.textContent = 'Plugin backend is not available';
  });

// Analyzer: C++ pushes frames via evaluateJavascript, the page redraws on demand (at most 60 fps).
const maxRenderFps = 60;

const stats = new AnalyzerStats();
const spectrum = new Spectrum();

let renderScheduled = false;
let lastRenderAt = 0;

const render = (now: number) => {
  renderScheduled = false;

  // On high refresh rate displays skip frames to stay within maxRenderFps.
  if (now - lastRenderAt < 1000 / maxRenderFps - 1) {
    requestRender();
    return;
  }

  const dtSeconds = Math.min((now - lastRenderAt) / 1000, 0.1);
  lastRenderAt = now;

  const moving = spectrum.tick(dtSeconds);
  view.draw(spectrum.frequencies, spectrum.display);
  stats.onRender(now);

  if (moving) requestRender();
};

function requestRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(render);
}

const view = new SpectrumView(element('#analyzer', HTMLElement), requestRender);

const applyRenderer = () => view.setRenderer(rendererSelect.value === 'canvas2d' ? 'canvas2d' : 'webgl');
rendererSelect.addEventListener('change', applyRenderer);
applyRenderer();

window.eqitOnAnalyzerFrame = (sentAtMs, frameBase64) => {
  const receivedAt = performance.now();
  const frame = decodeBase64Frame(frameBase64);
  if (frame === null) return;

  spectrum.setFrame(frame);
  stats.onFrame(receivedAt, Date.now() - sentAtMs, frameBase64.length, performance.now() - receivedAt);
  requestRender();
};

const setTestSignal = Juce.getNativeFunction('setTestSignal');
testSignalToggle.addEventListener('change', () => void setTestSignal(testSignalToggle.checked));

// Stop the analyzer entirely while the page is hidden (window hidden, minimised or occluded).
const setAnalyzerActive = Juce.getNativeFunction('setAnalyzerActive');
const syncAnalyzerActivity = () => void setAnalyzerActive(document.visibilityState === 'visible');
document.addEventListener('visibilitychange', syncAnalyzerActivity);
syncAnalyzerActivity();

// Stats are refreshed on their own slow timer so an idle analyzer does not keep the page busy.
setInterval(() => {
  statsLabel.textContent = stats.format(performance.now());
}, 500);
