import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Flag,
  Lightbulb,
  Menu,
  Palette,
  Plus,
  RotateCcw,
  Sparkles,
  Swords,
  Target,
  Trophy,
  X,
  XCircle,
} from 'lucide-react'
import './App.css'
import { AccountDialog } from './components/AccountDialog'
import { CatMascot } from './components/CatMascot'
import { CompetitionPage } from './components/CompetitionPage'
import { MathText } from './components/MathText'
import { RewardBar } from './components/RewardBar'
import { TheoryPage } from './components/TheoryPage'
import { Workshop } from './components/Workshop'
import { answersMatch, matchingPitfall } from './lib/math'
import type { Difficulty, Grade, Problem } from './lib/math'
import { getCourseMastery, getTopicMastery, TOPIC_ACCURACY_GOAL, TOPIC_TASK_GOAL } from './lib/mastery'
import { createProblem, topicsForGrade } from './lib/topics'
import { trpc } from './providers/trpc'
import type { CloudState, ProgressState, TopicId } from '@contracts/learning'
import { emptyProgress } from '@contracts/learning'

type AnswerStatus = 'idle' | 'correct' | 'wrong' | 'revealed'
type SessionResult = 'clean' | 'assisted'
type AppView = 'practice' | 'theory' | 'workshop' | 'competition'

const grades: Grade[] = [4, 5, 6, 7, 8, 9]
const difficultyLabels: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Разминка' },
  { id: 'medium', label: 'Уверенно' },
  { id: 'hard', label: 'Сложно' },
]
const praise = ['Точно!', 'Верно!', 'Отлично!', 'Есть!', 'Безошибочно!']

function loadProgress(): ProgressState {
  try {
    const saved = localStorage.getItem('schitalka-progress-v1')
    if (!saved) return emptyProgress
    const parsed = JSON.parse(saved) as Partial<ProgressState>
    return {
      ...emptyProgress,
      ...parsed,
      topics: parsed.topics ?? {},
      masteryTopics: parsed.masteryTopics ?? {},
    }
  } catch {
    return emptyProgress
  }
}

function taskWord(value: number) {
  const mod100 = value % 100
  const mod10 = value % 10
  if (mod100 >= 11 && mod100 <= 14) return 'заданий'
  if (mod10 === 1) return 'задание'
  if (mod10 >= 2 && mod10 <= 4) return 'задания'
  return 'заданий'
}

