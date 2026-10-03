import { useEffect, useRef, useState } from 'react';

import { AnalyzerController } from '../analyzer/analyzer-controller';
import type { RendererKind } from '../analyzer/spectrum-view';
import { native } from '../juce/native';

type AnalyzerProps = {
  renderer: RendererKind;
  selectedBand: number;
  onSelectBand: (band: number) => void;
};

export const Analyzer = ({ renderer, selectedBand, onSelectBand }: AnalyzerProps) => {
  const containerRef = useRef<HTMLElement>(null);
  const controllerRef = useRef<AnalyzerController | null>(null);
  const [statsText, setStatsText] = useState('');
  const onSelectBandRef = useRef(onSelectBand);
  onSelectBandRef.current = onSelectBand;

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) throw new Error('Analyzer container is not mounted');

    // The controller outlives renders; route selection through a ref to always call the latest callback.
    const controller = new AnalyzerController(container, renderer, (band) => onSelectBandRef.current(band));
    controllerRef.current = controller;

    // Stop the analyzer entirely while the page is hidden (window hidden, minimised or occluded).
    const syncActivity = () => {
      const visible = document.visibilityState === 'visible';
      void native.setAnalyzerActive(visible);
      // The EQ response is only sent while the page is visible: ask for it again when it shows up.
      if (visible) void native.requestResponse();
    };
    document.addEventListener('visibilitychange', syncActivity);
    syncActivity();

    const statsTimer = setInterval(() => setStatsText(controller.stats.format(performance.now())), 500);

    return () => {
      clearInterval(statsTimer);
      document.removeEventListener('visibilitychange', syncActivity);
      controller.dispose();
      controllerRef.current = null;
    };
    // The renderer is switched in place below; recreating the controller is not needed.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    controllerRef.current?.setRenderer(renderer);
  }, [renderer]);

  useEffect(() => {
    controllerRef.current?.setSelectedBand(selectedBand);
  }, [selectedBand]);

  return (
    <section ref={containerRef} className="analyzer">
      <pre className="stats">{statsText}</pre>
    </section>
  );
};
