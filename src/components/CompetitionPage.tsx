import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  Check,
  Clipboard,
  Clock3,
  Crown,
  Flag,
  Home,
  Medal,
  Play,
  Plus,
  Send,
  Sparkles,
  Swords,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { CloudState } from "@contracts/learning";
import {
  COMPETITION_MAX_PLAYERS,
  COMPETITION_MIN_PLAYERS,
  COMPETITION_TASK_COUNT,
} from "@contracts/competition";
import { trpc } from "@/providers/trpc";
import { MathText } from "./MathText";

const ROOM_STORAGE_KEY = "schitalka-competition-room";

interface CompetitionPageProps {
  authenticated: boolean;
  currentUserId: number | null;
  isAdmin: boolean;
  grade: number;
  sparkBalance: number;
  trophies: CloudState["trophies"];
  sparkEvents: CloudState["sparkEvents"];
  onLogin: () => void;
}

function sparkWord(value: number) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return "искр";
  if (mod10 === 1) return "искра";
  if (mod10 >= 2 && mod10 <= 4) return "искры";
  return "искр";
}

function playerTime(value: number) {
  return `${(value / 1000).toFixed(1)} с`;
}

function TeacherRewards() {
  const [studentLogin, setStudentLogin] = useState("");
  const [amount, setAmount] = useState(2);
  const [note, setNote] = useState("Послание выполнено");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const rewardId = useRef(crypto.randomUUID());
  const grant = trpc.homework.grant.useMutation();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const result = await grant.mutateAsync({
        rewardId: rewardId.current,
        studentLogin,
        amount,
        note,
      });
      setMessage(`${result.studentName}: +${result.amount} ${sparkWord(result.amount)}. Награда сохранена.`);
      setStudentLogin("");
      rewardId.current = crypto.randomUUID();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось выдать награду");
    }
  };

  return (
    <section className="teacher-panel" aria-labelledby="teacher-rewards-title">
      <div className="teacher-panel-heading">
        <span className="teacher-mark"><Home size={21} /></span>
        <div>
          <span>Панель учителя</span>
          <h2 id="teacher-rewards-title">Искры за послания</h2>
          <p>Проверь работу, затем вручную подтверди награду. Повторная отправка той же формы не удвоит искры.</p>
        </div>
      </div>
      <form className="teacher-reward-form" onSubmit={submit}>
        <label>Логин ученика
          <input value={studentLogin} onChange={(event) => setStudentLogin(event.target.value)} minLength={3} maxLength={24} required autoComplete="off" placeholder="Например, Ivan_7" />
        </label>
        <label>Искры · 1–20
          <input type="number" min={1} max={20} value={amount} onChange={(event) => setAmount(Number(event.target.value))} required />
        </label>
        <label className="teacher-note">За что награда
          <input value={note} onChange={(event) => setNote(event.target.value)} minLength={3} maxLength={120} required />
        </label>
        <button className="primary-button teacher-grant" type="submit" disabled={grant.isPending}>
          <Plus size={18} />{grant.isPending ? "Сохраняем…" : "Выдать искры"}
        </button>
      </form>
      {message && <div className="teacher-success" role="status"><Check size={17} />{message}</div>}
      {error && <div className="teacher-error" role="alert">{error}</div>}
    </section>
  );
}

