import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, ChevronRight, CircleHelp, Lightbulb } from 'lucide-react'
import type { Grade } from '../lib/math'
import { theoryForGrade } from '../lib/theory'
import { MathText } from './MathText'

const grades: Grade[] = [4, 5, 6, 7, 8, 9]

function MathLines({ text }: { text: string }) {
  return text.split('\n').map((line, index) => (
    <div className="math-line" key={`${index}-${line}`}><MathText text={line} /></div>
  ))
}

interface TheoryPageProps {
  grade: Grade
  onGradeChange: (grade: Grade) => void
  onPractice: (topicId?: string) => void
}

export function TheoryPage({ grade, onGradeChange, onPractice }: TheoryPageProps) {
  const lessons = useMemo(() => theoryForGrade(grade), [grade])
  const [selectedId, setSelectedId] = useState(lessons[0].id)
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedId) ?? lessons[0]
  const selectedIndex = lessons.findIndex((lesson) => lesson.id === selectedLesson.id)

  const selectGrade = (value: Grade) => {
    onGradeChange(value)
    setSelectedId(theoryForGrade(value)[0].id)
  }

  return (
    <div className="theory-page">
      <section className="topic-heading theory-heading">
        <div>
          <div className="eyebrow">Справочник · {grade} класс</div>
          <h1>Теория и формулы</h1>
          <p>Короткие объяснения без лишних терминов: правило, порядок действий и примеры, которые можно сразу закрепить практикой.</p>
        </div>
        <div className="topic-rule"><BookOpen size={17} /><span>18 уроков · 4–9 классы</span></div>
      </section>

      <div className="theory-grade-row">
        <span>Учебный год</span>
        <div className="theory-grades" aria-label="Класс для теории">
          {grades.map((item) => (
            <button
              type="button"
              key={item}
              className={grade === item ? 'active' : ''}
              aria-pressed={grade === item}
              onClick={() => selectGrade(item)}
            >
              {item} класс
            </button>
          ))}
        </div>
      </div>

      <div className="theory-layout">
        <aside className="theory-index" aria-label={`Уроки для ${grade} класса`}>
          <div className="theory-index-heading">
            <span>Разделы</span>
            <strong>{lessons.length} урока</strong>
          </div>
          {lessons.map((lesson, index) => (
            <button
              type="button"
              key={lesson.id}
              className={selectedLesson.id === lesson.id ? 'active' : ''}
              aria-pressed={selectedLesson.id === lesson.id}
              onClick={() => setSelectedId(lesson.id)}
            >
              <span className="theory-index-number">{String(index + 1).padStart(2, '0')}</span>
              <span>{lesson.title}</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          ))}
          <div className="theory-index-note">
            <Lightbulb size={18} aria-hidden="true" />
            <p>Сначала разбери пример, затем проверь себя в тренажёре.</p>
          </div>
        </aside>

        <article className="lesson" aria-labelledby="lesson-title">
          <header className="lesson-header">
            <div className="lesson-kicker">Урок {selectedIndex + 1} · {grade} класс</div>
            <h2 id="lesson-title">{selectedLesson.title}</h2>
            <p>{selectedLesson.summary}</p>
          </header>

          <section className="lesson-rule" aria-label="Главное правило">
            <span>Главное правило</span>
            <div className="lesson-formula"><MathLines text={selectedLesson.rule} /></div>
          </section>

          <section className="lesson-section lesson-steps">
            <h3>Как рассуждать</h3>
            <ol>
              {selectedLesson.steps.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="lesson-section lesson-examples">
            <h3>Разберём примеры</h3>
            {selectedLesson.examples.map((example, index) => (
              <div className="lesson-example" key={example.expression}>
                <div className="lesson-example-label">Пример {index + 1}</div>
                <div className="lesson-example-math"><MathLines text={example.expression} /></div>
                <p>{example.explanation}</p>
              </div>
            ))}
          </section>

          <aside className="lesson-mistake">
            <CircleHelp size={23} aria-hidden="true" />
            <div>
              <strong>Частая ошибка</strong>
              <p>{selectedLesson.mistake}</p>
            </div>
          </aside>

          <footer className="lesson-footer">
            <div>
              <strong>Пора закрепить правило</strong>
              <span>Подходящие задания уже выбраны.</span>
            </div>
            <button type="button" className="primary-button" onClick={() => onPractice(selectedLesson.relatedTopicId)}>
              Тренировать тему<ArrowRight size={18} />
            </button>
          </footer>
        </article>
      </div>
    </div>
  )
}
