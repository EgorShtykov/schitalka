import { useMemo, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  GraduationCap,
  KeyRound,
  Paperclip,
  PiggyBank,
  Plus,
  Bot,
  School,
  Send,
  Trash2,
  Upload,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { StipendTeacher } from "./StipendTeacher";
import "./SchoolPage.css";

type SchoolPageProps = {
  authenticated: boolean;
  isAdmin: boolean;
  onLogin: () => void;
};

type AiReport = {
  summary: string;
  strengths: string[];
  issues: string[];
  suggestedGrade: number | null;
  confidence: number;
};

function parseAiReport(raw: string | null): AiReport | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AiReport;
  } catch {
    return null;
  }
}

function dateText(value: Date | string | null) {
  if (!value) return "Без срока";
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sizeText(size: number) {
  return size > 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} МБ`
    : `${Math.ceil(size / 1024)} КБ`;
}

export function SchoolPage({
  authenticated,
  isAdmin,
  onLogin,
}: SchoolPageProps) {
  if (!authenticated) {
    return (
      <section className="school-login school-panel">
        <School size={42} />
        <div className="eyebrow">Классы и домашние работы</div>
        <h1>Школьный раздел</h1>
        <p>
          Войдите в аккаунт, чтобы увидеть задания учителя, отправить решение и
          открыть журнал оценок.
        </p>
        <button type="button" className="primary-button" onClick={onLogin}>
          Войти в аккаунт
        </button>
      </section>
    );
  }
  return isAdmin ? <TeacherCabinet /> : <StudentCabinet />;
}

function TeacherCabinet() {
  const utils = trpc.useUtils();
  const overview = trpc.teacher.overview.useQuery(undefined, { retry: false });
  const [tab, setTab] = useState<"classes" | "assignments" | "grades" | "stipend">(
    "classes"
  );
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [className, setClassName] = useState("");
  const [classGrade, setClassGrade] = useState(5);
  const [studentLogin, setStudentLogin] = useState("");
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<{
    name: string;
    value: string;
  } | null>(null);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentDue, setAssignmentDue] = useState("");
  const [openSubmissionId, setOpenSubmissionId] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewGrade, setReviewGrade] = useState("5");
  const [gradeStudentId, setGradeStudentId] = useState("");
  const [gradeValue, setGradeValue] = useState("5");
  const [gradeComment, setGradeComment] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = async () => {
    await utils.teacher.overview.invalidate();
  };
  const createClass = trpc.teacher.createClass.useMutation({
    onSuccess: refresh,
  });
  const addStudent = trpc.teacher.addStudent.useMutation({
    onSuccess: refresh,
  });
  const removeStudent = trpc.teacher.removeStudent.useMutation({
    onSuccess: refresh,
  });
  const resetPassword = trpc.teacher.resetPassword.useMutation();
  const createAssignment = trpc.teacher.createAssignment.useMutation({
    onSuccess: refresh,
  });
  const reviewSubmission = trpc.teacher.reviewSubmission.useMutation({
    onSuccess: refresh,
  });
  const addGrade = trpc.teacher.addGrade.useMutation({ onSuccess: refresh });
  const checkSubmission = trpc.teacher.checkSubmission.useMutation({
    onSuccess: refresh,
  });
  const busy =
    createClass.isPending ||
    addStudent.isPending ||
    removeStudent.isPending ||
    createAssignment.isPending ||
    reviewSubmission.isPending ||
    addGrade.isPending;

  const data = overview.data;
  const activeClass =
    data?.classes.find(item => item.id === selectedClassId) ??
    data?.classes[0] ??
    null;
  const activeClassId = activeClass?.id ?? 0;
  const allSubmissions = useMemo(
    () =>
      data?.assignments.flatMap(assignment =>
        assignment.submissions.map(submission => ({
          ...submission,
          assignmentTitle: assignment.title,
        }))
      ) ?? [],
    [data]
  );

  const run = async (operation: Promise<unknown>, success: string) => {
    setError("");
    setNotice("");
    try {
      await operation;
      setNotice(success);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Не удалось выполнить действие"
      );
    }
  };

  if (overview.isLoading)
    return <div className="school-loading">Загружаем учительский кабинет…</div>;
  if (overview.error || !data)
    return (
      <div className="school-error" role="alert">
        {overview.error?.message || "Кабинет не загрузился"}
      </div>
    );

  return (
    <div className="school-cabinet">
      <section className="school-hero">
        <div>
          <div className="eyebrow">Учительский кабинет</div>
          <h1>Классы, работы и журнал</h1>
          <p>
            Назначайте задания, проверяйте решения и следите за реальным
            прогрессом учеников.
          </p>
        </div>
        <div className="school-hero-stats">
          <div>
            <strong>{data.classes.length}</strong>
            <span>классов</span>
          </div>
          <div>
            <strong>
              {data.classes.reduce((sum, item) => sum + item.members.length, 0)}
            </strong>
            <span>учеников</span>
          </div>
          <div>
            <strong>{allSubmissions.length}</strong>
            <span>работ</span>
          </div>
        </div>
      </section>
      <div className="school-tabs" role="tablist">
        <button
          type="button"
          className={tab === "classes" ? "active" : ""}
          onClick={() => setTab("classes")}
        >
          <Users size={17} />
          Классы и статистика
        </button>
        <button
          type="button"
          className={tab === "assignments" ? "active" : ""}
          onClick={() => setTab("assignments")}
        >
          <ClipboardList size={17} />
          Домашние работы
        </button>
        <button
          type="button"
          className={tab === "grades" ? "active" : ""}
          onClick={() => setTab("grades")}
        >
          <GraduationCap size={17} />
          Журнал оценок
        </button>
        <button
          type="button"
          className={tab === "stipend" ? "active" : ""}
          onClick={() => setTab("stipend")}
        >
          <PiggyBank size={17} />
          Стипендия
        </button>
      </div>
      {error && (
        <div className="school-error" role="alert">
          <XCircle size={18} />
          {error}
        </div>
      )}
      {notice && (
        <div className="school-notice" role="status">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}
      {temporaryPassword && (
        <div className="temporary-password" role="alert">
          <KeyRound size={22} />
          <div>
            <strong>Временный пароль для {temporaryPassword.name}</strong>
            <code>{temporaryPassword.value}</code>
            <p>
              Покажите его ученику сейчас — после обновления страницы пароль
              скроется. При входе ученик обязан задать свой пароль.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(temporaryPassword.value);
            }}
          >
            Копировать
          </button>
          <button
            type="button"
            aria-label="Скрыть пароль"
            onClick={() => setTemporaryPassword(null)}
          >
            ×
          </button>
        </div>
      )}

      {tab === "classes" && (
        <div className="school-layout">
          <aside className="school-panel class-list-panel">
            <h2>Мои классы</h2>
            <div className="class-list">
              {data.classes.map(item => (
                <button
                  type="button"
                  key={item.id}
                  className={activeClassId === item.id ? "active" : ""}
                  onClick={() => setSelectedClassId(item.id)}
                >
                  <span>{item.name}</span>
                  <small>
                    {item.grade} класс · {item.members.length} уч.
                  </small>
                </button>
              ))}
            </div>
            <form
              className="school-form compact"
              onSubmit={event => {
                event.preventDefault();
                void run(
                  createClass
                    .mutateAsync({ name: className, grade: classGrade })
                    .then(() => setClassName("")),
                  "Класс создан"
                );
              }}
            >
              <h3>
                <Plus size={16} />
                Новый класс
              </h3>
              <input
                value={className}
                onChange={event => setClassName(event.target.value)}
                placeholder="Например, 5А"
                minLength={2}
                maxLength={40}
                required
              />
              <select
                value={classGrade}
                onChange={event => setClassGrade(Number(event.target.value))}
              >
                {[4, 5, 6, 7, 8, 9].map(grade => (
                  <option key={grade} value={grade}>
                    {grade} класс
                  </option>
                ))}
              </select>
              <button type="submit" className="primary-button" disabled={busy}>
                Создать
              </button>
            </form>
          </aside>
          <section className="school-panel class-members-panel">
            {activeClass ? (
              <>
                <div className="school-section-heading">
                  <div>
                    <h2>{activeClass.name}</h2>
                    <p>
                      {activeClass.grade} класс · участники и статистика
                      тренировок
                    </p>
                  </div>
                  <form
                    className="add-student-form"
                    onSubmit={event => {
                      event.preventDefault();
                      void run(
                        addStudent
                          .mutateAsync({
                            classId: activeClass.id,
                            login: studentLogin,
                          })
                          .then(() => setStudentLogin("")),
                        "Ученик добавлен"
                      );
                    }}
                  >
                    <input
                      value={studentLogin}
                      onChange={event => setStudentLogin(event.target.value)}
                      placeholder="Логин ученика"
                      minLength={3}
                      maxLength={24}
                      required
                    />
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={busy}
                    >
                      <UserPlus size={17} />
                      Добавить
                    </button>
                  </form>
                </div>
                {activeClass.members.length === 0 ? (
                  <div className="school-empty">
                    Добавьте первого ученика по логину из его аккаунта.
                  </div>
                ) : (
                  <div className="member-list">
                    {activeClass.members.map(member => {
                      const memberName = member.name ?? "Ученик";
                      const stats = member.stats;
                      const accuracy = stats?.attempts
                        ? Math.round((stats.firstTry / stats.attempts) * 100)
                        : 0;
                      const mastered = member.topics.filter(
                        topic =>
                          topic.masterySolved >= 20 &&
                          topic.masteryAttempts > 0 &&
                          topic.masteryFirstTry / topic.masteryAttempts >= 0.8
                      ).length;
                      const expanded = expandedStudent === member.id;
                      return (
                        <article className="member-card" key={member.id}>
                          <button
                            type="button"
                            className="member-summary"
                            onClick={() =>
                              setExpandedStudent(expanded ? null : member.id)
                            }
                          >
                            <div className="member-avatar">
                              {memberName.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="member-name">
                              <strong>{memberName}</strong>
                              <span>
                                Последний вход:{" "}
                                {member.lastSignInAt
                                  ? dateText(member.lastSignInAt)
                                  : "ещё не было"}
                              </span>
                            </div>
                            <div>
                              <strong>{stats?.solved ?? 0}</strong>
                              <span>решено</span>
                            </div>
                            <div>
                              <strong>{accuracy}%</strong>
                              <span>с первого раза</span>
                            </div>
                            <div>
                              <strong>{mastered}</strong>
                              <span>зачётов</span>
                            </div>
                            {expanded ? (
                              <ChevronUp size={18} />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                          </button>
                          {expanded && (
                            <div className="member-details">
                              <div className="member-metrics">
                                <span>
                                  Попыток:{" "}
                                  <strong>{stats?.attempts ?? 0}</strong>
                                </span>
                                <span>
                                  Лучшая серия:{" "}
                                  <strong>{stats?.bestStreak ?? 0}</strong>
                                </span>
                                <span>
                                  Плюсики:{" "}
                                  <strong>{stats?.plusBalance ?? 0}</strong>
                                </span>
                                <span>
                                  Искры:{" "}
                                  <strong>{stats?.sparkBalance ?? 0}</strong>
                                </span>
                              </div>
                              <h4>Прогресс по темам</h4>
                              {member.topics.length ? (
                                <div className="topic-stat-grid">
                                  {member.topics.map(topic => (
                                    <div key={topic.topicId}>
                                      <span>{topic.topicId}</span>
                                      <strong>
                                        {topic.solved} решено ·{" "}
                                        {topic.attempts
                                          ? Math.round(
                                              (topic.firstTry /
                                                topic.attempts) *
                                                100
                                            )
                                          : 0}
                                        %
                                      </strong>
                                      <small>
                                        Зачёт: {topic.masterySolved}/20
                                      </small>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p>Тренировок пока не было.</p>
                              )}
                              <div className="member-actions">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Выдать новый временный пароль ученику ${memberName}? Старые сессии будут завершены.`
                                      )
                                    ) {
                                      setError("");
                                      resetPassword.mutate(
                                        {
                                          classId: activeClass.id,
                                          studentId: member.id,
                                        },
                                        {
                                          onSuccess: result =>
                                            setTemporaryPassword({
                                              name: memberName,
                                              value: result.temporaryPassword,
                                            }),
                                          onError: reason =>
                                            setError(reason.message),
                                        }
                                      );
                                    }
                                  }}
                                  disabled={resetPassword.isPending}
                                >
                                  <KeyRound size={16} />
                                  Временный пароль
                                </button>
                                <button
                                  type="button"
                                  className="danger-link"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Убрать ${memberName} из класса ${activeClass.name}? Аккаунт и работы сохранятся.`
                                      )
                                    )
                                      void run(
                                        removeStudent.mutateAsync({
                                          classId: activeClass.id,
                                          studentId: member.id,
                                        }),
                                        "Ученик удалён из класса"
                                      );
                                  }}
                                >
                                  <Trash2 size={16} />
                                  Убрать из класса
                                </button>
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="school-empty">
                Создайте класс, чтобы добавить учеников.
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "assignments" && (
        <div className="homework-teacher-view">
          <section className="school-panel assignment-create">
            <h2>
              <Plus size={19} />
              Назначить работу
            </h2>
            {data.classes.length ? (
              <form
                className="school-form"
                onSubmit={event => {
                  event.preventDefault();
                  void run(
                    createAssignment
                      .mutateAsync({
                        classId: activeClassId,
                        title: assignmentTitle,
                        description: assignmentDescription,
                        dueAt: assignmentDue
                          ? new Date(assignmentDue).toISOString()
                          : undefined,
                      })
                      .then(() => {
                        setAssignmentTitle("");
                        setAssignmentDescription("");
                        setAssignmentDue("");
                      }),
                    "Задание назначено классу"
                  );
                }}
              >
                <label>
                  Класс
                  <select
                    value={activeClassId}
                    onChange={event =>
                      setSelectedClassId(Number(event.target.value))
                    }
                  >
                    {data.classes.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Название
                  <input
                    value={assignmentTitle}
                    onChange={event => setAssignmentTitle(event.target.value)}
                    minLength={3}
                    maxLength={120}
                    required
                    placeholder="Например, Дроби — повторение"
                  />
                </label>
                <label>
                  Задание
                  <textarea
                    value={assignmentDescription}
                    onChange={event =>
                      setAssignmentDescription(event.target.value)
                    }
                    minLength={3}
                    maxLength={5000}
                    required
                    rows={5}
                    placeholder="Условия, номера задач и требования к оформлению"
                  />
                </label>
                <label>
                  Срок (необязательно)
                  <input
                    type="datetime-local"
                    value={assignmentDue}
                    onChange={event => setAssignmentDue(event.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy}
                >
                  <Send size={17} />
                  Назначить
                </button>
              </form>
            ) : (
              <p>Сначала создайте класс на вкладке «Классы и статистика».</p>
            )}
          </section>
          <section className="assignment-list">
            <div className="ai-budget">
              <Bot size={20} />
              <div>
                <strong>ИИ-проверка — только по кнопке</strong>
                <span>
                  {data.ai.configured
                    ? `Осталось ${data.ai.remaining} из ${data.ai.limit} проверок в этом месяце`
                    : "ИИ не настроен на сервере"}
                </span>
              </div>
            </div>
            {data.assignments.length === 0 && (
              <div className="school-panel school-empty">Заданий пока нет.</div>
            )}
            {data.assignments.map(assignment => (
              <article
                className="school-panel teacher-assignment"
                key={assignment.id}
              >
                <div className="assignment-heading">
                  <div>
                    <span className="school-chip">{assignment.className}</span>
                    <h3>{assignment.title}</h3>
                    <p>{assignment.description}</p>
                  </div>
                  <small>{dateText(assignment.dueAt)}</small>
                </div>
                <h4>Отправленные работы · {assignment.submissions.length}</h4>
                {assignment.submissions.length === 0 ? (
                  <p className="muted">Ученики ещё не отправили решения.</p>
                ) : (
                  <div className="submission-list">
                    {assignment.submissions.map(submission => {
                      const report = parseAiReport(submission.aiReport);
                      return (
                        <div className="submission-row" key={submission.id}>
                          <button
                            type="button"
                            className="submission-open"
                            onClick={() => {
                              setOpenSubmissionId(
                                openSubmissionId === submission.id
                                  ? null
                                  : submission.id
                              );
                              setReviewComment(submission.teacherComment ?? "");
                            }}
                          >
                            <span>
                              <strong>{submission.studentName}</strong>
                              <small>
                                {submission.status === "reviewed"
                                  ? "Проверено"
                                  : submission.status === "needs_revision"
                                    ? "Нужна доработка"
                                    : "Ожидает проверки"}{" "}
                                · {dateText(submission.updatedAt)}
                              </small>
                            </span>
                            <span>
                              {submission.files.length} файлов{" "}
                              {openSubmissionId === submission.id ? (
                                <ChevronUp size={17} />
                              ) : (
                                <ChevronDown size={17} />
                              )}
                            </span>
                          </button>
                          {openSubmissionId === submission.id && (
                            <div className="submission-review">
                              <div className="student-answer">
                                <h4>Ответ ученика</h4>
                                <p>
                                  {submission.textAnswer ||
                                    "Текстовый ответ не добавлен."}
                                </p>
                                <div className="file-list">
                                  {submission.files.map(file => (
                                    <a
                                      key={file.id}
                                      href={`/api/homework/files/${file.id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <FileText size={16} />
                                      {file.originalName}
                                      <small>{sizeText(file.size)}</small>
                                    </a>
                                  ))}
                                </div>
                              </div>
                              <div className="ai-report">
                                <div className="ai-report-heading">
                                  <Bot size={18} />
                                  <strong>Предварительная ИИ-проверка</strong>
                                </div>
                                {report ? (
                                  <>
                                    <p>{report.summary}</p>
                                    {report.strengths.length > 0 && (
                                      <ul>
                                        {report.strengths.map((item, index) => (
                                          <li key={index}>✓ {item}</li>
                                        ))}
                                      </ul>
                                    )}
                                    {report.issues.length > 0 && (
                                      <ul>
                                        {report.issues.map((item, index) => (
                                          <li key={index}>• {item}</li>
                                        ))}
                                      </ul>
                                    )}
                                    <small>
                                      Уверенность ИИ:{" "}
                                      {Math.round(report.confidence * 100)}%
                                      {report.suggestedGrade
                                        ? ` · предложение: ${report.suggestedGrade}`
                                        : " · оценка не предложена"}
                                      . Решение принимает учитель.
                                    </small>
                                  </>
                                ) : (
                                  <p>
                                    {submission.aiStatus === "processing"
                                      ? "Проверка выполняется…"
                                      : submission.aiStatus === "failed"
                                        ? "Последняя проверка не завершилась. Автоматического повтора не было."
                                        : "Отчёт ещё не запрошен."}
                                  </p>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    void run(
                                      checkSubmission.mutateAsync({
                                        submissionId: submission.id,
                                      }),
                                      "ИИ-отчёт готов; оценка не изменена"
                                    )
                                  }
                                  disabled={
                                    checkSubmission.isPending ||
                                    !data.ai.configured ||
                                    data.ai.remaining <= 0 ||
                                    submission.aiStatus === "processing"
                                  }
                                >
                                  <Bot size={16} />
                                  {checkSubmission.isPending
                                    ? "Проверяем…"
                                    : report
                                      ? "Проверить ещё раз вручную"
                                      : "Запустить ИИ-проверку"}
                                </button>
                              </div>
                              <form
                                className="review-form"
                                onSubmit={event => {
                                  event.preventDefault();
                                  const submitter = (
                                    event.nativeEvent as SubmitEvent
                                  ).submitter as HTMLButtonElement | null;
                                  const status = submitter?.value as
                                    | "reviewed"
                                    | "needs_revision";
                                  void run(
                                    reviewSubmission.mutateAsync({
                                      submissionId: submission.id,
                                      status,
                                      teacherComment:
                                        reviewComment || undefined,
                                      grade:
                                        status === "reviewed"
                                          ? Number(reviewGrade)
                                          : undefined,
                                    }),
                                    "Проверка сохранена учителем"
                                  );
                                }}
                              >
                                <label>
                                  Комментарий учителя
                                  <textarea
                                    value={reviewComment}
                                    onChange={event =>
                                      setReviewComment(event.target.value)
                                    }
                                    maxLength={2000}
                                    rows={3}
                                    placeholder="Что получилось и что исправить"
                                  />
                                </label>
                                <label>
                                  Оценка
                                  <select
                                    value={reviewGrade}
                                    onChange={event =>
                                      setReviewGrade(event.target.value)
                                    }
                                  >
                                    {[5, 4, 3, 2, 1].map(grade => (
                                      <option key={grade} value={grade}>
                                        {grade}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <div className="review-actions">
                                  <button
                                    type="submit"
                                    name="status"
                                    value="reviewed"
                                    className="primary-button"
                                    disabled={busy}
                                  >
                                    <BookOpenCheck size={17} />
                                    Принять и оценить
                                  </button>
                                  <button
                                    type="submit"
                                    name="status"
                                    value="needs_revision"
                                    disabled={busy}
                                  >
                                    Вернуть на доработку
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            ))}
          </section>
        </div>
      )}

      {tab === "grades" && (
        <div className="grades-layout">
          <section className="school-panel">
            <h2>Добавить оценку</h2>
            {activeClass ? (
              <form
                className="school-form"
                onSubmit={event => {
                  event.preventDefault();
                  void run(
                    addGrade
                      .mutateAsync({
                        classId: activeClass.id,
                        studentId: Number(gradeStudentId),
                        grade: Number(gradeValue),
                        comment: gradeComment,
                      })
                      .then(() => setGradeComment("")),
                    "Оценка добавлена в журнал"
                  );
                }}
              >
                <label>
                  Класс
                  <select
                    value={activeClassId}
                    onChange={event => {
                      setSelectedClassId(Number(event.target.value));
                      setGradeStudentId("");
                    }}
                  >
                    {data.classes.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Ученик
                  <select
                    value={gradeStudentId}
                    onChange={event => setGradeStudentId(event.target.value)}
                    required
                  >
                    <option value="">Выберите ученика</option>
                    {activeClass.members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name ?? "Ученик"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Оценка
                  <select
                    value={gradeValue}
                    onChange={event => setGradeValue(event.target.value)}
                  >
                    {[5, 4, 3, 2, 1].map(grade => (
                      <option key={grade}>{grade}</option>
                    ))}
                  </select>
                </label>
                <label>
                  За что
                  <textarea
                    value={gradeComment}
                    onChange={event => setGradeComment(event.target.value)}
                    minLength={2}
                    maxLength={255}
                    required
                    rows={3}
                  />
                </label>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy}
                >
                  Добавить в журнал
                </button>
              </form>
            ) : (
              <p>Создайте класс и добавьте учеников.</p>
            )}
          </section>
          <section className="school-panel grade-journal">
            <h2>Последние оценки</h2>
            {data.grades.length ? (
              <div className="grade-table">
                <div className="grade-table-head">
                  <span>Дата</span>
                  <span>Ученик</span>
                  <span>Класс</span>
                  <span>Оценка</span>
                  <span>Комментарий</span>
                </div>
                {data.grades.map(entry => (
                  <div key={entry.id}>
                    <span>
                      {new Date(entry.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                    <strong>{entry.studentName}</strong>
                    <span>{entry.className || "—"}</span>
                    <b className={`grade-badge grade-${entry.grade}`}>
                      {entry.grade}
                    </b>
                    <span>{entry.comment}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="school-empty">Журнал пока пуст.</div>
            )}
          </section>
        </div>
      )}

      {tab === "stipend" && <StipendTeacher run={run} />}
    </div>
  );
}

function StudentCabinet() {
  const utils = trpc.useUtils();
  const overview = trpc.school.overview.useQuery(undefined, { retry: false });
  const submit = trpc.school.submit.useMutation();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [files, setFiles] = useState<Record<number, File[]>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const sendWork = async (assignmentId: number, textAnswer: string) => {
    setBusyId(assignmentId);
    setError("");
    setNotice("");
    try {
      const result = await submit.mutateAsync({
        assignmentId,
        textAnswer: textAnswer || undefined,
      });
      for (const file of files[assignmentId] ?? []) {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch(
          `/api/homework/submissions/${result.submissionId}/files`,
          { method: "POST", body: form, credentials: "include" }
        );
        const payload = (await response.json()) as { error?: string };
        if (!response.ok)
          throw new Error(payload.error || `Не удалось загрузить ${file.name}`);
      }
      setFiles(current => ({ ...current, [assignmentId]: [] }));
      await utils.school.overview.invalidate();
      setNotice(
        "Работа отправлена учителю. ИИ-проверка автоматически не запускается."
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Не удалось отправить работу"
      );
    } finally {
      setBusyId(null);
    }
  };

  const deleteFile = async (fileId: string) => {
    setError("");
    try {
      const response = await fetch(`/api/homework/files/${fileId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error || "Не удалось удалить файл");
      await utils.school.overview.invalidate();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось удалить файл");
    }
  };

  if (overview.isLoading)
    return <div className="school-loading">Загружаем задания…</div>;
  if (overview.error || !overview.data)
    return (
      <div className="school-error">
        {overview.error?.message || "Задания не загрузились"}
      </div>
    );
  const data = overview.data;
  return (
    <div className="school-cabinet student-cabinet">
      <section className="school-hero">
        <div>
          <div className="eyebrow">Мои классы</div>
          <h1>Домашние работы</h1>
          <p>Открой задание, напиши решение и прикрепи до пяти фото или PDF.</p>
        </div>
        <School size={54} />
      </section>
      {error && (
        <div className="school-error" role="alert">
          <XCircle size={18} />
          {error}
        </div>
      )}
      {notice && (
        <div className="school-notice">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}
      {data.classes.length === 0 && (
        <section className="school-panel school-empty">
          Учитель пока не добавил тебя в класс. Сообщи ему логин своего
          аккаунта.
        </section>
      )}
      {data.classes.map(schoolClass => (
        <section className="student-class" key={schoolClass.id}>
          <div className="student-class-heading">
            <div>
              <span className="school-chip">{schoolClass.grade} класс</span>
              <h2>{schoolClass.name}</h2>
            </div>
            <span>{schoolClass.assignments.length} заданий</span>
          </div>
          {schoolClass.assignments.length === 0 && (
            <div className="school-panel school-empty">
              В этом классе пока нет заданий.
            </div>
          )}
          {schoolClass.assignments.map(assignment => {
            const submission = assignment.submission;
            const locked = submission?.status === "reviewed";
            const draft = drafts[assignment.id] ?? submission?.textAnswer ?? "";
            return (
              <article
                className="school-panel student-assignment"
                key={assignment.id}
              >
                <div className="assignment-heading">
                  <div>
                    <h3>{assignment.title}</h3>
                    <p>{assignment.description}</p>
                  </div>
                  <span
                    className={`submission-status status-${submission?.status ?? "empty"}`}
                  >
                    {submission?.status === "reviewed"
                      ? "Проверено"
                      : submission?.status === "needs_revision"
                        ? "На доработку"
                        : submission
                          ? "Отправлено"
                          : "Не отправлено"}
                  </span>
                </div>
                <small className="assignment-due">
                  Срок: {dateText(assignment.dueAt)}
                </small>
                {submission?.teacherComment && (
                  <div className="teacher-comment">
                    <strong>Комментарий учителя</strong>
                    <p>{submission.teacherComment}</p>
                  </div>
                )}
                <label className="answer-label">
                  Текст решения
                  <textarea
                    value={draft}
                    onChange={event =>
                      setDrafts(current => ({
                        ...current,
                        [assignment.id]: event.target.value,
                      }))
                    }
                    maxLength={5000}
                    rows={5}
                    disabled={locked}
                    placeholder="Запиши ответ или краткое решение"
                  />
                </label>
                {submission && submission.files.length > 0 && (
                  <div className="file-list student-files">
                    {submission.files.map(file => (
                      <div key={file.id}>
                        <a
                          href={`/api/homework/files/${file.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Paperclip size={16} />
                          {file.originalName}
                          <small>{sizeText(file.size)}</small>
                        </a>
                        {!locked && (
                          <button
                            type="button"
                            aria-label={`Удалить ${file.originalName}`}
                            onClick={() => void deleteFile(file.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!locked && (
                  <>
                    <label className="file-picker">
                      <Upload size={19} />
                      <span>
                        {files[assignment.id]?.length
                          ? `Выбрано: ${files[assignment.id].map(file => file.name).join(", ")}`
                          : "Добавить фото или PDF"}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        multiple
                        onChange={event => {
                          const selected = Array.from(event.target.files ?? []);
                          if (
                            selected.length + (submission?.files.length ?? 0) >
                            5
                          ) {
                            setError(
                              "Всего можно прикрепить не больше 5 файлов"
                            );
                            event.target.value = "";
                            return;
                          }
                          setFiles(current => ({
                            ...current,
                            [assignment.id]: selected,
                          }));
                        }}
                      />
                    </label>
                    <p className="file-hint">
                      JPEG, PNG, WebP или PDF · до 10 МБ каждый · всего до 5
                      файлов
                    </p>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={
                        busyId === assignment.id ||
                        (!draft.trim() &&
                          !files[assignment.id]?.length &&
                          !submission)
                      }
                      onClick={() => void sendWork(assignment.id, draft)}
                    >
                      <Send size={17} />
                      {busyId === assignment.id
                        ? "Отправляем…"
                        : submission
                          ? "Сохранить и отправить"
                          : "Отправить учителю"}
                    </button>
                  </>
                )}
              </article>
            );
          })}
        </section>
      ))}
      <section className="school-panel student-grades">
        <h2>
          <GraduationCap size={21} />
          Мои оценки
        </h2>
        {data.grades.length ? (
          <div className="student-grade-list">
            {data.grades.map(entry => (
              <div key={entry.id}>
                <b className={`grade-badge grade-${entry.grade}`}>
                  {entry.grade}
                </b>
                <div>
                  <strong>{entry.comment}</strong>
                  <span>
                    {new Date(entry.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Оценок пока нет.</p>
        )}
      </section>
    </div>
  );
}
