import { useEffect, useState } from "react";
import { Check, LogOut, ShieldCheck, UserRound, X } from "lucide-react";
import { trpc } from "@/providers/trpc";

interface AccountDialogProps {
  open: boolean;
  user: { name: string | null } | null;
  grade: number;
  onClose: () => void;
  onAuthenticated: () => void;
  onLogout: () => void;
}

export function AccountDialog({ open, user, grade, onClose, onAuthenticated, onLogout }: AccountDialogProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [selectedGrade, setSelectedGrade] = useState(grade);
  const [error, setError] = useState("");
  const utils = trpc.useUtils();
  const register = trpc.account.register.useMutation();
  const loginMutation = trpc.account.login.useMutation();
  const logout = trpc.auth.logout.useMutation();
  const busy = register.isPending || loginMutation.isPending || logout.isPending;

  useEffect(() => {
    if (!open) return;
    setError("");
    setPassword("");
    setSelectedGrade(grade);
  }, [open, grade]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose, busy]);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      if (mode === "register") {
        await register.mutateAsync({ login, password, grade: selectedGrade });
      } else {
        await loginMutation.mutateAsync({ login, password });
      }
      setPassword("");
      await utils.account.current.invalidate();
      onAuthenticated();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось выполнить запрос");
    }
  };

  const signOut = async () => {
    setError("");
    try {
      await utils.progress.state.cancel();
      await logout.mutateAsync();
      utils.account.current.setData(undefined, null);
      await utils.progress.state.cancel();
      onLogout();
      onClose();
      await utils.account.current.invalidate();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось выйти");
    }
  };

  return (
    <div className="account-backdrop" onMouseDown={() => { if (!busy) onClose(); }}>
      <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="icon-button account-close" onClick={onClose} aria-label="Закрыть" disabled={busy}><X size={21} /></button>
        {user ? (
          <div className="account-profile">
            <div className="account-avatar"><UserRound size={29} /></div>
            <div className="eyebrow">Облачный профиль</div>
            <h2 id="account-title">{user.name}</h2>
            <p>{grade} класс · прогресс и оформления привязаны к этому аккаунту.</p>
            <ul className="account-benefits">
              <li><Check size={16} />Доступ с телефона и компьютера</li>
              <li><Check size={16} />Плюсики и купленные темы сохраняются</li>
              <li><ShieldCheck size={16} />Пароль не хранится в открытом виде</li>
            </ul>
            <button type="button" className="primary-button account-main-button" onClick={signOut} disabled={busy}>
              <LogOut size={18} />{busy ? "Выходим…" : "Выйти из аккаунта"}
            </button>
            <p className="account-privacy">После выхода на этом устройстве можно войти другим учеником.</p>
          </div>
        ) : (
          <>
            <div className="eyebrow">Свой прогресс · свои награды</div>
            <h2 id="account-title">{mode === "login" ? "С возвращением!" : "Создать аккаунт"}</h2>
            <p className="account-intro">Только логин, пароль и класс. Старый прогресс этого браузера перенесётся один раз.</p>
            <div className="account-tabs" role="tablist" aria-label="Вход или регистрация">
              <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Вход</button>
              <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Регистрация</button>
            </div>
            <form className="account-form" onSubmit={submit}>
              <label>Логин
                <input value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" placeholder="Например, math_cat" minLength={3} maxLength={24} required autoFocus />
              </label>
              <label>Пароль
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder={mode === "register" ? "Минимум 6 символов" : "Твой пароль"} minLength={mode === "register" ? 6 : 1} maxLength={72} required />
              </label>
              {mode === "register" && (
                <label>Класс
                  <select value={selectedGrade} onChange={(event) => setSelectedGrade(Number(event.target.value))}>
                    {[4, 5, 6, 7, 8, 9].map((item) => <option key={item} value={item}>{item} класс</option>)}
                  </select>
                </label>
              )}
              {error && <div className="account-error" role="alert">{error}</div>}
              <button type="submit" className="primary-button account-main-button" disabled={busy}>
                {busy ? "Подключаем…" : mode === "login" ? "Войти" : "Создать и перенести прогресс"}
              </button>
            </form>
            <p className="account-privacy"><ShieldCheck size={14} />Пароль превращается в безопасный хеш. Открытый пароль нигде не сохраняется.</p>
          </>
        )}
        {error && user && <div className="account-error" role="alert">{error}</div>}
      </section>
    </div>
  );
}
