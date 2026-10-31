import { chance, fmt, fraction, gcd, parenthesize, pick, problem, randInt, round, signed } from './math'
import type { Difficulty, Problem, Topic } from './math'

const level = (difficulty: Difficulty) => difficulty === 'easy' ? 0 : difficulty === 'medium' ? 1 : 2

const mixedDisplay = (value: number) => {
  const sign = value < 0 ? '−' : ''
  const absolute = Math.abs(value)
  const whole = Math.floor(absolute)
  const remainder = round(absolute - whole)
  if (remainder === 0) return `${sign}${whole}`
  if (Math.abs(remainder - 1) < 1e-7) return `${sign}${whole + 1}`
  for (let denominator = 2; denominator <= 100; denominator++) {
    const numerator = Math.round(remainder * denominator)
    if (Math.abs(remainder - numerator / denominator) < 1e-7) {
      return whole ? `${sign}${whole} ${fraction(numerator, denominator)}` : `${sign}${fraction(numerator, denominator)}`
    }
  }
  return fmt(value)
}

export const naturalNumbers = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const max = [9999, 999999, 9999999][l]
  const a = randInt(Math.floor(max / 10), max)
  const b = randInt(Math.floor(max / 20), Math.floor(max / 2))
  const adding = chance()
  if (adding) return problem(`${fmt(a)} + ${fmt(b)}`, a + b, [`Складываем по разрядам: ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}.`], 'При сложении и вычитании выравнивай числа по разрядам. Начинай с единиц.')
  const high = Math.max(a, b)
  const low = Math.min(a, b)
  return problem(`${fmt(high)} − ${fmt(low)}`, high - low, [`Вычитаем по разрядам: ${fmt(high)} − ${fmt(low)} = ${fmt(high - low)}.`], 'При сложении и вычитании выравнивай числа по разрядам. Начинай с единиц.')
}

export const multiplication = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const a = randInt([12, 112, 1012][l], [99, 999, 9999][l])
  const b = l === 0 ? randInt(3, 9) : randInt(12, 99)
  const units = b % 10
  const tens = b - units
  const steps = l === 0
    ? [`${fmt(a)} × ${fmt(b)} = ${fmt(a * b)}.`]
    : [`Разложи ${b} на ${tens} + ${units}.`, `${fmt(a)} × ${tens} + ${fmt(a)} × ${units} = ${fmt(a * tens)} + ${fmt(a * units)} = ${fmt(a * b)}.`]
  return problem(`${fmt(a)} × ${fmt(b)}`, a * b, steps, 'Умножай по разрядам, не забывая переносить десятки. Проверь результат прикидкой.')
}

export const division = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const divisor = l === 0 ? randInt(3, 9) : randInt(12, 49)
  const quotient = randInt([12, 12, 102][l], [99, 89, 499][l])
  const dividend = divisor * quotient
  return problem(`${fmt(dividend)} : ${fmt(divisor)}`, quotient, [`Подбери неполное делимое и дели поэтапно.`, `Проверка: ${fmt(divisor)} × ${fmt(quotient)} = ${fmt(dividend)}.`], 'После деления обязательно проверь ответ умножением: делитель × частное = делимое.')
}

