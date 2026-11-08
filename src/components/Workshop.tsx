import { Check, Eye, LockKeyhole, Palette, Plus, RotateCcw, Sparkles, UserRound } from "lucide-react";
import { getTheme, themes } from "@contracts/themes";
import { CatMascot } from "./CatMascot";
import { MathText } from "./MathText";

interface WorkshopProps {
  selectedTheme: string;
  previewTheme: string;
  plusBalance: number;
  sparkBalance: number;
  purchasedThemeIds: string[];
  authenticated: boolean;
  busyTheme: string | null;
  error: string;
  onPreview: (themeId: string) => void;
  onPurchase: (themeId: string) => void;
  onSelect: (themeId: string) => void;
  onResetPreview: () => void;
  onLogin: () => void;
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

function CurrencyIcon({ currency, size = 16 }: { currency: "plus" | "spark"; size?: number }) {
  return currency === "spark" ? <Sparkles size={size} /> : <Plus size={size} strokeWidth={3} />;
}

function ThemePreview({ themeId, large = false }: { themeId: string; large?: boolean }) {
  const theme = getTheme(themeId);
  const style = {
    "--preview-bg": theme.swatches[0],
    "--preview-panel": theme.swatches[1],
    "--preview-ink": theme.swatches[2],
    "--preview-accent": theme.swatches[3],
    "--green": theme.swatches[2],
    "--orange": theme.swatches[3],
    "--brown": theme.swatches[2],
    "--blue-cat": theme.swatches[3],
    "--blush": theme.swatches[1],
    "--paper": theme.swatches[1],
    "--gold": theme.swatches[3],
  } as React.CSSProperties;
  return (
    <div className={`theme-preview ${large ? "large" : ""} preview-${theme.id}`} style={style} aria-hidden="true">
      <div className="preview-side"><i /><i /><i /></div>
      <div className="preview-main">
        <div className="preview-top"><span /><b /></div>
        <div className="preview-progress"><span /></div>
        <div className="preview-exercise">
          {large ? <MathText text="3/4 + 1/2" /> : <span>3/4 + 1/2</span>}
          <i />
        </div>
      </div>
      <CatMascot themeId={theme.id} happy />
    </div>
  );
}

export function Workshop(props: WorkshopProps) {
  const preview = getTheme(props.previewTheme);
  const isPreviewing = props.previewTheme !== props.selectedTheme;
  return (
    <div className="workshop-page">
      <section className="workshop-hero">
        <div className="workshop-hero-copy">
          <div className="eyebrow"><Palette size={14} />Мастерская оформления</div>
          <h1>Собери свою<br />легендарную «Считалку».</h1>
          <p>Примерь любой стиль до покупки. Открытые темы и аксессуары кота остаются навсегда.</p>
          <div className="workshop-wallets">
            <div className="workshop-wallet"><Plus size={19} strokeWidth={3} /><strong>{props.plusBalance}</strong><span>{plusWord(props.plusBalance)}</span></div>
            <div className="workshop-wallet spark-wallet"><Sparkles size={18} /><strong>{props.sparkBalance}</strong><span>{sparkWord(props.sparkBalance)}</span></div>
          </div>
        </div>
        <div className="workshop-live">
          <span className="live-label"><Eye size={14} />{isPreviewing ? `Примерка: ${preview.name}` : `Сейчас: ${preview.name}`}</span>
          <ThemePreview themeId={preview.id} large />
        </div>
      </section>

      {isPreviewing && (
        <div className="preview-notice" role="status">
          <span>Это предпросмотр оформления. Задания и прогресс не меняются.</span>
          <button type="button" onClick={props.onResetPreview}><RotateCcw size={15} />Вернуть «{getTheme(props.selectedTheme).shortName}»</button>
        </div>
      )}
      {props.error && <div className="workshop-error" role="alert">{props.error}</div>}

      <div className="workshop-section-heading">
        <div><span>Коллекция · 9 стилей</span><h2>Выбери настроение</h2></div>
        <p>Никаких случайных выпадений и покупок за деньги.</p>
      </div>

      <div className="theme-grid">
        {themes.map((theme) => {
          const owned = theme.price === 0 || props.purchasedThemeIds.includes(theme.id);
          const active = props.selectedTheme === theme.id;
          const previewing = props.previewTheme === theme.id;
          const busy = props.busyTheme === theme.id;
          const balance = theme.currency === "spark" ? props.sparkBalance : props.plusBalance;
          const currencyWord = theme.currency === "spark" ? sparkWord : plusWord;
          const missing = Math.max(0, theme.price - balance);
          return (
            <article className={`theme-item ${previewing ? "previewing" : ""} ${active ? "active" : ""}`} key={theme.id}>
              <button type="button" className="theme-preview-button" onClick={() => props.onPreview(theme.id)} aria-label={`Примерить ${theme.name}`}>
                <ThemePreview themeId={theme.id} />
                <span className="try-label"><Eye size={14} />{previewing ? "Примеряется" : "Примерить"}</span>
              </button>
              <div className="theme-item-copy">
                <div className="theme-title-row">
                  <h3>{theme.name}</h3>
                  {active ? <span className="owned-badge"><Check size={13} />Выбрано</span> : owned ? <span className="owned-badge">Открыто</span> : <span className={`price-badge ${theme.currency}`}><CurrencyIcon currency={theme.currency} size={13} />{theme.price}</span>}
                </div>
                <strong>{theme.tagline}</strong>
                <p>{theme.description}</p>
                <small><Sparkles size={13} />{theme.accessory}</small>
              </div>
              <div className="theme-item-actions">
                {owned ? (
                  <button type="button" className="theme-action" disabled={active || busy} onClick={() => props.onSelect(theme.id)}>
                    {active ? <><Check size={16} />Тема включена</> : busy ? "Включаем…" : "Включить"}
                  </button>
                ) : props.authenticated ? (
                  <button type="button" className="theme-action buy" disabled={busy || balance < theme.price} onClick={() => props.onPurchase(theme.id)} title={missing ? `Нужно ещё ${missing} ${currencyWord(missing)}` : undefined}>
                    {busy ? "Открываем…" : <><CurrencyIcon currency={theme.currency} />Открыть за {theme.price}</>}
                  </button>
                ) : (
                  <button type="button" className="theme-action buy" onClick={props.onLogin}><UserRound size={16} />Войти и открыть</button>
                )}
                {!owned && props.authenticated && missing > 0 && <small className="not-enough">Нужно ещё {missing} {currencyWord(missing)}</small>}
                {!owned && !props.authenticated && <small className="not-enough"><LockKeyhole size={12} />Награды хранятся в аккаунте</small>}
              </div>
            </article>
          );
        })}
      </div>

      <section className="workshop-rules">
        <div><strong>20</strong><span>решений<br />в теме</span></div>
        <div><strong>80%</strong><span>с первой попытки<br />без подсказок</span></div>
        <div><strong>+1</strong><span>плюсик за первое<br />освоение сектора</span></div>
        <p>Освоение сектора идёт на «Уверенно» и «Сложно». Плюсики и искры — разные награды: искры приносят места в гонках, финиш и подтверждённые учителем послания. Уже заработанное не отнимается.</p>
      </section>
    </div>
  );
}
