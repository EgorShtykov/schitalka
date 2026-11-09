import { useEffect, useRef, useState } from "react";
import { createGalaxyScene, type GalaxyHoverInfo, type GalaxySceneHandle } from "../world/galaxyScene";
import { paletteForTheme } from "../world/palettes";
import type { GalaxySpec } from "../world/galaxyData";

interface GalaxyMapProps {
  spec: GalaxySpec;
  /** Ключ структуры системы (класс + набор тел): меняется — сцена пересоздаётся. */
  structureKey: string;
  themeId: string;
  seed: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function stateLabel(info: GalaxyHoverInfo): string {
  if (info.id === "mixed") return "Вся галактика сразу";
  if (info.state === "shining") return info.score > 0 ? "Сияет" : "Перелёт";
  if (info.state === "growing") return `Разгорается · ${info.score}%`;
  return "Спит — зажги её";
}

/**
 * 3D карта галактики: сектора курса и направления сайта как планеты.
 * Клик по телу выбирает его; камера подлетает и следует по орбите.
 */
export function GalaxyMap({ spec, structureKey, themeId, seed, selectedId, onSelect }: GalaxyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GalaxySceneHandle | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const [hover, setHover] = useState<GalaxyHoverInfo | null>(null);

  // Создание сцены — только при смене структуры/темы.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handle = createGalaxyScene(container, spec, paletteForTheme(themeId), seed, {
      onSelect: id => selectRef.current(id),
      onHover: setHover,
    });
    sceneRef.current = handle;

    const intersection = new IntersectionObserver(
      entries => {
        const visible = entries.some(entry => entry.isIntersecting);
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
    // spec на момент создания — структура зафиксирована structureKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey, themeId, seed]);

  // Обновление состояний (прогресс) без пересоздания сцены.
  useEffect(() => {
    sceneRef.current?.update(spec);
  }, [spec]);

  // Фокус камеры на выбранном теле (кроме стартового рендера и «Смешанной»).
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    sceneRef.current?.focus(selectedId && selectedId !== "mixed" ? selectedId : null);
  }, [selectedId]);

  return (
    <div className="galaxy-map-wrap">
      <div
        ref={containerRef}
        className="galaxy-map"
        role="application"
        aria-label="Карта галактики: планеты-сектора и направления сайта"
      />
      {hover && (
        <div
          className="galaxy-tooltip"
          style={{ left: hover.x + 14, top: hover.y + 12 }}
          aria-hidden="true"
        >
          <strong>{hover.name}</strong>
          <span>{stateLabel(hover)}</span>
        </div>
      )}
      <p className="galaxy-hint">Кликни по планете — камера подлетит к ней. Перетаскивай, чтобы оглядеться.</p>
    </div>
  );
}