export const orderFour = (difficulty: Difficulty) => {
  const l = level(difficulty)
  if (l === 0) {
    const a = randInt(5, 40), b = randInt(3, 12), c = randInt(3, 9)
    return problem(`${a} + ${b} × ${c}`, a + b * c, [`1) Умножение: ${b} × ${c} = ${b * c}.`, `2) Сложение: ${a} + ${b * c} = ${a + b * c}.`], 'Сначала умножение и деление слева направо, затем сложение и вычитание.', {
      pitfalls: [{ answer: (a + b) * c, message: 'Ты начал со сложения. Умножение выполняется раньше.' }],
    })
  }
  if (l === 1) {
    const a = randInt(3, 15), b = randInt(4, 16), c = randInt(3, 9), d = randInt(5, 30)
    return problem(`(${a} + ${b}) × ${c} − ${d}`, (a + b) * c - d, [`1) Скобки: ${a} + ${b} = ${a + b}.`, `2) Умножение: ${a + b} × ${c} = ${(a + b) * c}.`, `3) Вычитание: ${(a + b) * c} − ${d} = ${(a + b) * c - d}.`], 'Сначала скобки, затем умножение и деление, после них — сложение и вычитание.', {
      pitfalls: [{ answer: a + b * c - d, message: 'Скобки потеряны: сначала нужно сложить числа внутри них.' }],
    })
  }
  const divisor = randInt(2, 9), b = randInt(10, 25), c = b - divisor
  const a = divisor * randInt(3, 12), d = randInt(3, 9), e = randInt(4, 12)
  return problem(`${a} : (${b} − ${c}) + ${d} × ${e}`, a / divisor + d * e, [`1) Скобки: ${b} − ${c} = ${divisor}.`, `2) Деление и умножение: ${a} : ${divisor} = ${a / divisor}; ${d} × ${e} = ${d * e}.`, `3) Сложение: ${a / divisor} + ${d * e} = ${a / divisor + d * e}.`], 'Скобки → умножение и деление слева направо → сложение и вычитание.', {
    pitfalls: [{ answer: a / divisor + d * e - 2 * d * e, message: 'Проверь: умножение выполняется до сложения.' }],
  })
}

export const units = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const easy = pick([
    { value: randInt(2, 30), from: 'см', factor: 10, to: 'мм' },
    { value: randInt(2, 25), from: 'м', factor: 100, to: 'см' },
    { value: randInt(2, 20), from: 'кг', factor: 1000, to: 'г' },
    { value: randInt(2, 12), from: 'км', factor: 1000, to: 'м' },
  ])
  if (l === 0) return problem(`${easy.value} ${easy.from} = ? ${easy.to}`, easy.value * easy.factor, [`1 ${easy.from} = ${easy.factor} ${easy.to}.`, `${easy.value} × ${easy.factor} = ${easy.value * easy.factor}.`], 'При переходе к более мелким единицам умножай на коэффициент перевода.', { answerHint: `Ответ в ${easy.to}` })
  if (l === 1) {
    const meters = randInt(2, 15), centimeters = randInt(5, 95)
    return problem(`${meters} м ${centimeters} см = ? см`, meters * 100 + centimeters, [`${meters} м = ${meters * 100} см.`, `${meters * 100} + ${centimeters} = ${meters * 100 + centimeters} см.`], 'Переведи все части в одну единицу, затем сложи.', { answerHint: 'Ответ в сантиметрах' })
  }
  const hours = randInt(1, 5), minutes = pick([10, 15, 20, 30, 45, 50])
  return problem(`${hours} ч ${minutes} мин = ? мин`, hours * 60 + minutes, [`${hours} ч = ${hours * 60} мин.`, `${hours * 60} + ${minutes} = ${hours * 60 + minutes} мин.`], 'В одном часе 60 минут, а не 100. Переведи часы и сложи.', { answerHint: 'Ответ в минутах', pitfalls: [{ answer: hours * 100 + minutes, message: 'В одном часе 60 минут, не 100.' }] })
}

export const equationsFour = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const kind = pick(l === 0 ? ['add', 'subtract'] : l === 1 ? ['add', 'multiply', 'divide'] : ['multiply', 'divide', 'subtract'])
  if (kind === 'add') {
    const x = randInt(12, 150), a = randInt(8, 99)
    return problem(`x + ${a} = ${x + a}`, x, [`Чтобы найти слагаемое, вычти: x = ${x + a} − ${a}.`, `x = ${x}.`], 'Неизвестное слагаемое = сумма − известное слагаемое.', { instruction: 'Найди x' })
  }
  if (kind === 'multiply') {
    const x = randInt(4, 30), a = randInt(3, 15)
    return problem(`${a} · x = ${a * x}`, x, [`Чтобы найти множитель, раздели: x = ${a * x} : ${a}.`, `x = ${x}.`], 'Неизвестный множитель = произведение : известный множитель.', { instruction: 'Найди x' })
  }
  if (kind === 'divide') {
    const x = randInt(4, 25), divisor = randInt(3, 12)
    return problem(`x : ${divisor} = ${x}`, x * divisor, [`x = ${x} × ${divisor}.`, `x = ${x * divisor}.`], 'Делимое = частное × делитель.', { instruction: 'Найди x' })
  }
  const x = randInt(10, 90), subtrahend = randInt(5, 45)
  return problem(`${x + subtrahend} − x = ${subtrahend}`, x, [`x = ${x + subtrahend} − ${subtrahend}.`, `x = ${x}.`], 'Вычитаемое = уменьшаемое − разность.', { instruction: 'Найди x' })
}

