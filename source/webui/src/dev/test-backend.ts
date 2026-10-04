import { type Backend, setBackend } from '~/shared/api';

/** Development only: a backend for component tests that records what the UI asks of C++. */
export const recordingBackend = () => {
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
  };
  setBackend(backend);
  return { calls, named: (name: string) => calls.filter((call) => call.name === name) };
};
