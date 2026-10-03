import { useEffect, useRef, useState } from 'react';

import { AnalyzerController } from '../analyzer/analyzer-controller';
import type { RendererKind } from '../analyzer/spectrum-view';
import { native } from '../juce/native';

type AnalyzerProps = {
  renderer: RendererKind;
};

export const Analyzer = ({ renderer }: AnalyzerProps) => {
  const containerRef = useRef<HTMLElement>(null);
  const controllerRef = useRef<AnalyzerController | null>(null);
  const [statsText, setStatsText] = useState('');

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) throw new Error('Analyzer container is not mounted');

    const controller = new AnalyzerController(container, renderer);
    controllerRef.current = controller;

    // Stop the analyzer entirely while the page is hidden (window hidden, minimised or occluded).
    const syncActivity = () => void native.setAnalyzerActive(document.visibilityState === 'visible');
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

  return (
    <section ref={containerRef} className="analyzer">
      <pre className="stats">{statsText}</pre>
    </section>
  );
};
