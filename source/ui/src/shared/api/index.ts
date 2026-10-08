export {
  type Backend,
  type ContinuousField,
  hasPluginBackend,
  type ParameterRange,
  type ParameterWriter,
  setBackend,
} from './backend';
export { type AnalyzerFrame, decodeBase64Frame } from './frame';
export { type AnalyzerMode, type AnalyzerOptions, defaultAnalyzerOptions, native } from './native';
export { bandParameterRange, bandParameters, setMute } from './parameters';
export { magnitudeDb, responseDb, withBandFrequencies } from './response-math';
export { type BandResponse, decodeBase64Response, type EqResponse } from './response';
export { type Section, toSections } from './section';
