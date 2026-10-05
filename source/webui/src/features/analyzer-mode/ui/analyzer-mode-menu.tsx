import { SelectMenu } from '~/shared/ui';

import { analyzerModes, setAnalyzerMode, useAnalyzerModeStore } from '../model/analyzer-mode';

/** The analyzer mode: a pill in the bottom bar opening a menu of the modes. */
export function AnalyzerModeMenu() {
  const mode = useAnalyzerModeStore((state) => state.mode);
  return <SelectMenu label="Analyzer" value={mode} options={analyzerModes} onValueChange={setAnalyzerMode} />;
}
