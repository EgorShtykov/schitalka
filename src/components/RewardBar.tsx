import { ChevronRight, Cloud, Palette, Plus, Sparkles, Swords, Trophy, UserRound } from "lucide-react";
import { CatMascot } from "./CatMascot";
import { getTheme } from "@contracts/themes";
import type { TrophyState } from "@contracts/competition";

interface RewardBarProps {
  themeId: string;
  plusBalance: number;
  sparkBalance: number;
  trophies: TrophyState;
  authenticated: boolean;
  syncLabel: string;
  onWorkshop: () => void;
  onCompetition: () => void;
  onAccount: () => void;
}

function plusWord(value: number) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return "плюсиков";
  if (mod10 === 1) return "плюсик";
  if (mod10 >= 2 && mod10 <= 4) return "плюсика";
  return "плюсиков";
}

function sparkWord(value: number) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return "искр";
  if (mod10 === 1) return "искра";
  if (mod10 >= 2 && mod10 <= 4) return "искры";
  return "искр";
}

export function RewardBar({ themeId, plusBalance, sparkBalance, trophies, authenticated, syncLabel, onWorkshop, onCompetition, onAccount }: RewardBarProps) {
  const theme = getTheme(themeId);
  const trophyCount = trophies.gold + trophies.silver + trophies.bronze;
  return (
    <section className="reward-bar" aria-label="Оформление и награды">
      <button type="button" className="reward-theme" onClick={onWorkshop}>
        <span className="reward-cat"><CatMascot themeId={theme.id} happy /></span>
        <span className="reward-copy">
          <span className="reward-kicker"><Palette size={14} />Твоё оформление</span>
          <strong>{theme.name}</strong>
          <span className="reward-status"><Cloud size={13} />{syncLabel}</span>
        </span>
        <ChevronRight size={20} />
      </button>
      <div className="reward-wallets">
        <button type="button" className="plus-balance" onClick={onWorkshop} aria-label={`${plusBalance} ${plusWord(plusBalance)}. Открыть мастерскую`}>
          <span><Plus size={19} strokeWidth={3} /></span>
          <strong>{plusBalance}</strong>
          <small>{plusWord(plusBalance)}<br />за зачёты</small>
        </button>
        <button type="button" className="plus-balance spark-balance" onClick={onWorkshop} aria-label={`${sparkBalance} ${sparkWord(sparkBalance)}. Открыть мастерскую`}>
          <span><Sparkles size={18} /></span>
          <strong>{sparkBalance}</strong>
          <small>{sparkWord(sparkBalance)}<br />за активность</small>
        </button>
      </div>
      <button type="button" className="arena-button" onClick={onCompetition} aria-label={`Открыть сетевую арену. Кубков: ${trophyCount}`}>
        <Swords size={18} />
        <span>Арена</span>
        <small><Trophy size={12} />{trophyCount}</small>
      </button>
      <button type="button" className="account-button" onClick={onAccount}>
        <UserRound size={18} />
        <span>{authenticated ? "Мой аккаунт" : "Войти"}</span>
      </button>
    </section>
  );
}
