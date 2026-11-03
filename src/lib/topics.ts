import { topicsFourToSix } from './generators-4-6'
import { topicsSevenToNine } from './generators-7-9'
import { extraTopics } from './generators-extra'
import { pick } from './math'
import type { Difficulty, Grade, Problem, Topic } from './math'

const gradeOrder = (a: Topic, b: Topic) => a.grade - b.grade

export const allTopics: Topic[] = [...topicsFourToSix, ...topicsSevenToNine, ...extraTopics].sort(gradeOrder)

export const topicsForGrade = (grade: Grade) => allTopics.filter((topic) => topic.grade === grade)

export const createProblem = (grade: Grade, topicId: string, difficulty: Difficulty, excludeTopicId?: string): Problem => {
  const candidates = topicsForGrade(grade)
  let topic: Topic | undefined
  if (topicId === 'mixed') {
    const varied = candidates.filter((item) => item.id !== excludeTopicId)
    topic = pick(varied.length ? varied : candidates)
  } else {
    topic = candidates.find((item) => item.id === topicId)
  }
  const selected = topic ?? pick(candidates)
  return {
    ...selected.generate(difficulty),
    topicId: selected.id,
    topicTitle: selected.title,
  }
}
