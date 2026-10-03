import * as Juce from '@juce-framework/webview';

/** Native functions registered in PluginEditor::createWebViewOptions(). */
export const native = {
  getPluginInfo: Juce.getNativeFunction('getPluginInfo'),
  setTestSignal: Juce.getNativeFunction('setTestSignal'),
  setAnalyzerActive: Juce.getNativeFunction('setAnalyzerActive'),
  // Temporary scaffolding for the DSP learning steps.
  setAnalyzerSource: Juce.getNativeFunction('setAnalyzerSource'),
};