export const decimalAdd = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const scale = [10, 100, 100][l]
  const a = randInt(12, 350) / scale, b = randInt(8, 240) / scale
  if (l === 2) {
    const c = randInt(5, 150) / 100
    const answer = round(a + b - c)
    return problem(`${fmt(a)} + ${fmt(b)} − ${fmt(c)}`, answer, [`1) ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}.`, `2) ${fmt(a + b)} − ${fmt(c)} = ${fmt(answer)}.`], 'Складывай и вычитай десятичные дроби по разрядам, запятая под запятой. Равные действия выполняй слева направо.')
  }
  const adding = chance()
  const high = Math.max(a, b), low = Math.min(a, b)
  return adding
    ? problem(`${fmt(a)} + ${fmt(b)}`, round(a + b), [`Запятая под запятой: ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}.`], 'Складывай десятичные дроби по разрядам, запятая под запятой.')
    : problem(`${fmt(high)} − ${fmt(low)}`, round(high - low), [`Запятая под запятой: ${fmt(high)} − ${fmt(low)} = ${fmt(high - low)}.`], 'Вычитай десятичные дроби по разрядам. При необходимости дописывай нули.')
}

export const decimalMultiply = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const dividing = l > 0 && chance()
  if (dividing) {
    const divisor = l === 1 ? randInt(2, 9) : randInt(12, 35) / 10
    const quotient = randInt(12, 85) / 10
    const dividend = round(divisor * quotient)
    return problem(`${fmt(dividend)} : ${fmt(divisor)}`, quotient, [Number.isInteger(divisor) ? `Дели как обычно, следя за положением запятой.` : `Умножь делимое и делитель на 10, чтобы делитель стал целым.`, `Проверка: ${fmt(divisor)} × ${fmt(quotient)} = ${fmt(dividend)}.`], 'При делении на десятичную дробь перенеси запятую в делимом и делителе на одинаковое число знаков.')
  }
  const a = randInt(12, 95) / (l === 0 ? 10 : 100)
  const b = l === 0 ? randInt(3, 9) : randInt(12, 65) / 10
  const answer = round(a * b)
  return problem(`${fmt(a)} × ${fmt(b)}`, answer, [`Выполни умножение, не обращая внимания на запятые.`, `В множителях всего ${String(a).split('.')[1]?.length ?? 0} + ${String(b).split('.')[1]?.length ?? 0} знаков после запятой. Ответ: ${fmt(answer)}.`], 'В произведении после запятой должно быть столько знаков, сколько в обоих множителях вместе.')
}

export const fractionsFive = (difficulty: Difficulty) => {
  const l = level(difficulty)
  let d1 = l === 0 ? pick([4, 5, 6, 8, 10]) : pick([3, 4, 5, 6, 8, 9, 12])
  let d2 = l === 0 ? d1 : pick([2, 3, 4, 5, 6, 8, 10, 12])
  const n1 = randInt(1, d1 - 1), n2 = randInt(1, d2 - 1)
  const subtract = chance() && n1 / d1 > n2 / d2
  const numerator = subtract ? n1 * d2 - n2 * d1 : n1 * d2 + n2 * d1
  const denominator = d1 * d2
  const common = d1 * d2 / gcd(d1, d2)
  const answer = numerator / denominator
  return problem(`${n1}/${d1} ${subtract ? '−' : '+'} ${n2}/${d2}`, answer, [`Общий знаменатель: ${common}.`, `${n1 * (common / d1)}/${common} ${subtract ? '−' : '+'} ${n2 * (common / d2)}/${common} = ${fraction(numerator, denominator)}.`], 'Складывать и вычитать можно только дроби с одинаковыми знаменателями. Сократи результат, если возможно.', { displayAnswer: fraction(numerator, denominator), answerHint: 'Можно ввести дробь, например 5/6' })
}

