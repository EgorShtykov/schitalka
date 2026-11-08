import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { PlanetCanvas } from "../world/PlanetCanvas";
import { buildWorldSpec, DEMO_WORLD_INPUT } from "../world/worldData";
import "./WorldPage.css";

/**
 * Публичная демо-страница (/demo): планета ученика без регистрации.
 * Продающий экран — показывает, ради чего стоит решать задания.
 */
export default function DemoWorldPage() {
  const spec = useMemo(() => buildWorldSpec(DEMO_WORLD_INPUT), []);

  return (
    <main className="demo-page">
      <div className="demo-hero">
        <h1>У каждого ученика «Считалки» есть своя планета</h1>
        <p>
          Она растёт от решённых заданий: деревья, фонари, кристаллы и созвездия освоенных тем.
          Это планета после двух месяцев занятий — покрути её.
        </p>
      </div>

      <div className="demo-canvas-wrap">
        <PlanetCanvas spec={spec} themeId="cosmic" seed={DEMO_WORLD_INPUT.seed} className="demo-canvas" />
      </div>

      <a className="demo-cta" href="/">
        <Sparkles size={18} aria-hidden="true" />
        Начать собирать свою планету
      </a>
      <p className="demo-note">Бесплатный тренажёр по математике для 4–9 классов · schitalka</p>
    </main>
  );
}
