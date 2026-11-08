import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createPlanetScene, type PlanetSceneHandle } from "./planetScene";
import { paletteForTheme } from "./palettes";
import type { WorldSpec } from "./worldData";

export interface PlanetCanvasRef {
  snapshot: () => string;
}

interface PlanetCanvasProps {
  spec: WorldSpec;
  themeId: string;
  seed: number;
  className?: string;
  flyIn?: boolean;
}

/**
 * React-обёртка над Three.js сценой планеты.
 * Рендер останавливается, когда канвас вне экрана или вкладка скрыта.
 */
export const PlanetCanvas = forwardRef<PlanetCanvasRef, PlanetCanvasProps>(function PlanetCanvas(
  { spec, themeId, seed, className, flyIn },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PlanetSceneHandle | null>(null);

  useImperativeHandle(ref, () => ({
    snapshot: () => sceneRef.current?.snapshot() ?? "",
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handle = createPlanetScene(container, spec, paletteForTheme(themeId), seed, { flyIn });
    sceneRef.current = handle;

    const intersection = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        handle.setRunning(visible && !document.hidden);
      },
      { threshold: 0.05 },
    );
    intersection.observe(container);
    const onVisibility = () => handle.setRunning(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      handle.dispose();
      sceneRef.current = null;
    };
  }, [spec, themeId, seed, flyIn]);

  return <div ref={containerRef} className={className} role="img" aria-label={`Планета «${spec.planetName}»`} />;
});