export const mixedNumbers = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const d = pick(l === 0 ? [2, 4, 5] : [3, 4, 5, 6, 8])
  const w1 = randInt(1, l + 3), w2 = randInt(1, l + 2)
  const n1 = randInt(1, d - 1), n2 = randInt(1, d - 1)
  const a = w1 + n1 / d, b = w2 + n2 / d
  const subtract = chance() && a > b
  const answer = subtract ? a - b : a + b
  const totalN1 = w1 * d + n1, totalN2 = w2 * d + n2
  const resultN = subtract ? totalN1 - totalN2 : totalN1 + totalN2
  return problem(`${w1} ${n1}/${d} ${subtract ? '−' : '+'} ${w2} ${n2}/${d}`, answer, [`Переведи в неправильные дроби: ${totalN1}/${d} и ${totalN2}/${d}.`, `${totalN1}/${d} ${subtract ? '−' : '+'} ${totalN2}/${d} = ${fraction(resultN, d)} = ${mixedDisplay(answer)}.`], 'У смешанного числа целая и дробная части имеют один знаменатель. Удобно перевести всё в неправильные дроби.', { displayAnswer: mixedDisplay(answer), answerHint: 'Например: 2 3/4 или 2,75' })
}

export const percentagesFive = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const percent = pick(l === 0 ? [10, 20, 25, 50] : [5, 15, 30, 40, 60, 75])
  if (l === 2 && chance()) {
    const answer = randInt(4, 40) * 10
    const part = answer * percent / 100
    return problem(`${percent}% числа равны ${fmt(part)}. Найди число`, answer, [`1% числа: ${fmt(part)} : ${percent} = ${fmt(part / percent)}.`, `Всё число: ${fmt(part / percent)} × 100 = ${fmt(answer)}.`], 'Чтобы найти число по его проценту, раздели часть на процент и умножь на 100.', { instruction: 'Реши задачу' })
  }
  const base = randInt(4, 30) * 20
  const answer = base * percent / 100
  return problem(`${percent}% от ${base}`, answer, [`1% от ${base}: ${base} : 100 = ${fmt(base / 100)}.`, `${percent}%: ${fmt(base / 100)} × ${percent} = ${fmt(answer)}.`], 'Процент — это сотая часть. Чтобы найти процент от числа, умножь число на процент и раздели на 100.')
}

export const orderFive = (difficulty: Difficulty) => {
  const l = level(difficulty)
  if (l === 0) {
    const a = randInt(2, 15) / 10, b = randInt(2, 12) / 10, c = randInt(2, 8)
    const answer = round(a + b * c)
    return problem(`${fmt(a)} + ${fmt(b)} × ${c}`, answer, [`1) Умножение: ${fmt(b)} × ${c} = ${fmt(b * c)}.`, `2) Сложение: ${fmt(a)} + ${fmt(b * c)} = ${fmt(answer)}.`], 'Для десятичных дробей порядок действий тот же: умножение раньше сложения.')
  }
  if (l === 1) {
    const a = randInt(3, 12), b = randInt(2, 9), c = randInt(2, 7)
    const answer = (a + b) / c
    return problem(`(${a} + ${b}) : ${c}`, answer, [`1) Скобки: ${a} + ${b} = ${a + b}.`, `2) Деление: ${a + b} : ${c} = ${fmt(answer)}.`], 'Сначала выполни действие в скобках, затем деление.')
  }
  const d1 = pick([2, 3, 4]), d2 = pick([3, 4, 6]), multiplier = d1 * d2
  const answer = multiplier / d1 + multiplier / d2
  return problem(`(1/${d1} + 1/${d2}) × ${multiplier}`, answer, [`1) Скобки: 1/${d1} + 1/${d2} = ${fraction(d2 + d1, d1 * d2)}.`, `2) Умножение: ${fraction(d2 + d1, d1 * d2)} × ${multiplier} = ${fmt(answer)}.`], 'Сначала приведи дроби в скобках к общему знаменателю, затем умножай.')
}

