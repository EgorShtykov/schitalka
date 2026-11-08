import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Gift,
  Package,
  PackageCheck,
  PiggyBank,
  Rocket,
  Send,
  Truck,
  XCircle,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import "./StipendPage.css";

type StipendPageProps = {
  authenticated: boolean;
  onLogin: () => void;
};

const claimSteps = [
  { status: "requested", label: "Заявка отправлена", icon: Send },
  { status: "approved", label: "Учитель подтвердил", icon: CheckCircle2 },
  { status: "ordered", label: "Приз заказан", icon: Truck },
  { status: "delivered", label: "Приз вручён", icon: PackageCheck },
] as const;

function dateText(value: Date | string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

export function StipendPage({ authenticated, onLogin }: StipendPageProps) {
  if (!authenticated) {
    return (
      <section className="stipend-login stipend-panel">
        <PiggyBank size={42} />
        <div className="eyebrow">Звезда-копилка</div>
        <h1>Домашки превращаются в призы</h1>
        <p>
          Войди в аккаунт, чтобы увидеть свою копилку, выбрать приз-мечту и
          следить за прогрессом.
        </p>
        <button type="button" className="primary-button" onClick={onLogin}>
          Войти в аккаунт
        </button>
      </section>
    );
  }
  return <StipendStudent />;
}

function StipendStudent() {
  const utils = trpc.useUtils();
  const overview = trpc.stipend.overview.useQuery(undefined, { retry: false });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = async () => {
    await utils.stipend.overview.invalidate();
  };
  const chooseGoal = trpc.stipend.chooseGoal.useMutation({
    onSuccess: refresh,
    onError: reason => setError(reason.message),
  });
  const claimPrize = trpc.stipend.claimPrize.useMutation({
    onSuccess: async () => {
      setNotice("Заявка отправлена! Учитель подтвердит и закажет приз.");
      await refresh();
    },
    onError: reason => setError(reason.message),
  });

  if (overview.isLoading)
    return <div className="stipend-loading">Загружаем копилку…</div>;
  if (overview.error || !overview.data)
    return (
      <div className="stipend-error" role="alert">
        {overview.error?.message || "Копилка не загрузилась"}
      </div>
    );

  const { program, cycle, prizes, goal, activeClaim, events } = overview.data;
  if (!program) {
    return (
      <section className="stipend-login stipend-panel">
        <PiggyBank size={42} />
        <div className="eyebrow">Звезда-копилка</div>
        <h1>Скоро старт!</h1>
        <p>
          Учитель ещё не запустил стипендиальную программу. Как только он это
          сделает, каждое проверенное послание начнёт пополнять твою копилку.
        </p>
      </section>
    );
  }

  const balance = cycle?.balance ?? 0;
  const homeworkCount = cycle?.homeworkCount ?? 0;
  const bonusGranted = cycle?.bonusGranted ?? false;
  const goalProgress = goal ? Math.min(100, Math.round((balance / goal.price) * 100)) : 0;
  const goalReached = goal ? balance >= goal.price : false;

  return (
    <div className="stipend-page">
      <section className="stipend-hero">
        <div>
          <div className="eyebrow">Звезда-копилка</div>
          <h1>Твоя копилка</h1>
          <p>
            +{program.amountPerHomework} ₽ за каждую проверенную домашку и +
            {program.cycleBonus} ₽ за полный цикл без пропусков. Заработанное не
            сгорает никогда.
          </p>
        </div>
        <div className="piggy-card">
          <PiggyBank size={34} />
          <strong>{balance} ₽</strong>
          <span>
            {homeworkCount} домашек в этом цикле
            {bonusGranted ? " · бонус цикла получен 🎉" : ""}
          </span>
        </div>
      </section>

      {error && (
        <div className="stipend-error" role="alert">
          <XCircle size={18} />
          {error}
        </div>
      )}
      {notice && (
        <div className="stipend-notice" role="status">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}

      {activeClaim ? (
        <section className="stipend-panel claim-tracker">
          <h2>
            <Package size={19} /> Твой приз в пути: {activeClaim.title}
          </h2>
          <ol className="claim-steps">
            {claimSteps.map((step, index) => {
              const currentIndex = claimSteps.findIndex(item => item.status === activeClaim.status);
              const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";
              const StepIcon = step.icon;
              return (
                <li key={step.status} className={state}>
                  <span className="claim-step-icon">
                    {state === "done" ? <Check size={15} strokeWidth={3} /> : <StepIcon size={15} />}
                  </span>
                  <span>{step.label}</span>
                </li>
              );
            })}
          </ol>
        </section>
      ) : (
        goal && (
          <section className="stipend-panel goal-panel">
            <div className="goal-card">
              <span className="goal-emoji" aria-hidden="true">{goal.emoji}</span>
              <div className="goal-info">
                <div className="eyebrow">Твоя цель</div>
                <h2>{goal.title}</h2>
                <div className="goal-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={goalProgress}>
                  <span style={{ width: `${goalProgress}%` }} />
                </div>
                <p>
                  {goalReached
                    ? "Цель достигнута — можно заказывать!"
                    : `${balance} ₽ из ${goal.price} ₽ · осталось ${goal.price - balance} ₽`}
                </p>
              </div>
              {goalReached && (
                <button
                  type="button"
                  className="primary-button"
                  disabled={claimPrize.isPending}
                  onClick={() => {
                    setError("");
                    setNotice("");
                    if (window.confirm(`Заказать приз «${goal.title}» за ${goal.price} ₽ из копилки?`)) {
                      claimPrize.mutate({ prizeId: goal.id });
                    }
                  }}
                >
                  <Rocket size={18} />
                  Заказать приз!
                </button>
              )}
            </div>
          </section>
        )
      )}

      <section className="stipend-panel">
        <h2>
          <Gift size={19} /> Каталог призов
        </h2>
        <p className="stipend-hint">
          Выбери цель — прогресс до неё всегда будет перед глазами. Цену и
          вариант приза учитель согласует с тобой перед покупкой.
        </p>
        <div className="prize-grid">
          {prizes.map(prize => {
            const isGoal = goal?.id === prize.id;
            const affordable = balance >= prize.price;
            return (
              <article key={prize.id} className={`prize-card ${isGoal ? "is-goal" : ""}`}>
                <span className="prize-emoji" aria-hidden="true">{prize.emoji}</span>
                <span className="prize-category">{prize.category}</span>
                <h3>{prize.title}</h3>
                <div className="prize-footer">
                  <strong>{prize.price} ₽</strong>
                  {isGoal ? (
                    <span className="prize-goal-badge">
                      <Check size={14} strokeWidth={3} /> Цель
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={chooseGoal.isPending || Boolean(activeClaim)}
                      onClick={() => {
                        setError("");
                        chooseGoal.mutate({ prizeId: prize.id });
                      }}
                    >
                      {affordable && !activeClaim ? "В цель" : "Выбрать целью"}
                    </button>
                  )}
                </div>
                {isGoal && affordable && !activeClaim && (
                  <button
                    type="button"
                    className="primary-button prize-claim-button"
                    disabled={claimPrize.isPending}
                    onClick={() => {
                      setError("");
                      setNotice("");
                      if (window.confirm(`Заказать приз «${prize.title}» за ${prize.price} ₽ из копилки?`)) {
                        claimPrize.mutate({ prizeId: prize.id });
                      }
                    }}
                  >
                    Заказать за {prize.price} ₽
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="stipend-panel">
        <h2>Правила без подвоха</h2>
        <ul className="stipend-rules">
          <li>Считаем выполнение, а не идеальность: доработанная после разбора домашка тоже засчитывается.</li>
          <li>Заработанное не сгорает: баланс переходит в следующий цикл целиком.</li>
          <li>Пропущенное занятие можно отработать — тогда бонус цикла сохраняется.</li>
          <li>Никакой лотереи: копилка растёт только от твоих посланий.</li>
          <li>Выдаём вещь, а не наличные: приз выбираешь ты из каталога.</li>
        </ul>
      </section>

      {events.length > 0 && (
        <section className="stipend-panel">
          <h2>История копилки</h2>
          <ul className="stipend-events">
            {events.map(event => (
              <li key={event.id}>
                <strong className={event.amount >= 0 ? "event-plus" : "event-minus"}>
                  {event.amount >= 0 ? `+${event.amount}` : event.amount} ₽
                </strong>
                <span>{event.note ?? event.kind}</span>
                <time>{dateText(event.createdAt)}</time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
