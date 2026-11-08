import { useMemo, useRef, useState } from "react";
import { Camera, Rocket } from "lucide-react";
import { PlanetCanvas, type PlanetCanvasRef } from "../world/PlanetCanvas";
import observerHello from "../assets/avatar/observer-hello.webp";
import { buildWorldSpec, type WorldInput } from "../world/worldData";
import "./WorldPage.css";

interface WorldPageProps {
  input: WorldInput;
  themeId: string;
}

/** Страница «Моя планета»: живая планета, которая растёт от решённых заданий. */
export function WorldPage({ input, themeId }: WorldPageProps) {
  const canvasRef = useRef<PlanetCanvasRef>(null);
  const [notice, setNotice] = useState("");

  // Сцену пересобираем только когда реально меняется состав мира.
  const signature = JSON.stringify({
    s: input.seed,
    n: input.planetName,
    solved: input.solved,
    a: input.attempts,
    f: input.firstTry,
    b: input.bestStreak,
    m: input.masteredTopicIds,
    t: input.trophies,
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spec = useMemo(() => buildWorldSpec(input), [signature]);
  const seed = input.seed;

  const saveSnapshot = () => {
    const dataUrl = canvasRef.current?.snapshot();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `planeta-${spec.planetName.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.click();
    setNotice("Снимок сохранён — можно показать друзьям");
    window.setTimeout(() => setNotice(""), 4000);
  };

  const trees = spec.placements.filter((p) => p.kind === "tree" || p.kind === "flowerTree").length;
  const lanterns = spec.placements.filter((p) => p.kind === "lantern").length;

  return (
    <section className="world-page" aria-label="Моя планета">
      <header className="world-header">
        <div>
          <p className="world-kicker">
            <Rocket size={15} aria-hidden="true" /> Моя планета
          </p>
          <div className="world-title-row">
            <img className="world-observer" src={observerHello} alt="Наблюдатель приветствует тебя" />
            <h1 className="world-title">Планета «{spec.planetName}»</h1>
          </div>
          <p className="world-subtitle">
            Планета растёт от твоих решений. Покрути планету мышкой или пальцем.
          </p>
        </div>
        <button type="button" className="world-snapshot" onClick={saveSnapshot}>
          <Camera size={16} aria-hidden="true" />
          Снимок планеты
        </button>
      </header>

      <div className="world-canvas-wrap">
        <PlanetCanvas ref={canvasRef} spec={spec} themeId={themeId} seed={seed} className="world-canvas" />
      </div>

      {notice && <p className="world-notice" role="status">{notice}</p>}

      <div className="world-stats" aria-label="Что уже выросло">
        <div><strong>{trees}</strong><span>{trees === 1 ? "дерево" : trees >= 2 && trees <= 4 ? "дерева" : "деревьев"}</span></div>
        <div><strong>{spec.constellations.length}</strong><span>созвездий</span></div>
        <div><strong>{lanterns}</strong><span>{lanterns === 1 ? "фонарь" : lanterns >= 2 && lanterns <= 4 ? "фонаря" : "фонарей"}</span></div>
        <div><strong>{input.trophies.gold + input.trophies.silver + input.trophies.bronze}</strong><span>кубков</span></div>
      </div>

      <details className="world-legend">
        <summary>Как растёт планета?</summary>
        <ul>
          <li>🌳 Каждые 8 решённых заданий — новое дерево. Высокая точность делает деревья цветущими.</li>
          <li>🏮 Каждые 5 ответов подряд в лучшей серии — тёплый фонарь на пути к вершине.</li>
          <li>💎 Освоенный сектор — кристалл на планете и созвездие в её небе.</li>
          <li>🏠 После 50 решённых заданий на планете появляется домик.</li>
          <li>✨ После 10 решённых заданий у планеты появляется дух-спутник — он растёт вместе с тобой.</li>
          <li>🏆 Кубки с космических гонок встают на вершину планеты.</li>
        </ul>
      </details>
    </section>
  );
}
