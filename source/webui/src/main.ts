import * as Juce from '@juce-framework/webview';

import './style.css';

type PluginInfo = {
  name: string;
  version: string;
  juceVersion: string;
  wrapper: string;
};

const muteButton = document.querySelector<HTMLButtonElement>('#mute')!;
const infoLabel = document.querySelector<HTMLParagraphElement>('#info')!;

// Bound to the "mute" parameter through WebToggleButtonRelay on the C++ side.
const muteState = Juce.getToggleState('mute');

const renderMute = () => {
  const muted = muteState.getValue();
  muteButton.textContent = muted ? 'Muted' : 'Mute';
  muteButton.setAttribute('aria-pressed', String(muted));
};

muteButton.addEventListener('click', () => muteState.setValue(!muteState.getValue()));
muteState.valueChangedEvent.addListener(renderMute);
renderMute();

const pluginInfoKeys = ['name', 'version', 'juceVersion', 'wrapper'] as const;

const isPluginInfo = (value: unknown): value is PluginInfo =>
  typeof value === 'object' &&
  value !== null &&
  pluginInfoKeys.every((key) => typeof Reflect.get(value, key) === 'string');

const getPluginInfo = Juce.getNativeFunction('getPluginInfo');

getPluginInfo()
  .then((info) => {
    if (!isPluginInfo(info)) throw new Error('Unexpected getPluginInfo() result');
    infoLabel.textContent = `${info.name} ${info.version} · ${info.wrapper} · ${info.juceVersion}`;
  })
  .catch(() => {
    infoLabel.textContent = 'Plugin backend is not available';
  });
