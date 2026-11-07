import { isMasteryComplete } from '@contracts/learning'

export const TOPIC_TASK_GOAL = 20
export const TOPIC_ACCURACY_GOAL = 80

export interface MasteryProgress {
  solved: number
  attempts: number
  firstTry: number
}

export const emptyMasteryProgress: MasteryProgress = { solved: 0, attempts: 0, firstTry: 0 }

export function getTopicMastery(progress: MasteryProgress = emptyMasteryProgress) {
  const { solved, attempts, firstTry } = progress
  const accuracy = attempts ? Math.floor(firstTry / attempts * 100) : 0
  const taskRemaining = Math.max(0, TOPIC_TASK_GOAL - solved)
  const accuracyRemaining = accuracy >= TOPIC_ACCURACY_GOAL
    ? 0
    : Math.max(0, Math.ceil((TOPIC_ACCURACY_GOAL / 100 * attempts - firstTry) / (1 - TOPIC_ACCURACY_GOAL / 100) - 1e-9))
  const complete = isMasteryComplete({ solved, attempts, firstTry })
  const score = Math.round(complete ? 100 : Math.min(solved / TOPIC_TASK_GOAL, 1) * 70 + Math.min(accuracy / TOPIC_ACCURACY_GOAL, 1) * 30)
  return {
    solved,
    attempts,
    firstTry,
    accuracy,
    taskRemaining,
    accuracyRemaining,
    remaining: complete ? 0 : Math.max(taskRemaining, accuracyRemaining),
    complete,
    score,
  }
}

export function getCourseMastery(topics: { id: string }[], progress: Record<string, MasteryProgress>) {
  const masteries = topics.map((topic) => getTopicMastery(progress[topic.id]))
  const completed = masteries.filter((mastery) => mastery.complete).length
  const remaining = masteries.reduce((sum, mastery) => sum + mastery.remaining, 0)
  const solved = masteries.reduce((sum, mastery) => sum + mastery.solved, 0)
  const attempts = masteries.reduce((sum, mastery) => sum + mastery.attempts, 0)
  const firstTry = masteries.reduce((sum, mastery) => sum + mastery.firstTry, 0)
  const score = topics.length ? Math.round(masteries.reduce((sum, mastery) => sum + mastery.score, 0) / topics.length) : 0
  return {
    completed,
    total: topics.length,
    remaining,
    solved,
    attempts,
    firstTry,
    accuracy: attempts ? Math.round(firstTry / attempts * 100) : 0,
    score,
    goal: topics.length * TOPIC_TASK_GOAL,
    complete: topics.length > 0 && completed === topics.length,
  }
}
