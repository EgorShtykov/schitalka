import { topicsFourToSix } from './generators-4-6'
import { topicsSevenToNine } from './generators-7-9'
import { pick } from './math'
import type { Difficulty, Grade, Problem, Topic } from './math'

export const allTopics: Topic[] = [...topicsFourToSix, ...topicsSevenToNine]

export const topicsForGrade = (grade: Grade) => allTopics.filter((topic) => topic.grade === grade)

export const createProblem = (grade: Grade, topicId: string, difficulty: Difficulty): Problem => {
  const candidates = topicsForGrade(grade)
  const topic = topicId === 'mixed' ? pick(candidates) : candidates.find((item) => item.id === topicId)
  if (!topic) return pick(candidates).generate(difficulty)
  return topic.generate(difficulty)
}