export const negativeAdd = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const a = randInt(-30 * (l + 1), 30 * (l + 1)) || 5
  const b = randInt(-25 * (l + 1), 25 * (l + 1)) || -7
  if (l === 2) {
    const c = randInt(-30, 30) || 9
    const answer = a + b - c
    return problem(`${parenthesize(a)} + ${parenthesize(b)} − ${parenthesize(c)}`, answer, [`1) ${signed(a)} + (${signed(b)}) = ${signed(a + b)}.`, `2) ${signed(a + b)} − (${signed(c)}) = ${signed(answer)}.`], 'Вычитание отрицательного числа заменяй сложением: a − (−b) = a + b. Равные действия выполняй слева направо.')
  }
  const subtract = chance()
  const answer = subtract ? a - b : a + b
  return problem(`${parenthesize(a)} ${subtract ? '−' : '+'} ${parenthesize(b)}`, answer, [`Раскрой скобки: ${signed(a)} ${subtract ? '−' : '+'} (${signed(b)}) = ${signed(a)} ${subtract ? (b < 0 ? '+' : '−') : (b < 0 ? '−' : '+')} ${fmt(Math.abs(b))}.`, `Результат: ${signed(answer)}.`], 'Одинаковые знаки при раскрытии скобок дают плюс, разные — минус. У чисел с разными знаками вычитай модули.')
}

export const negativeMultiply = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const a = randInt(-15 * (l + 1), 15 * (l + 1)) || -6
  const b = randInt(-12, 12) || 4
  if (l === 2 && chance()) {
    const c = randInt(-6, 6) || -3
    const answer = a * b * c
    return problem(`${parenthesize(a)} × ${parenthesize(b)} × ${parenthesize(c)}`, answer, [`1) ${signed(a)} × (${signed(b)}) = ${signed(a * b)}.`, `2) ${signed(a * b)} × (${signed(c)}) = ${signed(answer)}.`], 'При умножении нескольких чисел чётное число минусов даёт плюс, нечётное — минус.')
  }
  const dividing = chance()
  if (dividing) {
    const quotient = b, divisor = a, dividend = divisor * quotient
    return problem(`${parenthesize(dividend)} : ${parenthesize(divisor)}`, quotient, [`Знаки ${Math.sign(dividend) === Math.sign(divisor) ? 'одинаковые — результат положительный' : 'разные — результат отрицательный'}.`, `${fmt(Math.abs(dividend))} : ${fmt(Math.abs(divisor))} = ${fmt(Math.abs(quotient))}; ответ ${signed(quotient)}.`], 'При делении одинаковые знаки дают плюс, разные — минус.')
  }
  return problem(`${parenthesize(a)} × ${parenthesize(b)}`, a * b, [`Знаки ${Math.sign(a) === Math.sign(b) ? 'одинаковые — результат положительный' : 'разные — результат отрицательный'}.`, `${fmt(Math.abs(a))} × ${fmt(Math.abs(b))} = ${fmt(Math.abs(a * b))}; ответ ${signed(a * b)}.`], 'При умножении одинаковые знаки дают плюс, разные — минус.')
}

export const fractionsSix = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const d1 = pick([2, 3, 4, 5, 6, 8]), d2 = pick([3, 4, 5, 6, 7, 8])
  const n1 = randInt(1, d1 * 2 - 1) * (l > 0 && chance() ? -1 : 1)
  const n2 = randInt(1, d2 * 2 - 1) * (l > 0 && chance() ? -1 : 1)
  const op = pick(l === 0 ? ['+', '−', '×'] : ['+', '−', '×', ':'])
  let rn = 0, rd = 1
  if (op === '+') { rn = n1 * d2 + n2 * d1; rd = d1 * d2 }
  if (op === '−') { rn = n1 * d2 - n2 * d1; rd = d1 * d2 }
  if (op === '×') { rn = n1 * n2; rd = d1 * d2 }
  if (op === ':') { rn = n1 * d2; rd = d1 * n2 }
  const steps = op === ':'
    ? [`Деление замени умножением на перевёрнутую дробь.`, `${n1}/${d1} × ${d2}/${n2} = ${fraction(rn, rd)}.`]
    : op === '×'
      ? [`Умножь числители и знаменатели.`, `${n1} × ${n2} = ${n1 * n2}; ${d1} × ${d2} = ${d1 * d2}.`, `Сократи: ${fraction(rn, rd)}.`]
      : [`Общий знаменатель: ${d1 * d2 / gcd(d1, d2)}.`, `После ${op === '+' ? 'сложения' : 'вычитания'} числителей и сокращения: ${fraction(rn, rd)}.`]
  return problem(`(${fraction(n1, d1)}) ${op} (${fraction(n2, d2)})`, rn / rd, steps, 'Сложение и вычитание — через общий знаменатель. Деление на дробь заменяется умножением на обратную.', { displayAnswer: fraction(rn, rd), answerHint: 'Ответ можно записать дробью a/b' })
}

