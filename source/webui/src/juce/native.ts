import * as Juce from '@juce-framework/webview';

/** Native functions registered in PluginEditor::createWebViewOptions(). */
export const native = {
  getPluginInfo: Juce.getNativeFunction('getPluginInfo'),
  setTestSignal: Juce.getNativeFunction('setTestSignal'),
  setAnalyzerActive: Juce.getNativeFunction('setAnalyzerActive'),
  requestResponse: Juce.getNativeFunction('requestResponse'),
  /** (shapeIndex, frequencyHz, gainDb) => the new band's number, or undefined when all bands are used. */
  createBand: Juce.getNativeFunction('createBand'),
  /** (band) */
  deleteBand: Juce.getNativeFunction('deleteBand'),
  /** (band, shapeIndex): also adjusts q and gain to suit the new shape. */
  setBandShape: Juce.getNativeFunction('setBandShape'),
  // Temporary scaffolding for the DSP learning steps.
  setAnalyzerSource: Juce.getNativeFunction('setAnalyzerSource'),
};
