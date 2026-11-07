import { useState } from "react";
import { Gift, PiggyBank, Plus, Wallet } from "lucide-react";
import { trpc } from "@/providers/trpc";
import "./StipendPage.css";

const claimStatusLabels: Record<string, string> = {
  requested: "Новая заявка",
  approved: "Подтверждена",
  ordered: "Заказан",
  delivered: "Вручён",
  cancelled: "Отменена",
};

const nextClaimStatus: Record<string, { status: "approved" | "ordered" | "delivered"; label: string }> = {
  requested: { status: "approved", label: "Подтвердить" },
  approved: { status: "ordered", label: "Заказан" },
  ordered: { status: "delivered", label: "Вручён" },
};

export function StipendTeacher({
  run,
}: {
  run: (operation: Promise<unknown>, success: string) => Promise<void>;
}) {
  const overview = trpc.stipend.teacherOverview.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const [amount, setAmount] = useState("250");
  const [bonus, setBonus] = useState("1000");
  const [weeks, setWeeks] = useState("4");
  const [perWeek, setPerWeek] = useState("2");
  const [programLoaded, setProgramLoaded] = useState(false);
  const [prizeTitle, setPrizeTitle] = useState("");
  const [prizePrice, setPrizePrice] = useState("500");
  const [prizeCategory, setPrizeCategory] = useState("Разное");
  const [prizeEmoji, setPrizeEmoji] = useState("🎁");
  const [actualPriceByClaim, setActualPriceByClaim] = useState<Record<number, string>>({});

  const refresh = async () => {
    await utils.stipend.teacherOverview.invalidate();
  };
  const saveProgram = trpc.stipend.saveProgram.useMutation({ onSuccess: refresh });
  const grantCycleBonus = trpc.stipend.grantCycleBonus.useMutation({ onSuccess: refresh });
  const updateClaim = trpc.stipend.updateClaim.useMutation({ onSuccess: refresh });
  const upsertPrize = trpc.stipend.upsertPrize.useMutation({ onSuccess: refresh });

  const data = overview.data;
  if (overview.isLoading)
    return <div className="school-loading">Загружаем стипендию…</div>;
  if (overview.error || !data)
    return (
      <div className="school-error" role="alert">
        {overview.error?.message || "Стипендия не загрузилась"}
      </div>
    );

  if (data.program && !programLoaded) {
    setAmount(String(data.program.amountPerHomework));
    setBonus(String(data.program.cycleBonus));
    setWeeks(String(data.program.cycleWeeks));
    setPerWeek(String(data.program.homeworkPerWeek));
    setProgramLoaded(true);
  }

  const activeClaims = data.claims.filter(claim =>
    ["requested", "approved", "ordered"].includes(claim.status)
  );
  const archiveClaims = data.claims.filter(claim =>
    ["delivered", "cancelled"].includes(claim.status)
  );

  return (
    <div className="stipend-teacher">
      <section className="school-panel">
        <h2>
          <PiggyBank size={19} /> Программа стипендии
        </h2>
        <form
          className="stipend-form"
          onSubmit={event => {
            event.preventDefault();
            void run(
              saveProgram.mutateAsync({
                amountPerHomework: Number(amount),
                cycleBonus: Number(bonus),
                cycleWeeks: Number(weeks),
                homeworkPerWeek: Number(perWeek),
                active: true,
              }),
              data.program
                ? "Программа обновлена"
                : "Программа запущена, стартовый каталог из 30 призов добавлен"
            );
          }}
        >
          <label>
            ₽ за домашку
            <input type="number" min="0" max="10000" value={amount} onChange={e => setAmount(e.target.value)} />
          </label>
          <label>
            Бонус за цикл, ₽
            <input type="number" min="0" max="100000" value={bonus} onChange={e => setBonus(e.target.value)} />
          </label>
          <label>
            Недель в цикле
            <input type="number" min="1" max="16" value={weeks} onChange={e => setWeeks(e.target.value)} />
          </label>
          <label>
            Домашек в неделю
            <input type="number" min="1" max="7" value={perWeek} onChange={e => setPerWeek(e.target.value)} />
          </label>
          <button type="submit" className="primary-button" disabled={saveProgram.isPending}>
            {data.program ? "Сохранить" : "Запустить стипендию"}
          </button>
        </form>
        {data.program && (
          <p className="stipend-hint">
            Программа активна. Максимум за цикл на ученика: {data.budget.perStudentMax} ₽.
            Начисление происходит автоматически, когда вы ставите работе статус «Проверено».
          </p>
        )}
      </section>

      {data.program && (
        <>
          <section className="school-panel">
            <h2>
              <Wallet size={19} /> Бюджет
            </h2>
            <div className="budget-grid">
              <div className="budget-card">
                <strong>{data.budget.studentCount}</strong>
                <span>учеников в программе</span>
              </div>
              <div className="budget-card">
                <strong>{data.budget.maxObligations} ₽</strong>
                <span>максимум обязательств за цикл</span>
              </div>
              <div className="budget-card">
                <strong>{data.budget.credited} ₽</strong>
                <span>начислено ученикам</span>
              </div>
              <div className="budget-card">
                <strong>{data.budget.inDelivery} ₽</strong>
                <span>призов в пути</span>
              </div>
              <div className="budget-card">
                <strong>{data.budget.delivered} ₽</strong>
                <span>фактически потрачено</span>
              </div>
            </div>
          </section>

          <section className="school-panel">
            <h2>Ученики</h2>
            <table className="stipend-table">
              <thead>
                <tr>
                  <th>Ученик</th>
                  <th>Копилка</th>
                  <th>Домашек в цикле</th>
                  <th>Бонус цикла</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.students.map(student => (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td>{student.cycle?.balance ?? 0} ₽</td>
                    <td>{student.cycle?.homeworkCount ?? 0}</td>
                    <td>{student.cycle?.bonusGranted ? "Выдан 🎉" : "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={grantCycleBonus.isPending || Boolean(student.cycle?.bonusGranted)}
                        onClick={() => {
                          if (window.confirm(`Выдать бонус цикла ${data.program?.cycleBonus} ₽ ученику ${student.name}? Подтверждайте только если все домашки и занятия отработаны.`)) {
                            void run(
                              grantCycleBonus.mutateAsync({ studentId: student.id }),
                              "Бонус цикла начислен"
                            );
                          }
                        }}
                      >
                        Бонус цикла
                      </button>
                    </td>
                  </tr>
                ))}
                {data.students.length === 0 && (
                  <tr>
                    <td colSpan={5}>Добавьте учеников в классы — они появятся здесь автоматически.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="school-panel">
            <h2>Заявки на призы</h2>
            <table className="stipend-table">
              <thead>
                <tr>
                  <th>Ученик</th>
                  <th>Приз</th>
                  <th>Цена</th>
                  <th>Статус</th>
                  <th>Факт. цена</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {activeClaims.map(claim => {
                  const next = nextClaimStatus[claim.status];
                  return (
                    <tr key={claim.id}>
                      <td>{claim.studentName}</td>
                      <td>{claim.title}</td>
                      <td>{claim.priceSnapshot} ₽</td>
                      <td>
                        <span className={`claim-status ${claim.status}`}>
                          {claimStatusLabels[claim.status]}
                        </span>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          placeholder={String(claim.priceSnapshot)}
                          value={actualPriceByClaim[claim.id] ?? ""}
                          onChange={e =>
                            setActualPriceByClaim(prev => ({ ...prev, [claim.id]: e.target.value }))
                          }
                          style={{ width: 90 }}
                        />
                      </td>
                      <td>
                        <div className="claim-actions">
                          {next && (
                            <button
                              type="button"
                              className="ghost-button"
                              disabled={updateClaim.isPending}
                              onClick={() =>
                                void run(
                                  updateClaim.mutateAsync({
                                    claimId: claim.id,
                                    status: next.status,
                                    actualPrice: actualPriceByClaim[claim.id]
                                      ? Number(actualPriceByClaim[claim.id])
                                      : undefined,
                                  }),
                                  `Статус: ${claimStatusLabels[next.status]}`
                                )
                              }
                            >
                              {next.label}
                            </button>
                          )}
                          <button
                            type="button"
                            className="ghost-button"
                            disabled={updateClaim.isPending}
                            onClick={() => {
                              if (window.confirm(`Отменить заявку «${claim.title}»? ${claim.priceSnapshot} ₽ вернутся в копилку ученика.`)) {
                                void run(
                                  updateClaim.mutateAsync({ claimId: claim.id, status: "cancelled" }),
                                  "Заявка отменена, деньги возвращены в копилку"
                                );
                              }
                            }}
                          >
                            Отменить
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {activeClaims.length === 0 && (
                  <tr>
                    <td colSpan={6}>Активных заявок нет.</td>
                  </tr>
                )}
                {archiveClaims.slice(0, 10).map(claim => (
                  <tr key={claim.id} style={{ opacity: 0.6 }}>
                    <td>{claim.studentName}</td>
                    <td>{claim.title}</td>
                    <td>{claim.priceSnapshot} ₽</td>
                    <td>
                      <span className={`claim-status ${claim.status}`}>
                        {claimStatusLabels[claim.status]}
                      </span>
                    </td>
                    <td>{claim.actualPrice != null ? `${claim.actualPrice} ₽` : "—"}</td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="school-panel">
            <h2>
              <Gift size={19} /> Каталог призов ({data.prizes.length})
            </h2>
            <form
              className="stipend-form"
              onSubmit={event => {
                event.preventDefault();
                void run(
                  upsertPrize.mutateAsync({
                    title: prizeTitle,
                    category: prizeCategory,
                    emoji: prizeEmoji,
                    price: Number(prizePrice),
                    active: true,
                  }).then(() => {
                    setPrizeTitle("");
                    setPrizePrice("500");
                  }),
                  "Приз добавлен в каталог"
                );
              }}
            >
              <label>
                Эмодзи
                <input value={prizeEmoji} maxLength={4} onChange={e => setPrizeEmoji(e.target.value)} style={{ minWidth: 60 }} />
              </label>
              <label>
                Название
                <input value={prizeTitle} required minLength={2} onChange={e => setPrizeTitle(e.target.value)} style={{ minWidth: 220 }} />
              </label>
              <label>
                Категория
                <input value={prizeCategory} required onChange={e => setPrizeCategory(e.target.value)} />
              </label>
              <label>
                Цена, ₽
                <input type="number" min="1" value={prizePrice} onChange={e => setPrizePrice(e.target.value)} />
              </label>
              <button type="submit" className="ghost-button" disabled={upsertPrize.isPending}>
                <Plus size={15} /> Добавить
              </button>
            </form>
            <table className="stipend-table">
              <tbody>
                {data.prizes.map(prize => (
                  <tr key={prize.id} style={prize.active ? undefined : { opacity: 0.45 }}>
                    <td style={{ width: 40 }}>{prize.emoji}</td>
                    <td>{prize.title}</td>
                    <td>{prize.category}</td>
                    <td>{prize.price} ₽</td>
                    <td>
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={upsertPrize.isPending}
                        onClick={() =>
                          void run(
                            upsertPrize.mutateAsync({
                              id: prize.id,
                              title: prize.title,
                              category: prize.category,
                              emoji: prize.emoji,
                              price: prize.price,
                              active: !prize.active,
                            }),
                            prize.active ? "Приз скрыт из каталога" : "Приз снова в каталоге"
                          )
                        }
                      >
                        {prize.active ? "Скрыть" : "Вернуть"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
