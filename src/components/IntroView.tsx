import { useMemo, useState } from "react";
import { PlanetCanvas } from "../world/PlanetCanvas";
import { buildWorldSpec, type WorldInput } from "../world/worldData";
import "./IntroView.css";

interface IntroViewProps {
  onDone: () => void;
}

/**
 * «Пробуждение»: первый экран мира. Чистый космос, одна планета,
 * три строки пролога и единственное приглашение — «Зажечь первый свет».
 */
const INTRO_INPUT: WorldInput = {
  seed: 20261109,
  planetName: "Твоя планета",
  solved: 0,
  attempts: 0,
  firstTry: 0,
  bestStreak: 5, // один тёплый фонарь в темноте — планета ждёт света
  masteredTopicIds: [],
  trophies: { gold: 0, silver: 0, bronze: 0 },
};

export function IntroView({ onDone }: IntroViewProps) {
  const spec = useMemo(() => buildWorldSpec(INTRO_INPUT), []);
  const [leaving, setLeaving] = useState(false);

  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onDone, 950);
  };

  return (
    <div className={`intro-overlay ${leaving ? "leaving" : ""}`} role="dialog" aria-label="Пролог">
      <div className="intro-dust" aria-hidden="true" />
      <PlanetCanvas
        spec={spec}
        themeId="observatory"
        seed={INTRO_INPUT.seed}
        flyIn
        className="intro-canvas"
      />
      <div className="intro-copy">
        <p className="intro-line intro-line-1">Где-то во тьме есть маленькая планета.</p>
        <p className="intro-line intro-line-2">Она ждёт света.</p>
        <p className="intro-line intro-line-3">Твоего.</p>
        <button type="button" className="intro-ignite" onClick={leave}>
          Зажечь первый свет
        </button>
      </div>
      <button type="button" className="intro-skip" onClick={leave}>
        пропустить
      </button>
    </div>
  );
}