function Brand() {
  return (
    <div className="brand" aria-label="Считалка">
      <svg className="brand-mark" viewBox="0 0 44 44" aria-hidden="true">
        <path d="M6 17h10l6 20L32 7h7" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m33 27 1.8 4.2L39 33l-4.2 1.8L33 39l-1.8-4.2L27 33l4.2-1.8L33 27Z" fill="currentColor" />
      </svg>
      <span>считалка<span className="brand-dot">.</span></span>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState<AppView>('practice')
  const [grade, setGrade] = useState<Grade>(4)
  const [topicId, setTopicId] = useState('mixed')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [sessionLength, setSessionLength] = useState(10)
  const [sessionKey, setSessionKey] = useState(0)
  const [problem, setProblem] = useState<Problem>(() => createProblem(4, 'mixed', 'easy'))
  const [answer, setAnswer] = useState('')
  const [status, setStatus] = useState<AnswerStatus>('idle')
  const [feedback, setFeedback] = useState('')
  const [hintCount, setHintCount] = useState(0)
  const [attemptsOnProblem, setAttemptsOnProblem] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [results, setResults] = useState<SessionResult[]>([])
  const [completed, setCompleted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [progress, setProgress] = useState<ProgressState>(loadProgress)
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [previewTheme, setPreviewTheme] = useState('classic')
  const [workshopError, setWorkshopError] = useState('')
  const [busyTheme, setBusyTheme] = useState<string | null>(null)
  const [syncError, setSyncError] = useState('')
  const [rewardNotice, setRewardNotice] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const lastTopicRef = useRef<string | undefined>(problem.topicId)
  const cloudQueue = useRef<Promise<void>>(Promise.resolve())
  const migrationStartedFor = useRef<number | null>(null)

  const utils = trpc.useUtils()
  const meQuery = trpc.account.current.useQuery(undefined, { retry: false, staleTime: 30_000 })
  const user = meQuery.data ?? null
  const isAuthenticated = Boolean(user)
  const cloudQuery = trpc.progress.state.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchInterval: isAuthenticated ? 15_000 : false,
  })
  const cloud = cloudQuery.data
  const attemptMutation = trpc.progress.attempt.useMutation()
  const migrateMutation = trpc.progress.migrate.useMutation()
  const purchaseMutation = trpc.progress.purchase.useMutation()
  const selectThemeMutation = trpc.progress.selectTheme.useMutation()
  const resetMutation = trpc.progress.reset.useMutation()
  const gradeMutation = trpc.progress.setGrade.useMutation()
  const breakStreakMutation = trpc.progress.breakStreak.useMutation()

  const applyCloudState = useCallback((state: CloudState) => {
    utils.progress.state.setData(undefined, state)
    setProgress(state.progress)
    setPreviewTheme(state.selectedTheme)
    setSyncError('')
  }, [utils])

  const gradeTopics = useMemo(() => topicsForGrade(grade), [grade])
  const activeTopic = topicId === 'mixed' ? null : gradeTopics.find((topic) => topic.id === topicId)
  const title = activeTopic?.title ?? 'Смешанная тренировка'
  const description = activeTopic?.description ?? `Новые форматы и темы ${grade} класса — в случайном порядке, без повторения темы подряд.`
  const rule = activeTopic?.rule ?? 'Каждый ответ засчитывается в свою тему'
  const accuracy = progress.attempts ? Math.round(progress.firstTry / progress.attempts * 100) : 0
  const topicMastery = getTopicMastery(activeTopic ? progress.masteryTopics[activeTopic.id] : undefined)
  const courseMastery = useMemo(
    () => getCourseMastery(gradeTopics, progress.masteryTopics),
    [gradeTopics, progress.masteryTopics],
  )
  const currentMastery = activeTopic ? topicMastery : courseMastery
  const remaining = currentMastery.remaining
  const masteryComplete = currentMastery.complete
  const plusBalance = isAuthenticated ? cloud?.plusBalance ?? 0 : 0
  const sparkBalance = isAuthenticated ? cloud?.sparkBalance ?? 0 : 0
  const trophies = isAuthenticated ? cloud?.trophies ?? { gold: 0, silver: 0, bronze: 0 } : { gold: 0, silver: 0, bronze: 0 }
  const sparkEvents = isAuthenticated ? cloud?.sparkEvents ?? [] : []
  const purchasedThemeIds = isAuthenticated ? cloud?.purchasedThemeIds ?? [] : []
  const syncLabel = !isAuthenticated
    ? 'Локально · в этом браузере'
    : migrateMutation.isPending || attemptMutation.isPending
      ? 'Облако · сохраняем…'
      : syncError
        ? 'Облако · нужна перепроверка'
        : 'Облако · сохранено'

  const nextProblem = useCallback(() => {
    const next = createProblem(grade, topicId, difficulty, topicId === 'mixed' ? lastTopicRef.current : undefined)
    lastTopicRef.current = next.topicId
    setProblem(next)
    setAnswer('')
    setStatus('idle')
    setFeedback('')
    setHintCount(0)
    setAttemptsOnProblem(0)
  }, [grade, topicId, difficulty])

  useEffect(() => {
    setCurrentIndex(0)
    setSessionCorrect(0)
    setResults([])
    setCompleted(false)
    setElapsed(0)
    nextProblem()
  }, [sessionKey, nextProblem])

  useEffect(() => {
    if (completed) return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [completed, sessionKey])

  useEffect(() => {
    document.documentElement.dataset.theme = previewTheme
  }, [previewTheme])

  useEffect(() => {
    if (!isAuthenticated || !cloud) return
    setProgress(cloud.progress)
    if (!gradeMutation.isPending && cloud.grade >= 4 && cloud.grade <= 9) setGrade(cloud.grade as Grade)
  }, [cloud, isAuthenticated, gradeMutation.isPending])

  useEffect(() => {
    if (cloud?.selectedTheme) setPreviewTheme(cloud.selectedTheme)
  }, [cloud?.selectedTheme])

  useEffect(() => {
    if (!user || !cloud || cloud.migratedAt || migrationStartedFor.current === user.id) return
    migrationStartedFor.current = user.id
    const localProgress = loadProgress()
    migrateMutation.mutateAsync({ progress: localProgress })
      .then((result) => {
        applyCloudState(result.state)
        try { localStorage.removeItem('schitalka-progress-v1') } catch { /* Cloud copy is already safe. */ }
      })
      .catch((reason) => {
        setSyncError(reason instanceof Error ? reason.message : 'Не удалось перенести локальный прогресс')
      })
  }, [user, cloud, migrateMutation, applyCloudState])

  useEffect(() => {
    if (!rewardNotice) return
    const timer = window.setTimeout(() => setRewardNotice(''), 4500)
    return () => window.clearTimeout(timer)
  }, [rewardNotice])

  useEffect(() => {
    if (isAuthenticated || meQuery.isLoading) return
    try {
      localStorage.setItem('schitalka-progress-v1', JSON.stringify(progress))
    } catch {
      // The trainer still works when storage is unavailable.
    }
  }, [progress, isAuthenticated, meQuery.isLoading])

  useEffect(() => {
    if (!completed) inputRef.current?.focus({ preventScroll: true })
  }, [problem, completed])

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  const recordAttempt = (correct: boolean, clean: boolean) => {
    const trackedTopicId = problem.topicId ?? topicId
    const countsForMastery = difficulty !== 'easy'
    if (isAuthenticated) {
      const topicTitle = problem.topicTitle
      cloudQueue.current = cloudQueue.current
        .catch(() => undefined)
        .then(async () => {
          const result = await attemptMutation.mutateAsync({
            attemptId: crypto.randomUUID(),
            topicId: trackedTopicId as TopicId,
            correct,
            clean,
            difficulty,
          })
          applyCloudState(result.state)
          if (result.awarded) setRewardNotice(`+1 плюсик за первый зачёт темы «${topicTitle}»`)
        })
        .catch((reason) => {
          setSyncError(reason instanceof Error ? reason.message : 'Ответ не сохранился. Проверь соединение.')
        })
      return
    }
    setProgress((previous) => {
      const oldTopic = previous.topics[trackedTopicId] ?? { solved: 0, attempts: 0, firstTry: 0 }
      const oldMasteryTopic = previous.masteryTopics[trackedTopicId] ?? { solved: 0, attempts: 0, firstTry: 0 }
      const streak = correct ? previous.streak + 1 : 0
      return {
        solved: previous.solved + (correct ? 1 : 0),
        attempts: previous.attempts + 1,
        firstTry: previous.firstTry + (clean ? 1 : 0),
        streak,
        bestStreak: Math.max(previous.bestStreak, streak),
        topics: {
          ...previous.topics,
          [trackedTopicId]: {
            solved: oldTopic.solved + (correct ? 1 : 0),
            attempts: oldTopic.attempts + 1,
            firstTry: oldTopic.firstTry + (clean ? 1 : 0),
          },
        },
        masteryTopics: countsForMastery ? {
          ...previous.masteryTopics,
          [trackedTopicId]: {
            solved: oldMasteryTopic.solved + (correct ? 1 : 0),
            attempts: oldMasteryTopic.attempts + 1,
            firstTry: oldMasteryTopic.firstTry + (clean ? 1 : 0),
          },
        } : previous.masteryTopics,
      }
    })
  }

  const checkAnswer = () => {
    if (status === 'correct' || status === 'revealed') return
    if (!answer.trim()) {
      setStatus('wrong')
      setFeedback('Сначала запиши ответ — даже если не уверен.')
      return
    }
    const clean = attemptsOnProblem === 0 && hintCount === 0
    if (answersMatch(answer, problem.answer)) {
      const trackedTopicId = problem.topicId ?? topicId
      const old = progress.masteryTopics[trackedTopicId] ?? { solved: 0, attempts: 0, firstTry: 0 }
      const nextMastery = getTopicMastery({
        solved: old.solved + 1,
        attempts: old.attempts + 1,
        firstTry: old.firstTry + (clean ? 1 : 0),
      })
      const justCompleted = difficulty !== 'easy' && nextMastery.complete && !getTopicMastery(old).complete
      setStatus('correct')
      setFeedback(
        justCompleted
          ? `Тема «${problem.topicTitle}» завершена!`
          : difficulty === 'easy'
            ? 'Верно! Для зачёта выбери уровень «Уверенно» или «Сложно».'
            : praise[Math.floor(Math.random() * praise.length)],
      )
      if (clean) setSessionCorrect((value) => value + 1)
      setResults((items) => [...items, clean ? 'clean' : 'assisted'])
      recordAttempt(true, clean)
      return
    }
    const pitfall = matchingPitfall(answer, problem.pitfalls)
    setStatus('wrong')
    setFeedback(pitfall?.message ?? 'Пока не совпадает. Проверь знаки и порядок действий, затем попробуй ещё раз.')
    setAttemptsOnProblem((value) => value + 1)
    recordAttempt(false, false)
  }

  const showHint = () => {
    setHintCount((value) => Math.min(value + 1, problem.steps.length))
    setStatus('idle')
    setFeedback('')
  }

  const revealSolution = () => {
    setHintCount(problem.steps.length)
    setStatus('revealed')
    setFeedback('Разбери каждый шаг, затем переходи к следующему заданию.')
    setResults((items) => [...items, 'assisted'])
    if (isAuthenticated) {
      breakStreakMutation.mutateAsync()
        .then(() => utils.progress.state.invalidate())
        .catch((reason) => setSyncError(reason instanceof Error ? reason.message : 'Не удалось синхронизировать серию'))
    } else {
      setProgress((previous) => ({ ...previous, streak: 0 }))
    }
  }

  const goNext = () => {
    if (currentIndex + 1 >= sessionLength) {
      setCompleted(true)
      return
    }
    setCurrentIndex((value) => value + 1)
    nextProblem()
  }

  const restart = () => setSessionKey((value) => value + 1)
  const selectGrade = (value: Grade) => {
    setGrade(value)
    setTopicId('mixed')
    setMenuOpen(false)
    if (isAuthenticated) {
      void utils.progress.state.cancel()
      cloudQueue.current = cloudQueue.current
        .catch(() => undefined)
        .then(async () => {
          const state = await gradeMutation.mutateAsync({ grade: value })
          applyCloudState(state)
        })
        .catch((reason) => setSyncError(reason instanceof Error ? reason.message : 'Класс не сохранился'))
    }
  }
  const selectTopic = (value: string) => {
    setTopicId(value)
    setView('practice')
    setMenuOpen(false)
  }
  const startPractice = (value?: string) => {
    setTopicId(value ?? 'mixed')
    setView('practice')
    setSessionKey((key) => key + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const resetProgress = () => {
    const message = isAuthenticated
      ? 'Сбросить статистику и прогресс тем? Заработанные плюсики и купленные оформления сохранятся.'
      : 'Сбросить всю локальную статистику, прогресс тем и серии? Сами задания останутся.'
    if (!window.confirm(message)) return
    if (isAuthenticated) {
      resetMutation.mutateAsync()
        .then(applyCloudState)
        .catch((reason) => setSyncError(reason instanceof Error ? reason.message : 'Не удалось сбросить прогресс'))
    } else {
      setProgress(emptyProgress)
    }
  }
  const openWorkshop = () => {
    setView('workshop')
    setWorkshopError('')
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const openCompetition = () => {
    setView('competition')
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const handlePurchase = async (themeId: string) => {
    setBusyTheme(themeId)
    setWorkshopError('')
    try {
      const state = await purchaseMutation.mutateAsync({ themeId })
      applyCloudState(state)
    } catch (reason) {
      setWorkshopError(reason instanceof Error ? reason.message : 'Не удалось открыть оформление')
    } finally {
      setBusyTheme(null)
    }
  }
  const handleSelectTheme = async (themeId: string) => {
    setBusyTheme(themeId)
    setWorkshopError('')
    try {
      const state = await selectThemeMutation.mutateAsync({ themeId })
      applyCloudState(state)
    } catch (reason) {
      setWorkshopError(reason instanceof Error ? reason.message : 'Не удалось включить оформление')
    } finally {
      setBusyTheme(null)
    }
  }
  const handleAuthenticated = () => {
    migrationStartedFor.current = null
    try { sessionStorage.removeItem('schitalka-competition-room') } catch { /* Account isolation does not depend on tab storage. */ }
    setProgress(emptyProgress)
    setPreviewTheme('classic')
    setSyncError('')
    utils.progress.state.reset()
  }
  const handleLogout = () => {
    migrationStartedFor.current = null
    try { sessionStorage.removeItem('schitalka-competition-room') } catch { /* Account isolation does not depend on tab storage. */ }
    utils.progress.state.reset()
    setProgress(loadProgress())
    setPreviewTheme('classic')
    setRewardNotice('')
    setSyncError('')
  }
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  const navigation = (
    <>
      <div className="section-switch" aria-label="Разделы сайта">
        <button type="button" className={view === 'practice' ? 'active' : ''} aria-pressed={view === 'practice'} onClick={() => { setView('practice'); setMenuOpen(false) }}>
          <Target size={16} />Тренировка
        </button>
        <button type="button" className={view === 'theory' ? 'active' : ''} aria-pressed={view === 'theory'} onClick={() => { setView('theory'); setMenuOpen(false) }}>
          <BookOpen size={16} />Теория
        </button>
        <button type="button" className={view === 'competition' ? 'active' : ''} aria-pressed={view === 'competition'} onClick={openCompetition}>
          <Swords size={16} />Арена
        </button>
        <button type="button" className={view === 'workshop' ? 'active' : ''} aria-pressed={view === 'workshop'} onClick={openWorkshop}>
          <Palette size={16} />Стиль
        </button>
      </div>
      <div className="course-mini">
        <div><span>Курс · {grade} класс</span><strong>{courseMastery.completed}/{courseMastery.total} тем</strong></div>
        <div className="course-mini-track" aria-label={`Освоено ${courseMastery.score}% курса`}><span style={{ width: `${courseMastery.score}%` }} /></div>
      </div>
      <div className="grade-label">Выбери класс</div>
      <div className="grade-grid" aria-label="Класс">
        {grades.map((item) => (
          <button type="button" key={item} className={`grade-button ${grade === item ? 'active' : ''}`} aria-pressed={grade === item} onClick={() => selectGrade(item)}>{item}</button>
        ))}
      </div>
      <div className="topic-label">Маршрут · {grade} класс</div>
      <nav className="topic-nav" aria-label={`Темы ${grade} класса`}>
        <button type="button" className={`topic-button mixed-button ${topicId === 'mixed' ? 'active' : ''}`} onClick={() => selectTopic('mixed')}>
          <Sparkles size={16} aria-hidden="true" />
          <span className="topic-copy">Смешанная</span>
          <span className="topic-count">{courseMastery.completed}/{courseMastery.total}</span>
        </button>
        {gradeTopics.map((topic) => {
          const mastery = getTopicMastery(progress.masteryTopics[topic.id])
          return (
            <button type="button" key={topic.id} className={`topic-button ${topicId === topic.id ? 'active' : ''} ${mastery.complete ? 'mastered' : ''}`} onClick={() => selectTopic(topic.id)}>
              <span className="topic-copy">
                <span>{topic.navTitle}</span>
                <span className="topic-mini-track" aria-hidden="true"><span style={{ width: `${mastery.score}%` }} /></span>
              </span>
              <span className="topic-count">{mastery.complete ? <Check size={14} strokeWidth={3} /> : `${Math.min(mastery.solved, TOPIC_TASK_GOAL)}/${TOPIC_TASK_GOAL}`}</span>
            </button>
          )
        })}
      </nav>
      <div className="sidebar-note">
        <CatMascot themeId={previewTheme} />
        <p><strong>Сначала понять,</strong><br />потом ускоряться.</p>
      </div>
    </>
  )

  return (
    <div className="app-shell" data-theme={previewTheme}>
      <aside className="sidebar desktop-sidebar">
        <Brand />
        {navigation}
        <button type="button" className="reset-link" onClick={resetProgress}><RotateCcw size={14} /> Сбросить статистику</button>
      </aside>

      <header className="mobile-header">
        <Brand />
        <div className="mobile-actions">
          <button type="button" className="menu-button" onClick={() => {
            setView(view === 'practice' ? 'theory' : 'practice')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}>
            {view === 'practice' ? <BookOpen size={19} /> : <Target size={19} />}
            <span>{view === 'practice' ? 'Теория' : 'Тренажёр'}</span>
          </button>
          <button type="button" className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Открыть темы"><Menu size={21} /><span>Темы</span></button>
        </div>
      </header>

      {menuOpen && (
        <div className="drawer-backdrop" onMouseDown={() => setMenuOpen(false)}>
          <aside className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Выбор класса и темы" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-heading"><Brand /><button type="button" className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Закрыть меню" autoFocus><X size={22} /></button></div>
            {navigation}
            <button type="button" className="reset-link" onClick={resetProgress}><RotateCcw size={14} /> Сбросить статистику</button>
          </aside>
        </div>
      )}

      <main className="main-content">
        <div className="topline">
          <div className="breadcrumbs"><span>{grade} класс</span><ChevronRight size={14} /><span>{view === 'theory' ? 'Теория и формулы' : view === 'workshop' ? 'Мастерская' : view === 'competition' ? 'Сетевая арена' : activeTopic?.navTitle ?? 'Смешанная'}</span></div>
          <div className="streak"><Target size={17} /><span>Серия</span><strong>{progress.streak}</strong></div>
        </div>

        <RewardBar
          themeId={previewTheme}
          plusBalance={plusBalance}
          sparkBalance={sparkBalance}
          trophies={trophies}
          authenticated={isAuthenticated}
          syncLabel={syncLabel}
          onWorkshop={openWorkshop}
          onCompetition={openCompetition}
          onAccount={() => setAccountOpen(true)}
        />

        {view === 'competition' ? (
          <CompetitionPage
            key={user?.id ?? 'guest'}
            authenticated={isAuthenticated}
            currentUserId={user?.id ?? null}
            isAdmin={user?.role === 'admin'}
            grade={grade}
            sparkBalance={sparkBalance}
            trophies={trophies}
            sparkEvents={sparkEvents}
            onLogin={() => setAccountOpen(true)}
          />
        ) : view === 'workshop' ? (
          <Workshop
            selectedTheme={isAuthenticated ? cloud?.selectedTheme ?? 'classic' : 'classic'}
            previewTheme={previewTheme}
            plusBalance={plusBalance}
            sparkBalance={sparkBalance}
            purchasedThemeIds={purchasedThemeIds}
            authenticated={isAuthenticated}
            busyTheme={busyTheme}
            error={workshopError}
            onPreview={setPreviewTheme}
            onPurchase={handlePurchase}
            onSelect={handleSelectTheme}
            onResetPreview={() => setPreviewTheme(isAuthenticated ? cloud?.selectedTheme ?? 'classic' : 'classic')}
            onLogin={() => setAccountOpen(true)}
          />
        ) : view === 'theory' ? (
          <TheoryPage grade={grade} onGradeChange={selectGrade} onPractice={startPractice} />
        ) : (
          <>
        <section className="topic-heading">
          <div>
            <div className="eyebrow">Учебный маршрут · {grade} класс</div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="topic-rule"><BookOpen size={17} /><span>{rule}</span></div>
        </section>

        <section className={`mastery-panel ${masteryComplete ? 'complete' : ''}`} aria-label={activeTopic ? 'Прогресс темы' : 'Прогресс курса'}>
          <div className="mastery-main">
            <div className="mastery-label"><Flag size={17} />{activeTopic ? 'До завершения темы' : 'До завершения курса'}</div>
            {masteryComplete ? (
              <div className="mastery-number"><strong>Готово!</strong><span>{activeTopic ? 'Тема освоена' : 'Все темы курса освоены'}</span></div>
            ) : (
              <div className="mastery-number"><strong>{remaining}</strong><span>{taskWord(remaining)} минимум</span></div>
            )}
            <p>{masteryComplete
              ? 'Можно закрепить результат или перейти к следующей теме.'
              : difficulty === 'easy'
                ? 'Разминка не засчитывается. Для зачёта выбери «Уверенно» или «Сложно».'
                : 'Если дальше решать с первой попытки и без подсказок.'}</p>
          </div>
          <div className="mastery-criteria">
            {activeTopic ? (
              <>
                <div><span>Решено</span><strong>{Math.min(topicMastery.solved, TOPIC_TASK_GOAL)} / {TOPIC_TASK_GOAL}</strong></div>
                <div><span>С первого раза</span><strong>{topicMastery.accuracy}% / {TOPIC_ACCURACY_GOAL}%</strong></div>
              </>
            ) : (
              <>
                <div><span>Темы с зачётом</span><strong>{courseMastery.completed} / {courseMastery.total}</strong></div>
                <div><span>Решено по курсу</span><strong>{courseMastery.solved} / {courseMastery.goal}</strong></div>
                <div><span>С первого раза</span><strong>{courseMastery.accuracy}% / {TOPIC_ACCURACY_GOAL}%</strong></div>
              </>
            )}
          </div>
          <div className="mastery-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={currentMastery.score}><span style={{ width: `${currentMastery.score}%` }} /></div>
        </section>

        <div className="training-settings">
          <div className="difficulty-switch" aria-label="Сложность">
            {difficultyLabels.map((item) => <button type="button" key={item.id} className={difficulty === item.id ? 'active' : ''} aria-pressed={difficulty === item.id} onClick={() => setDifficulty(item.id)}>{item.label}</button>)}
          </div>
          <label className="length-select">Заданий
            <select value={sessionLength} onChange={(event) => { setSessionLength(Number(event.target.value)); setSessionKey((value) => value + 1) }}>
              <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
            </select>
          </label>
        </div>

        <div className="metric-strip" aria-label="Общая статистика">
          <div><span>Всего решено</span><strong>{progress.solved}</strong></div>
          <div><span>С первого раза</span><strong>{accuracy}%</strong></div>
          <div><span>Лучшая серия</span><strong>{progress.bestStreak}</strong></div>
        </div>

        <div className="workspace">
          <section className={`practice-card ${status === 'correct' ? 'is-correct' : ''}`} aria-label="Тренировочное задание">
            {!completed ? (
              <>
                <div className="exercise-topline"><span>Задание {currentIndex + 1} из {sessionLength}</span><span className="exercise-timer"><Clock3 size={15} />{formatTime(elapsed)}</span></div>
                <div className="session-progress" aria-hidden="true"><span style={{ width: `${(currentIndex / sessionLength) * 100}%` }} /></div>
                <div className="exercise-body">
                  <div className="instruction-row">
                    <div className="instruction">{problem.instruction ?? 'Вычисли'}</div>
                    {!activeTopic && <div className="problem-topic">{problem.topicTitle}</div>}
                  </div>
                  <div className={`expression ${problem.expression.length > 70 ? 'long' : ''}`}><MathText text={problem.expression} /></div>
                  <div className="answer-area">
                    <label htmlFor="answer">Твой ответ</label>
                    <div className={`answer-row ${status}`}>
                      <input
                        ref={inputRef}
                        id="answer"
                        value={answer}
                        onChange={(event) => {
                          setAnswer(event.target.value)
                          if (status === 'wrong') { setStatus('idle'); setFeedback('') }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            if (status === 'correct' || status === 'revealed') goNext()
                            else checkAnswer()
                          }
                        }}
                        placeholder={Array.isArray(problem.answer) ? '−3; 3' : 'Например: 3/4 или −2,5'}
                        inputMode="text"
                        autoComplete="off"
                        disabled={status === 'correct' || status === 'revealed'}
                        aria-describedby="answer-hint feedback"
                      />
                      {(status === 'correct' || status === 'revealed') ? (
                        <button type="button" className="primary-button next-button" onClick={goNext}>{currentIndex + 1 === sessionLength ? 'Итоги' : 'Дальше'}<ArrowRight size={19} /></button>
                      ) : (
                        <button type="button" className="primary-button" onClick={checkAnswer}>Проверить<Check size={19} /></button>
                      )}
                    </div>
                    <div id="answer-hint" className="answer-hint">{problem.answerHint ?? 'Десятичную запятую можно писать как , или .'}</div>
                  </div>

                  <div className="exercise-actions">
                    <button type="button" className="hint-button" onClick={showHint} disabled={hintCount >= problem.steps.length || status === 'correct' || status === 'revealed'}><Lightbulb size={18} />{hintCount === 0 ? 'Подсказка' : 'Ещё шаг'}</button>
                    {attemptsOnProblem >= 1 && status !== 'correct' && status !== 'revealed' && <button type="button" className="solution-link" onClick={revealSolution}><CircleHelp size={17} />Показать решение</button>}
                  </div>

                  {hintCount > 0 && (
                    <div className="solution-steps" aria-label="Шаги решения">
                      <div className="solution-title">Разбираем по шагам</div>
                      {problem.steps.slice(0, hintCount).map((step, index) => <div className="solution-step" key={`${index}-${step}`}><span>{index + 1}</span><p><MathText text={step} /></p></div>)}
                    </div>
                  )}

                  {feedback && (
                    <div id="feedback" className={`feedback ${status}`} role="status" aria-live="polite">
                      {status === 'correct' ? <CheckCircle2 size={23} /> : status === 'wrong' ? <XCircle size={23} /> : <BookOpen size={23} />}
                      <div><strong>{status === 'revealed' ? <>Ответ: <MathText text={problem.displayAnswer} /></> : status === 'wrong' ? 'Нужна ещё попытка' : feedback}</strong>{status === 'correct' && <span>Ответ: <MathText text={problem.displayAnswer} /></span>}{status === 'wrong' && <span>{feedback}</span>}</div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="session-summary">
                <div className="summary-mascot"><CatMascot themeId={previewTheme} happy /></div>
                <div className="summary-kicker">Серия завершена</div>
                <h2>{sessionCorrect === sessionLength ? 'Чистая работа!' : sessionCorrect >= sessionLength * 0.7 ? 'Уверенный результат!' : 'Хорошая тренировка!'}</h2>
                <p>{sessionCorrect === sessionLength ? 'Каждое задание решено самостоятельно и с первой попытки.' : 'Ошибки — это подсказки, что повторить в следующий раз.'}</p>
                <div className="summary-score"><strong>{sessionCorrect}</strong><span>из {sessionLength}<br />с первого раза</span></div>
                <div className="summary-details"><span><Clock3 size={17} />{formatTime(elapsed)}</span><span><Trophy size={17} />Серия: {progress.streak}</span></div>
                <button type="button" className="primary-button summary-button" onClick={restart}><RotateCcw size={18} />Ещё {sessionLength} заданий</button>
              </div>
            )}
          </section>

          <aside className="practice-rail">
            <section className="rail-section mastery-guide">
              <h2>Как получить зачёт</h2>
              <div><strong>{TOPIC_TASK_GOAL}</strong><span>решённых заданий<br />в каждой теме</span></div>
              <div><strong>{TOPIC_ACCURACY_GOAL}%</strong><span>ответов с первого раза<br />и без подсказок</span></div>
              <p>Зачёт идёт только на уровнях «Уверенно» и «Сложно». В смешанной тренировке ответ засчитывается в тему задания.</p>
            </section>
            <section className="rail-section session-plan">
              <div className="rail-heading"><h2>Эта серия</h2><span>{results.length}/{sessionLength}</span></div>
              <div className="session-dots" aria-label={`Выполнено ${results.length} из ${sessionLength}`}>
                {Array.from({ length: sessionLength }, (_, index) => <span key={index} className={`${results[index] ?? ''} ${index === currentIndex && !completed ? 'current' : ''}`} />)}
              </div>
              <p><span className="clean-dot" /> Самостоятельно <span className="assisted-dot" /> С подсказкой</p>
            </section>
            <section className="rail-section order-guide">
              <h2>Порядок действий</h2>
              <ol>
                <li><span>1</span><p>Скобки</p></li>
                <li><span>2</span><p>Корни и степени</p></li>
                <li><span>3</span><p>Умножение и деление<small>слева направо</small></p></li>
                <li><span>4</span><p>Сложение и вычитание<small>слева направо</small></p></li>
              </ol>
            </section>
          </aside>
        </div>
          </>
        )}

        <footer className="app-footer"><span>{isAuthenticated ? 'Прогресс, плюсики, искры, кубки и оформления сохраняются в аккаунте.' : 'Без аккаунта прогресс сохраняется только в этом браузере. Для арены нужен вход.'}</span><span>48 тренировок · 18 уроков · сетевая арена · 4–9 классы</span></footer>
      </main>
      {rewardNotice && <div className="reward-toast" role="status"><Plus size={18} strokeWidth={3} />{rewardNotice}</div>}
      {syncError && <div className="sync-error" role="alert"><span>{syncError}</span><button type="button" onClick={() => utils.progress.state.invalidate()}>Проверить снова</button></div>}
      <AccountDialog
        open={accountOpen}
        user={user}
        grade={grade}
        onClose={() => setAccountOpen(false)}
        onAuthenticated={handleAuthenticated}
        onLogout={handleLogout}
      />
    </div>
  )
}
