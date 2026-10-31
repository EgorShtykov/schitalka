export type Grade = 4 | 5 | 6 | 7 | 8 | 9
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Pitfall {
  answer: number | number[]
  message: string
}

export interface Problem {
  expression: string
  answer: number | number[]
  displayAnswer: string
  steps: string[]
  rule: string
  instruction?: string
  answerHint?: string
  pitfalls?: Pitfall[]
}

export interface Topic {
  id: string
  grade: Grade
  title: string
  navTitle: string
  description: string
  rule: string
  generate: (difficulty: Difficulty) => Problem
}

export const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

export const pick = <T,>(items: T[]): T => items[randInt(0, items.length - 1)]

export const chance = (probability = 0.5) => Math.random() < probability

export const gcd = (a: number, b: number): number => {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) [a, b] = [b, a % b]
  return a || 1
}

export const round = (value: number, digits = 6) => {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export const fmt = (value: number, digits = 6) => {
  const normalized = round(value, digits)
  if (Object.is(normalized, -0)) return '0'
  return String(normalized).replace('.', ',')
}

export const fraction = (numerator: number, denominator: number) => {
  const divisor = gcd(numerator, denominator)
  const sign = denominator < 0 ? -1 : 1
  const n = (numerator / divisor) * sign
  const d = Math.abs(denominator / divisor)
  return d === 1 ? fmt(n) : `${fmt(n)}/${fmt(d)}`
}

export const signed = (value: number) => (value < 0 ? `−${fmt(Math.abs(value))}` : fmt(value))

export const parenthesize = (value: number) => (value < 0 ? `(${signed(value)})` : signed(value))

export const sup = (power: number) => {
  const chars: Record<string, string> = {
    '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  }
  return String(power).split('').map((char) => chars[char] ?? char).join('')
}

export const problem = (
  expression: string,
  answer: number | number[],
  steps: string[],
  rule: string,
  extras: Partial<Problem> = {},
): Problem => ({
  expression,
  answer,
  displayAnswer: Array.isArray(answer) ? answer.map((n) => fmt(n)).join('; ') : fmt(answer),
  steps,
  rule,
  ...extras,
})

export const parseNumber = (raw: string): number | null => {
  let value = raw.trim().replace(/−/g, '-').replace(/\s+/g, ' ')
  if (!value) return null

  const mixed = value.match(/^([+-]?\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) {
    const whole = Number(mixed[1])
    const numerator = Number(mixed[2])
    const denominator = Number(mixed[3])
    if (!denominator) return null
    return whole + Math.sign(whole || 1) * numerator / denominator
  }

  const radical = value.replace(/\s/g, '').match(/^([+-]?)(?:√\(?(\d+(?:[.,]\d+)?)\)?|sqrt\((\d+(?:[.,]\d+)?)\))(?:\/(\d+(?:[.,]\d+)?))?$/i)
  if (radical) {
    const radicand = Number((radical[2] ?? radical[3]).replace(',', '.'))
    const denominator = radical[4] ? Number(radical[4].replace(',', '.')) : 1
    if (!denominator) return null
    return (radical[1] === '-' ? -1 : 1) * Math.sqrt(radicand) / denominator
  }

  const simpleFraction = value.match(/^([+-]?\d+(?:[.,]\d+)?)\/([+-]?\d+(?:[.,]\d+)?)$/)
  if (simpleFraction) {
    const numerator = Number(simpleFraction[1].replace(',', '.'))
    const denominator = Number(simpleFraction[2].replace(',', '.'))
    if (!denominator) return null
    return numerator / denominator
  }

  value = value.replace(/\s/g, '').replace(',', '.')
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const closeEnough = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b))

export const answersMatch = (input: string, expected: number | number[]) => {
  if (Array.isArray(expected)) {
    const parts = input.split(/[;\n]+/).map((part) => parseNumber(part))
    if (parts.some((part) => part === null) || parts.length !== expected.length) return false
    const actual = parts as number[]
    return expected.every((value) => actual.some((candidate) => closeEnough(candidate, value))) &&
      new Set(actual.map((value) => round(value, 6))).size === actual.length
  }
  const actual = parseNumber(input)
  return actual !== null && closeEnough(actual, expected)
}

export const matchingPitfall = (input: string, pitfalls: Pitfall[] = []) =>
  pitfalls.find((pitfall) => answersMatch(input, pitfall.answer))