export const proportions = (difficulty: Difficulty): Problem => {
  const l = level(difficulty)
  const a = randInt(3, 12 + l * 5), c = randInt(3, 15)
  const x = randInt(2, 30)
  const b = x * c / a
  if (!Number.isInteger(b)) return proportions(difficulty)
  return problem(`x/${a} = ${fmt(b)}/${c}`, x, [`По основному свойству: x · ${c} = ${a} · ${fmt(b)}.`, `x = ${fmt(a * b)} : ${c} = ${fmt(x)}.`], 'В верной пропорции произведение крайних членов равно произведению средних.', { instruction: 'Найди x' })
}

export const expressionsSix = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const a = randInt(2, 8 + l * 2), b = randInt(2, 9)
  const x = randInt(-8 - l * 3, 8 + l * 3) || 3
  const y = randInt(-7, 7) || -2
  const answer = a * x - b * y
  return problem(`${a}x − ${b}y, если x = ${signed(x)}, y = ${signed(y)}`, answer, [`Подставь: ${a} × (${signed(x)}) − ${b} × (${signed(y)}).`, `1) ${a} × (${signed(x)}) = ${signed(a * x)}; ${b} × (${signed(y)}) = ${signed(b * y)}.`, `2) ${signed(a * x)} − (${signed(b * y)}) = ${signed(answer)}.`], 'Вместо переменных подставь числа в скобках. Сначала умножение, затем вычитание.', { instruction: 'Вычисли значение выражения' })
}

export const orderSix = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const a = randInt(-20, 25), b = randInt(2, 9), c = randInt(-8, 8), d = randInt(2, 8)
  if (l === 0) {
    const answer = a - b * c
    return problem(`${signed(a)} − ${b} × ${parenthesize(c)}`, answer, [`1) Умножение: ${b} × (${signed(c)}) = ${signed(b * c)}.`, `2) Вычитание: ${signed(a)} − (${signed(b * c)}) = ${signed(answer)}.`], 'Сначала умножение. Затем раскрой скобки при вычитании, внимательно следя за знаком.')
  }
  if (l === 1) {
    const answer = (a + c) * b - d
    return problem(`(${signed(a)} + ${parenthesize(c)}) × ${b} − ${d}`, answer, [`1) Скобки: ${signed(a)} + (${signed(c)}) = ${signed(a + c)}.`, `2) Умножение: ${signed(a + c)} × ${b} = ${signed((a + c) * b)}.`, `3) Вычитание: ${signed((a + c) * b)} − ${d} = ${signed(answer)}.`], 'Скобки → умножение → вычитание. Знак результата определяй на каждом шаге.')
  }
  const divisor = pick([2, 4, 5]), sum = divisor * randInt(-5, 6)
  const first = sum - c
  const answer = first + c
  return problem(`(${signed(first)} + ${parenthesize(c)}) : ${divisor} + ${b} × ${parenthesize(d)}`, answer / divisor + b * d, [`1) Скобки: ${signed(first)} + (${signed(c)}) = ${signed(sum)}.`, `2) Деление: ${signed(sum)} : ${divisor} = ${signed(sum / divisor)}; умножение: ${b} × ${d} = ${b * d}.`, `3) Сложение: ${signed(sum / divisor)} + ${b * d} = ${signed(answer / divisor + b * d)}.`], 'Сначала скобки, затем деление и умножение, в конце сложение.')
}

