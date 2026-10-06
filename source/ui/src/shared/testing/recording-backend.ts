import { type Backend, type ContinuousField, type ParameterRange, setBackend } from '~/shared/api';

// The ranges of the band parameters in C++ (parameters.h).
const parameterRanges: Record<ContinuousField, ParameterRange> = {
  frequency: { min: 20, max: 20000 },
  gain: { min: -30, max: 30 },
  q: { min: 0.1, max: 30 },
};

/**
 * For component tests: a backend that records what the UI asks of C++. Band parameters have the
 * ranges of C++ unless `ranges` gives others; one it leaves out is not known yet.
 */
export const recordingBackend = (ranges: Partial<Record<ContinuousField, ParameterRange>> = parameterRanges) => {
  const calls: { name: string; args: unknown[] }[] = [];
  const record =
    (name: string) =>
    (...args: unknown[]) =>
      void calls.push({ name, args });
  const backend: Backend = {
    call: (name, args) => {
      calls.push({ name, args });
      return Promise.resolve(undefined);
    },
    parameters: {
      begin: record('begin'),
      end: record('end'),
      set: record('set'),
      setSlope: record('setSlope'),
      setEnabled: record('setEnabled'),
      setMute: record('setMute'),
    },
    parameterRange: (field) => ranges[field] ?? null,
  };
  setBackend(backend);
  return { calls, named: (name: string) => calls.filter((call) => call.name === name) };
};