export function CompetitionPage(props: CompetitionPageProps) {
  const utils = trpc.useUtils();
  const [code, setCode] = useState(() => {
    try { return sessionStorage.getItem(ROOM_STORAGE_KEY) ?? ""; } catch { return ""; }
  });
  const [joinCode, setJoinCode] = useState("");
  const [grade, setGrade] = useState(props.grade);
  const [difficulty, setDifficulty] = useState<"medium" | "hard">("medium");
  const [taskIndex, setTaskIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  const roomQuery = trpc.competition.state.useQuery({ code }, {
    enabled: props.authenticated && Boolean(code),
    refetchInterval: 1000,
    retry: false,
  });
  const create = trpc.competition.create.useMutation();
  const join = trpc.competition.join.useMutation();
  const start = trpc.competition.start.useMutation();
  const submitAnswer = trpc.competition.answer.useMutation();
  const room = roomQuery.data;

  const acceptRoom = (value: NonNullable<typeof room>) => {
    setCode(value.code);
    try { sessionStorage.setItem(ROOM_STORAGE_KEY, value.code); } catch { /* The room still works without tab storage. */ }
    utils.competition.state.setData({ code: value.code }, value);
    setError("");
  };

  const closeRoom = () => {
    setCode("");
    setJoinCode("");
    setTaskIndex(0);
    setAnswer("");
    setError("");
    setNotice("");
    try { sessionStorage.removeItem(ROOM_STORAGE_KEY); } catch { /* Nothing else to clean up. */ }
  };

  useEffect(() => {
    if (room?.status !== "active") return;
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [room?.status]);

  const answered = useMemo(() => new Set(room?.answeredTaskIndexes ?? []), [room?.answeredTaskIndexes]);
  const firstUnanswered = useMemo(() => {
    if (!room) return 0;
    const index = room.tasks.findIndex((task) => !answered.has(task.index));
    return index >= 0 ? index : Math.max(0, room.tasks.length - 1);
  }, [room, answered]);

  useEffect(() => {
    if (room?.status === "active" && answered.has(taskIndex)) setTaskIndex(firstUnanswered);
  }, [room?.status, answered, firstUnanswered, taskIndex]);

  useEffect(() => {
    if (room?.status !== "finished") return;
    void utils.progress.state.invalidate();
  }, [room?.status, utils]);

  const serverNow = room ? now + room.serverNow.getTime() - roomQuery.dataUpdatedAt : now;
  const startsIn = room?.startsAt ? Math.max(0, Math.ceil((room.startsAt.getTime() - serverNow) / 1000)) : 0;
  const secondsLeft = room?.endsAt ? Math.max(0, Math.ceil((room.endsAt.getTime() - serverNow) / 1000)) : 0;
  const canAnswer = room?.status === "active" && startsIn === 0 && secondsLeft > 0;
  const currentTask = room?.tasks[taskIndex];
  const rankedPlayers = useMemo(() => [...(room?.players ?? [])].sort((a, b) =>
    b.correct - a.correct || a.totalTimeMs - b.totalTimeMs || a.userId - b.userId,
  ), [room?.players]);

  const createRoom = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try { acceptRoom(await create.mutateAsync({ grade, difficulty })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось создать комнату"); }
  };

  const joinRoom = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try { acceptRoom(await join.mutateAsync({ code: joinCode.trim().toUpperCase() })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось войти в комнату"); }
  };

  const startRoom = async () => {
    if (!room) return;
    setError("");
    try { acceptRoom(await start.mutateAsync({ code: room.code })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось начать соревнование"); }
  };

  const sendAnswer = async () => {
    if (!room || !currentTask || !canAnswer || answered.has(currentTask.index) || !answer.trim()) return;
    setError("");
    setNotice("");
    try {
      const value = await submitAnswer.mutateAsync({ code: room.code, taskIndex: currentTask.index, answer });
      acceptRoom(value);
      setAnswer("");
      setNotice("Ответ принят. Изменить его уже нельзя.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ответ не отправлен");
    }
  };

  const copyCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice(`Код комнаты: ${room.code}`);
    }
  };

  if (!props.authenticated) {
    return (
      <div className="competition-page">
        <section className="competition-guest">
          <span className="competition-guest-icon"><Swords size={34} /></span>
          <div className="eyebrow">Космические гонки · 3–8 учеников</div>
          <h1>Один набор заданий.<br />Один честный финиш.</h1>
          <p>Войди в аккаунт, чтобы создать комнату или присоединиться по коду. Победители получат постоянные кубки и искры для новых оформлений.</p>
          <button type="button" className="primary-button" onClick={props.onLogin}><UserRound size={18} />Войти и играть</button>
        </section>
      </div>
    );
  }

  return (
    <div className="competition-page">
      <section className="competition-heading">
        <div>
          <div className="eyebrow"><Swords size={14} />Космические гонки</div>
          <h1>{room?.status === "finished" ? "Финиш. Время кубков!" : room ? `Комната ${room.code}` : "Соревнуйся. Решай. Забирай стиль."}</h1>
          <p>{COMPETITION_TASK_COUNT} одинаковых заданий · 90 секунд · сначала точность, затем время.</p>
        </div>
        <div className="arena-wallet" aria-label={`${props.sparkBalance} ${sparkWord(props.sparkBalance)}`}>
          <Sparkles size={20} /><strong>{props.sparkBalance}</strong><span>{sparkWord(props.sparkBalance)}</span>
        </div>
      </section>

      <section className="trophy-shelf" aria-label="Коллекция кубков">
        <div><Trophy size={19} /><span>Золото</span><strong>{props.trophies.gold}</strong></div>
        <div><Medal size={19} /><span>Серебро</span><strong>{props.trophies.silver}</strong></div>
        <div><Medal size={19} /><span>Бронза</span><strong>{props.trophies.bronze}</strong></div>
        <p>1 место · 5 искр&nbsp;&nbsp; 2 место · 3&nbsp;&nbsp; 3 место · 2&nbsp;&nbsp; Финиш · 1</p>
      </section>

      {error && <div className="competition-error" role="alert">{error}</div>}
      {notice && <div className="competition-notice" role="status"><Check size={16} />{notice}</div>}

      {!code ? (
        <div className="arena-setup-grid">
          <section className="arena-setup">
            <span className="setup-number">01</span>
            <Swords size={27} />
            <h2>Создать комнату</h2>
            <p>Ты будешь создателем и запустишь общий отсчёт, когда соберутся хотя бы {COMPETITION_MIN_PLAYERS} ученика.</p>
            <form onSubmit={createRoom}>
              <label>Класс
                <select value={grade} onChange={(event) => setGrade(Number(event.target.value))}>
                  {[4, 5, 6, 7, 8, 9].map((value) => <option key={value} value={value}>{value} класс</option>)}
                </select>
              </label>
              <label>Сложность
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as "medium" | "hard")}>
                  <option value="medium">Уверенно</option>
                  <option value="hard">Сложно</option>
                </select>
              </label>
              <button type="submit" className="primary-button" disabled={create.isPending}><Plus size={18} />{create.isPending ? "Создаём…" : "Создать"}</button>
            </form>
          </section>
          <section className="arena-setup join-setup">
            <span className="setup-number">02</span>
            <UsersRound size={27} />
            <h2>Войти по коду</h2>
            <p>Получи шесть символов от создателя комнаты. Задания у всех участников будут одинаковыми.</p>
            <form onSubmit={joinRoom}>
              <label>Код комнаты
                <input className="room-code-input" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} minLength={4} maxLength={8} required autoComplete="off" placeholder="Например, D4P288" />
              </label>
              <button type="submit" className="primary-button" disabled={join.isPending}><ArrowRight size={18} />{join.isPending ? "Входим…" : "Присоединиться"}</button>
            </form>
          </section>
          <section className="spark-history">
            <div className="spark-history-heading"><Sparkles size={19} /><h2>Последние награды</h2></div>
            {props.sparkEvents.length ? (
              <ul>{props.sparkEvents.slice(0, 5).map((event, index) => (
                <li key={`${event.createdAt.getTime()}-${index}`}><span>{event.note ?? (event.kind === "homework" ? "Послание" : "Награда")}</span><strong>{event.amount > 0 ? "+" : ""}{event.amount}</strong></li>
              ))}</ul>
            ) : <p>Здесь появятся искры за гонки и подтверждённые учителем послания.</p>}
          </section>
        </div>
      ) : roomQuery.isLoading ? (
        <div className="arena-loading" role="status">Подключаемся к комнате…</div>
      ) : roomQuery.isError || !room ? (
        <div className="arena-loading" role="alert"><p>Не удалось открыть сохранённую комнату. Возможно, ты вошёл в другой аккаунт.</p><button type="button" className="primary-button" onClick={closeRoom}>Другая комната</button></div>
      ) : room.status === "lobby" ? (
        <div className="lobby-layout">
          <section className="lobby-card">
            <div className="eyebrow"><Flag size={14} />Сбор участников</div>
            <h2>Позови класс в комнату</h2>
            <button type="button" className="room-code" onClick={copyCode} aria-label={`Код комнаты ${room.code}. Скопировать`}>
              <span>{room.code}</span><Clipboard size={20} /><small>{copied ? "Скопировано" : "Скопировать код"}</small>
            </button>
            <p>{room.grade} класс · {room.difficulty === "hard" ? "Сложно" : "Уверенно"} · {room.taskCount} заданий · {room.durationSec} секунд</p>
            <div className="lobby-players">
              {room.players.map((player, index) => <div key={player.userId}><span>{index + 1}</span><strong>{player.name}</strong>{player.userId === room.hostUserId && <Crown size={16} />}</div>)}
              {Array.from({ length: Math.max(0, COMPETITION_MIN_PLAYERS - room.players.length) }, (_, index) => <div className="empty-player" key={`empty-${index}`}><span>·</span><strong>Ждём ученика…</strong></div>)}
            </div>
            {room.hostUserId === props.currentUserId ? (
              <button type="button" className="primary-button lobby-start" onClick={startRoom} disabled={start.isPending || room.players.length < COMPETITION_MIN_PLAYERS}>
                <Play size={18} />{start.isPending ? "Готовим задания…" : room.players.length < COMPETITION_MIN_PLAYERS ? `Нужно ещё ${COMPETITION_MIN_PLAYERS - room.players.length}` : "Начать соревнование"}
              </button>
            ) : <div className="lobby-waiting"><Clock3 size={17} />Создатель комнаты запустит общий отсчёт.</div>}
            <small className="lobby-hint">Старт доступен создателю при {COMPETITION_MIN_PLAYERS}–{COMPETITION_MAX_PLAYERS} участниках.</small>
            <button type="button" className="text-button" onClick={closeRoom}>Другая комната</button>
          </section>
        </div>
      ) : room.status === "active" ? (
        <div className="race-layout">
          <section className="race-card">
            <div className="race-topline">
              <div><span>Задание</span><strong>{Math.min(room.taskCount, answered.size + 1)} / {room.taskCount}</strong></div>
              <div className={`race-timer ${secondsLeft <= 15 ? "urgent" : ""}`} role="timer" aria-label={`Осталось ${secondsLeft} секунд`}><Clock3 size={19} /><strong>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</strong></div>
            </div>
            <div className="race-progress" aria-hidden="true"><span style={{ width: `${answered.size / room.taskCount * 100}%` }} /></div>
            <div className="race-task-nav" aria-label="Задания соревнования">
              {room.tasks.map((task) => <button type="button" key={task.index} className={`${task.index === taskIndex ? "current" : ""} ${answered.has(task.index) ? "done" : ""}`} onClick={() => { setTaskIndex(task.index); setAnswer(""); setNotice(""); }} aria-label={`Задание ${task.index + 1}${answered.has(task.index) ? ", ответ отправлен" : ""}`}>{answered.has(task.index) ? <Check size={14} /> : task.index + 1}</button>)}
            </div>
            {currentTask && (
              <div className="race-exercise">
                <span className="race-task-label">Задание {currentTask.index + 1}</span>
                <div className="race-expression"><MathText text={currentTask.expression} /></div>
                {answered.has(currentTask.index) ? (
                  <div className="answer-locked"><Check size={22} /><strong>Ответ отправлен</strong><span>Выбери следующее незаполненное задание.</span></div>
                ) : (
                  <>
                    <label htmlFor="competition-answer">Твой ответ</label>
                    <div className="race-answer-row">
                      <input id="competition-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void sendAnswer(); }} disabled={!canAnswer || submitAnswer.isPending} inputMode="text" autoComplete="off" placeholder="Число" />
                      <button type="button" className="primary-button" onClick={() => void sendAnswer()} disabled={!canAnswer || submitAnswer.isPending || !answer.trim()}><Send size={18} />{submitAnswer.isPending ? "Отправляем…" : "Ответить"}</button>
                    </div>
                    <small>Одна отправка на задание. Вернуться и заменить ответ нельзя.</small>
                  </>
                )}
              </div>
            )}
            {startsIn > 0 && <div className="countdown-overlay" role="status"><span>Приготовься</span><strong>{startsIn}</strong><small>Ответы откроются для всех одновременно</small></div>}
          </section>
          <aside className="race-leaderboard">
            <div className="leaderboard-heading"><Swords size={18} /><h2>Сейчас в забеге</h2></div>
              {rankedPlayers.map((player, index) => <div className="leader-row" key={player.userId}><span>{index + 1}</span><strong>{player.name}</strong><small>{player.answered}/{room.taskCount}</small><b>{player.correct}</b></div>)}
            <p><b>Число справа</b> — правильные ответы. При равенстве побеждает меньшее время.</p>
          </aside>
        </div>
      ) : (
        <div className="finish-page">
          <section className="podium-section">
            <div className="podium">
              {rankedPlayers.filter((player) => player.place).slice(0, 3).map((player) => (
                <div className={`podium-player place-${player.place}`} key={player.userId}>
                  <span className="podium-medal">{player.place === 1 ? <Crown size={27} /> : <Medal size={25} />}</span>
                  <strong>{player.name}</strong>
                  <span>{player.correct} верно · {playerTime(player.totalTimeMs)}</span>
                  <div><b>{player.place}</b><small>+{player.sparks} {sparkWord(player.sparks)}</small></div>
                </div>
              ))}
            </div>
            {!rankedPlayers.some((player) => player.place) && <p className="no-winners">В этой комнате никто не отправил ответ, поэтому наград нет.</p>}
          </section>
          <section className="finish-table">
            <h2>Итоги комнаты</h2>
            {rankedPlayers.map((player, index) => <div key={player.userId}><span>{player.place ?? index + 1}</span><strong>{player.name}</strong><small>{player.correct}/{room.taskCount} верно</small><b>{player.sparks ? `+${player.sparks}` : "—"}</b></div>)}
          </section>
          <section className="answer-review">
            <div><Flag size={19} /><h2>Разбор правильных ответов</h2></div>
            <ol>{room.tasks.map((task) => <li key={task.index}><span><MathText text={task.expression} /></span><strong>{task.answer}</strong></li>)}</ol>
          </section>
          <button type="button" className="primary-button finish-again" onClick={closeRoom}><Swords size={18} />Новая комната</button>
        </div>
      )}

      {props.isAdmin && <TeacherRewards />}
    </div>
  );
}