export const topicsFourToSix: Topic[] = [
  { id: 'natural-4', grade: 4, title: 'Многозначные числа', navTitle: 'Сложение и вычитание', description: 'Сложение и вычитание в пределах миллиона и больше.', rule: 'Разряды и переносы', generate: naturalNumbers },
  { id: 'multiply-4', grade: 4, title: 'Умножение многозначных чисел', navTitle: 'Умножение', description: 'Умножение на однозначное и двузначное число.', rule: 'Поразрядное умножение', generate: multiplication },
  { id: 'divide-4', grade: 4, title: 'Деление многозначных чисел', navTitle: 'Деление', description: 'Точное деление с проверкой умножением.', rule: 'Алгоритм деления', generate: division },
  { id: 'order-4', grade: 4, title: 'Порядок действий', navTitle: 'Порядок действий', description: 'Скобки, умножение, деление, сложение и вычитание.', rule: 'Скобки → × и : → + и −', generate: orderFour },
  { id: 'units-4', grade: 4, title: 'Вычисления с величинами', navTitle: 'Величины', description: 'Длина, масса и время в разных единицах.', rule: 'Перевод единиц', generate: units },
  { id: 'equations-4', grade: 4, title: 'Простые уравнения', navTitle: 'Уравнения', description: 'Неизвестное слагаемое, множитель, делимое и вычитаемое.', rule: 'Обратное действие', generate: equationsFour },
  { id: 'decimal-add-5', grade: 5, title: 'Сложение и вычитание десятичных дробей', navTitle: 'Десятичные: + и −', description: 'Действия с десятыми, сотыми и несколькими слагаемыми.', rule: 'Запятая под запятой', generate: decimalAdd },
  { id: 'decimal-multiply-5', grade: 5, title: 'Умножение и деление десятичных дробей', navTitle: 'Десятичные: × и :', description: 'Положение запятой и проверка результата.', rule: 'Счёт знаков после запятой', generate: decimalMultiply },
  { id: 'fractions-5', grade: 5, title: 'Сложение и вычитание обыкновенных дробей', navTitle: 'Обыкновенные дроби', description: 'Одинаковые и разные знаменатели, сокращение.', rule: 'Общий знаменатель', generate: fractionsFive },
  { id: 'mixed-5', grade: 5, title: 'Смешанные числа', navTitle: 'Смешанные числа', description: 'Сложение и вычитание смешанных дробей.', rule: 'Переход к неправильной дроби', generate: mixedNumbers },
  { id: 'percent-5', grade: 5, title: 'Проценты', navTitle: 'Проценты', description: 'Процент от числа и число по его проценту.', rule: '1% = 1/100', generate: percentagesFive },
  { id: 'order-5', grade: 5, title: 'Порядок действий с дробями', navTitle: 'Порядок действий', description: 'Десятичные и обыкновенные дроби в многошаговых примерах.', rule: 'Скобки → × и : → + и −', generate: orderFive },
  { id: 'negative-add-6', grade: 6, title: 'Сложение и вычитание отрицательных чисел', navTitle: 'Отрицательные: + и −', description: 'Знаки, модули и раскрытие скобок.', rule: 'Правила знаков', generate: negativeAdd },
  { id: 'negative-multiply-6', grade: 6, title: 'Умножение и деление отрицательных чисел', navTitle: 'Отрицательные: × и :', description: 'Произведения и частные с разными знаками.', rule: 'Одинаковые знаки → плюс', generate: negativeMultiply },
  { id: 'fractions-6', grade: 6, title: 'Все действия с дробями', navTitle: 'Дроби: все действия', description: 'Положительные и отрицательные обыкновенные дроби.', rule: 'Знаменатель и обратная дробь', generate: fractionsSix },
  { id: 'proportions-6', grade: 6, title: 'Пропорции', navTitle: 'Пропорции', description: 'Нахождение неизвестного члена пропорции.', rule: 'Крест-накрест', generate: proportions },
  { id: 'expressions-6', grade: 6, title: 'Значение буквенного выражения', navTitle: 'Выражения с переменными', description: 'Подстановка положительных и отрицательных значений.', rule: 'Подстановка в скобках', generate: expressionsSix },
  { id: 'order-6', grade: 6, title: 'Порядок действий с отрицательными числами', navTitle: 'Порядок действий', description: 'Многошаговые выражения со скобками и знаками.', rule: 'Порядок + знаки', generate: orderSix },
]
