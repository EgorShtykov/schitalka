import { chance, fmt, fraction, parenthesize, pick, problem, randInt, round, signed, sup } from './math'
import type { Difficulty, Topic } from './math'

const level = (difficulty: Difficulty) => difficulty === 'easy' ? 0 : difficulty === 'medium' ? 1 : 2

const POWER_ANSWER_LIMIT = 4096

export const powersSeven = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const exponent = l === 0 ? pick([2, 3]) : pick([2, 3, 4])
  const candidates = l === 0
    ? Array.from({ length: 9 }, (_, index) => index + 2)
    : l === 1
      ? Array.from({ length: 22 }, (_, index) => index - 9).filter((value) => value !== 0)
      : [0.2, 0.5, 1.5, -2, -3, 4]
  const base = pick(candidates.filter((value) => Math.abs(value ** exponent) <= POWER_ANSWER_LIMIT))
  const answer = base ** exponent
  const factors = Array.from({ length: exponent }, () => parenthesize(base)).join(' × ')
  return problem(`${parenthesize(base)}${sup(exponent)}`, answer, [`Степень — это повторное умножение: ${fmt(base)}${sup(exponent)} = ${factors}.`, `Результат: ${fmt(answer)}.`], 'Показатель степени показывает, сколько раз основание умножается само на себя. Сначала возведи в степень, затем учитывай знак.')
}

export const powerProperties = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const candidates = Array.from({ length: l === 2 ? 4 : 7 }, (_, index) => index + 2)
  const kind = pick(l === 0 ? ['multiply', 'divide'] : ['multiply', 'divide', 'power'])
  if (kind === 'multiply') {
    const m = randInt(1, 3), n = randInt(1, 3)
    const base = pick(candidates.filter((value) => value ** (m + n) <= POWER_ANSWER_LIMIT))
    const answer = base ** (m + n)
    return problem(`${base}${sup(m)} × ${base}${sup(n)}`, answer, [`Основания одинаковые, показатели складываем: ${m} + ${n} = ${m + n}.`, `${base}${sup(m + n)} = ${fmt(answer)}.`], 'При умножении степеней с одинаковым основанием показатели складываются: aᵐ · aⁿ = aᵐ⁺ⁿ.')
  }
  if (kind === 'divide') {
    const n = randInt(1, 2), m = n + randInt(1, 3)
    const base = pick(candidates.filter((value) => value ** m <= POWER_ANSWER_LIMIT))
    const answer = base ** (m - n)
    return problem(`${base}${sup(m)} : ${base}${sup(n)}`, answer, [`Основания одинаковые, показатели вычитаем: ${m} − ${n} = ${m - n}.`, `${base}${sup(m - n)} = ${fmt(answer)}.`], 'При делении степеней с одинаковым основанием показатели вычитаются: aᵐ : aⁿ = aᵐ⁻ⁿ.')
  }
  const m = randInt(2, 3), n = randInt(2, 3)
  const base = pick(candidates.filter((value) => value ** (m * n) <= POWER_ANSWER_LIMIT))
  const answer = base ** (m * n)
  return problem(`(${base}${sup(m)})${sup(n)}`, answer, [`При возведении степени в степень показатели перемножаются: ${m} × ${n} = ${m * n}.`, `${base}${sup(m * n)} = ${fmt(answer)}.`], 'При возведении степени в степень показатели перемножаются: (aᵐ)ⁿ = aᵐⁿ.')
}

export const expressionsSeven = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const a = randInt(2, 6 + l), b = randInt(2, 7)
  const x = randInt(-5, 7) || 2, y = randInt(-4, 6) || -1
  const answer = a * (x + y) - b * (x - y)
  return problem(`${a}(x + y) − ${b}(x − y), если x = ${signed(x)}, y = ${signed(y)}`, answer, [`1) Скобки: x + y = ${signed(x + y)}; x − y = ${signed(x - y)}.`, `2) Умножение: ${a} × (${signed(x + y)}) = ${signed(a * (x + y))}; ${b} × (${signed(x - y)}) = ${signed(b * (x - y))}.`, `3) Вычитание: ${signed(answer)}.`], 'Сначала вычисли скобки после подстановки, затем умножение, в конце — вычитание.', { instruction: 'Вычисли значение выражения' })
}

export const linearEquations = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const x = randInt(-9 - l * 2, 9 + l * 2) || 3
  if (l === 0) {
    const a = randInt(2, 9), b = randInt(-15, 15)
    const c = a * x + b
    return problem(`${a}x ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))} = ${signed(c)}`, x, [`Перенеси ${signed(b)} в правую часть с противоположным знаком: ${a}x = ${signed(c - b)}.`, `Раздели на ${a}: x = ${signed(x)}.`], 'Слагаемые переносим с противоположным знаком. Затем делим обе части на коэффициент при x.', { instruction: 'Найди x' })
  }
  if (l === 1) {
    const a = randInt(2, 7), b = randInt(2, 8), c = randInt(-10, 10)
    const right = a * (x + b) + c
    return problem(`${a}(x + ${b}) ${c < 0 ? '−' : '+'} ${fmt(Math.abs(c))} = ${signed(right)}`, x, [`Раскрой скобки: ${a}x + ${a * b} ${c < 0 ? '−' : '+'} ${fmt(Math.abs(c))} = ${signed(right)}.`, `${a}x = ${signed(right - a * b - c)}.`, `x = ${signed(x)}.`], 'Сначала раскрой скобки, затем перенеси числа и раздели на коэффициент при x.', { instruction: 'Найди x' })
  }
  const a = randInt(4, 10), c = randInt(1, a - 1), b = randInt(-8, 10)
  const d = (a - c) * x + b
  return problem(`${a}x ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))} = ${c}x ${d < 0 ? '−' : '+'} ${fmt(Math.abs(d))}`, x, [`Перенеси члены с x влево, числа вправо: ${a - c}x = ${signed(d - b)}.`, `x = ${signed(d - b)} : ${a - c} = ${signed(x)}.`], 'Члены с переменной — в одну сторону, числа — в другую. При переносе меняй знак.', { instruction: 'Найди x' })
}

export const formulas = (_difficulty: Difficulty) => {
  const kind = pick(['motion', 'rectangle', 'linear'])
  if (kind === 'motion') {
    const v = randInt(4, 18) * 5, t = randInt(2, 9)
    return problem(`S = vt. Найди S, если v = ${v} км/ч, t = ${t} ч`, v * t, [`Подставь значения: S = ${v} × ${t}.`, `S = ${v * t} км.`], 'Подставь числа в формулу вместо букв и соблюдай единицы измерения.', { instruction: 'Вычисли по формуле', answerHint: 'Ответ в километрах, только число' })
  }
  if (kind === 'rectangle') {
    const a = randInt(4, 25), b = randInt(3, 18)
    return problem(`P = 2(a + b). Найди P, если a = ${a} см, b = ${b} см`, 2 * (a + b), [`1) Скобки: ${a} + ${b} = ${a + b}.`, `2) P = 2 × ${a + b} = ${2 * (a + b)} см.`], 'Сначала выполни действие в скобках, затем умножение.', { instruction: 'Вычисли по формуле', answerHint: 'Ответ в сантиметрах, только число' })
  }
  const k = randInt(-5, 7) || 3, b = randInt(-9, 9), x = randInt(-6, 8)
  const answer = k * x + b
  return problem(`y = ${k}x ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))}. Найди y, если x = ${signed(x)}`, answer, [`y = ${k} × (${signed(x)}) ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))}.`, `y = ${signed(k * x)} ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))} = ${signed(answer)}.`], 'Подставляй отрицательное значение переменной в скобках. Умножение выполняется первым.', { instruction: 'Вычисли по формуле' })
}

export const orderSeven = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const a = randInt(2, 9), b = randInt(2, 7), c = randInt(2, 6)
  if (l === 0) {
    const answer = a + b ** 2 * c
    return problem(`${a} + ${b}² × ${c}`, answer, [`1) Степень: ${b}² = ${b ** 2}.`, `2) Умножение: ${b ** 2} × ${c} = ${b ** 2 * c}.`, `3) Сложение: ${a} + ${b ** 2 * c} = ${answer}.`], 'Порядок: скобки → степени → умножение и деление → сложение и вычитание.', { pitfalls: [{ answer: a + (b * c) ** 2, message: 'Степень относится только к основанию. Сначала возведи в квадрат, потом умножай.' }] })
  }
  if (l === 1) {
    const sum = b + c, answer = (a - sum) ** 2 + c
    return problem(`(${a} − ${b} − ${c})² + ${c}`, answer, [`1) Скобки слева направо: ${a} − ${b} − ${c} = ${a - sum}.`, `2) Степень: (${a - sum})² = ${(a - sum) ** 2}.`, `3) Сложение: ${(a - sum) ** 2} + ${c} = ${answer}.`], 'Действия в скобках выполняются слева направо. Затем степень и сложение.')
  }
  const d = randInt(2, 6), root = randInt(2, 8), dividend = d * root
  const answer = b ** 2 - dividend / d + a
  return problem(`${b}² − ${dividend} : ${d} + ${a}`, answer, [`1) Степень: ${b}² = ${b ** 2}.`, `2) Деление: ${dividend} : ${d} = ${root}.`, `3) Слева направо: ${b ** 2} − ${root} + ${a} = ${answer}.`], 'Степень вычисляется раньше деления. Сложение и вычитание затем выполняются слева направо.')
}

export const squareRoots = (difficulty: Difficulty) => {
  const l = level(difficulty)
  if (l === 0) {
    const root = randInt(2, 15)
    return problem(`√${root ** 2}`, root, [`Нужно число, квадрат которого равен ${root ** 2}.`, `${root}² = ${root ** 2}, значит √${root ** 2} = ${root}.`], 'Арифметический квадратный корень √a — неотрицательное число, квадрат которого равен a.')
  }
  if (l === 1) {
    const root = pick([0.2, 0.4, 0.5, 0.6, 0.8, 1.2, 1.5])
    const square = round(root ** 2)
    return problem(`√${fmt(square)}`, root, [`Проверь квадрат: ${fmt(root)}² = ${fmt(square)}.`, `Значит √${fmt(square)} = ${fmt(root)}.`], 'Корень из десятичной дроби проверяй возведением ответа в квадрат.')
  }
  const [a, b] = pick([[3, 4], [6, 8], [5, 12], [9, 12], [8, 15]])
  const root = Math.sqrt(a * a + b * b)
  return problem(`√(${a}² + ${b}²)`, root, [`1) Степени: ${a}² + ${b}² = ${a * a} + ${b * b} = ${a * a + b * b}.`, `2) Корень: √${a * a + b * b} = ${root}.`], 'Сначала вычисли подкоренное выражение, соблюдая порядок действий, затем извлеки корень.')
}

export const rootOperations = (difficulty: Difficulty) => {
  const l = level(difficulty)
  if (l === 0) {
    const a = randInt(2, 12), b = randInt(2, 12)
    return problem(`√${a ** 2} + √${b ** 2}`, a + b, [`1) √${a ** 2} = ${a}; √${b ** 2} = ${b}.`, `2) ${a} + ${b} = ${a + b}.`], 'Извлекай каждый корень отдельно, затем складывай. √a + √b не равно √(a + b).')
  }
  if (l === 1) {
    const a = randInt(2, 9), b = randInt(2, 9)
    return problem(`√${a ** 2} × √${b ** 2}`, a * b, [`1) √${a ** 2} = ${a}; √${b ** 2} = ${b}.`, `2) ${a} × ${b} = ${a * b}.`], '√a · √b = √(ab) при a, b ≥ 0. Можно извлечь корни, а затем умножить.')
  }
  const a = randInt(3, 15), b = randInt(2, 9), c = randInt(2, 8)
  const answer = a - b + c ** 2
  return problem(`√${a ** 2} − √${b ** 2} + ${c}²`, answer, [`1) Корни и степень: √${a ** 2} = ${a}; √${b ** 2} = ${b}; ${c}² = ${c ** 2}.`, `2) Слева направо: ${a} − ${b} + ${c ** 2} = ${answer}.`], 'Корни и степени вычисляются до сложения и вычитания. Равные действия — слева направо.')
}

export const integerPowers = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const base = pick([2, 3, 4, 5, 10])
  if (l === 0 && chance()) {
    return problem(`${base}⁰`, 1, [`Любое ненулевое число в нулевой степени равно 1.`, `${base}⁰ = 1.`], 'a⁰ = 1 при a ≠ 0.')
  }
  const exponent = l === 2 ? randInt(2, 4) : randInt(1, 3)
  const denominator = base ** exponent
  return problem(`${base}${sup(-exponent)}`, 1 / denominator, [`Отрицательный показатель: ${base}${sup(-exponent)} = 1/${base}${sup(exponent)}.`, `${base}${sup(exponent)} = ${denominator}, значит ответ ${fraction(1, denominator)}.`], 'a⁻ⁿ = 1/aⁿ при a ≠ 0. Отрицательный показатель не меняет знак числа.', { displayAnswer: fraction(1, denominator), answerHint: 'Можно ввести дробь, например 1/8', pitfalls: [{ answer: -denominator, message: 'Минус в показателе означает обратное число, а не отрицательный результат.' }] })
}

export const rationalExpressions = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const a = randInt(1, 8), x = randInt(a + 1, a + 10)
  if (l === 0) {
    const b = randInt(1, 9), denominator = x + a
    const answer = (x + b) / denominator
    return problem(`(x + ${b}) : (x + ${a}), если x = ${x}`, answer, [`Подставь x: (${x} + ${b}) : (${x} + ${a}).`, `${x + b} : ${denominator} = ${fraction(x + b, denominator)}.`], 'Подставь значение переменной и проверь, что знаменатель не равен нулю.', { displayAnswer: fraction(x + b, denominator), answerHint: 'Можно ввести дробь a/b' })
  }
  const answer = x + a
  return problem(`(x² − ${a}²) : (x − ${a}), если x = ${x}`, answer, [`Разложи числитель: x² − ${a}² = (x − ${a})(x + ${a}).`, `Сократи на (x − ${a}), ведь x ≠ ${a}. Останется x + ${a}.`, `При x = ${x}: ${x} + ${a} = ${answer}.`], 'Разность квадратов: a² − b² = (a − b)(a + b). Сокращать можно только общий множитель.')
}

export const quadraticEquations = (difficulty: Difficulty) => {
  const l = level(difficulty)
  if (l === 0) {
    const root = randInt(2, 12)
    return problem(`x² = ${root ** 2}`, [-root, root], [`x = ±√${root ** 2}.`, `x₁ = ${-root}; x₂ = ${root}.`], 'Уравнение x² = a при a > 0 имеет два корня: положительный и отрицательный.', { instruction: 'Найди оба корня', answerHint: 'Два корня через точку с запятой: −3; 3' })
  }
  const r1 = randInt(-9, 8), r2 = randInt(r1 + 1, 10)
  if (l === 1) {
    return problem(`(x ${r1 < 0 ? '+' : '−'} ${fmt(Math.abs(r1))})(x ${r2 < 0 ? '+' : '−'} ${fmt(Math.abs(r2))}) = 0`, [r1, r2], [`Произведение равно нулю, когда хотя бы один множитель равен нулю.`, `x ${r1 < 0 ? '+' : '−'} ${fmt(Math.abs(r1))} = 0 → x = ${r1}; x ${r2 < 0 ? '+' : '−'} ${fmt(Math.abs(r2))} = 0 → x = ${r2}.`], 'Произведение равно нулю, если хотя бы один из множителей равен нулю.', { instruction: 'Найди оба корня', answerHint: 'Запиши оба корня через ;' })
  }
  const b = -(r1 + r2), c = r1 * r2
  const discriminant = b * b - 4 * c
  return problem(`x² ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))}x ${c < 0 ? '−' : '+'} ${fmt(Math.abs(c))} = 0`, [r1, r2], [`D = b² − 4ac = (${b})² − 4 × 1 × (${c}) = ${discriminant}.`, `√D = ${Math.sqrt(discriminant)}.`, `x = (−b ± √D) : 2; корни: ${r1} и ${r2}.`], 'Для ax² + bx + c = 0: D = b² − 4ac, затем x = (−b ± √D)/(2a).', { instruction: 'Найди оба корня', answerHint: 'Запиши оба корня через ;' })
}

export const orderEight = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const a = randInt(2, 12), b = randInt(2, 8), c = randInt(2, 6)
  if (l === 0) {
    const answer = a + b ** 2
    return problem(`√${a ** 2} + ${b}²`, answer, [`1) Корень: √${a ** 2} = ${a}; степень: ${b}² = ${b ** 2}.`, `2) Сложение: ${a} + ${b ** 2} = ${answer}.`], 'Корни и степени вычисляются до сложения.')
  }
  if (l === 1) {
    const answer = (a + b) * c - a
    return problem(`(√${a ** 2} + √${b ** 2}) × ${c} − √${a ** 2}`, answer, [`1) Корни: √${a ** 2} = ${a}; √${b ** 2} = ${b}.`, `2) Скобки: ${a} + ${b} = ${a + b}.`, `3) Умножение: ${a + b} × ${c} = ${(a + b) * c}.`, `4) Вычитание: ${(a + b) * c} − ${a} = ${answer}.`], 'Скобки и корни → умножение → вычитание.')
  }
  const denominator = pick([2, 4, 5]), numerator = denominator * randInt(2, 8)
  const answer = a + numerator / denominator - b ** 2
  return problem(`√${a ** 2} + ${numerator} : ${denominator} − ${b}²`, answer, [`1) Корень и степень: ${a} и ${b ** 2}.`, `2) Деление: ${numerator} : ${denominator} = ${numerator / denominator}.`, `3) Слева направо: ${a} + ${numerator / denominator} − ${b ** 2} = ${fmt(answer)}.`], 'Сначала корни и степени, затем деление, после него сложение и вычитание слева направо.')
}

export const scientificNotation = (difficulty: Difficulty) => {
  const l = level(difficulty)
  if (l === 0) {
    const a = randInt(12, 85) / 10, b = randInt(12, 65) / 10
    const m = pick([2, 3]), n = pick([1, 2])
    const answer = a * b * 10 ** (m + n)
    return problem(`(${fmt(a)} × 10${sup(m)}) × (${fmt(b)} × 10${sup(n)})`, answer, [`1) Коэффициенты: ${fmt(a)} × ${fmt(b)} = ${fmt(a * b)}.`, `2) Степени: 10${sup(m)} × 10${sup(n)} = 10${sup(m + n)}.`, `Ответ обычным числом: ${fmt(answer)}.`], 'Умножай коэффициенты отдельно, а показатели степеней десяти складывай.', { instruction: 'Вычисли, ответ запиши обычным числом' })
  }
  if (l === 1) {
    const a = randInt(12, 75) / 10, b = randInt(12, 45) / 10
    const m = randInt(4, 6), n = randInt(1, 3)
    const answer = a / b * 10 ** (m - n)
    return problem(`(${fmt(a)} × 10${sup(m)}) : (${fmt(b)} × 10${sup(n)})`, answer, [`1) Коэффициенты: ${fmt(a)} : ${fmt(b)} = ${fmt(a / b)}.`, `2) Показатели: ${m} − ${n} = ${m - n}.`, `Ответ обычным числом: ${fmt(answer)}.`], 'Дели коэффициенты, а показатели степеней десяти вычитай.', { instruction: 'Вычисли, ответ запиши обычным числом' })
  }
  const a = randInt(15, 85) / 10, b = randInt(2, 8)
  const m = pick([-3, -2, 2, 3])
  const answer = a * 10 ** m * b
  return problem(`${fmt(a)} × 10${sup(m)} × ${b}`, answer, [`1) Сначала умножь коэффициенты: ${fmt(a)} × ${b} = ${fmt(a * b)}.`, `2) Умножение на 10${sup(m)} даёт ${fmt(answer)}.`], 'Положительный показатель сдвигает запятую вправо, отрицательный — влево.', { instruction: 'Вычисли, ответ запиши обычным числом' })
}

export const radicalsNine = (difficulty: Difficulty) => {
  const l = level(difficulty)
  if (l === 0) {
    const root = randInt(2, 8)
    return problem(`∛${root ** 3}`, root, [`Нужно число, куб которого равен ${root ** 3}.`, `${root}³ = ${root ** 3}, значит ∛${root ** 3} = ${root}.`], 'Кубический корень ∛a — число, куб которого равен a.')
  }
  if (l === 1) {
    const a = randInt(2, 9), b = randInt(2, 8)
    return problem(`∛${a ** 3} + √${b ** 2}`, a + b, [`1) ∛${a ** 3} = ${a}; √${b ** 2} = ${b}.`, `2) ${a} + ${b} = ${a + b}.`], 'Сначала извлеки корни, затем выполни сложение.')
  }
  const a = randInt(2, 7), b = randInt(2, 8), c = randInt(2, 5)
  const answer = a * b - c ** 3
  return problem(`√${a ** 2} × ∛${b ** 3} − ${c}³`, answer, [`1) Корни: √${a ** 2} = ${a}; ∛${b ** 3} = ${b}; степень: ${c}³ = ${c ** 3}.`, `2) Умножение: ${a} × ${b} = ${a * b}.`, `3) Вычитание: ${a * b} − ${c ** 3} = ${answer}.`], 'Корни и степени → умножение → вычитание.')
}

export const progressions = (difficulty: Difficulty) => {
  const l = level(difficulty)
  if (l === 0 || chance(0.55)) {
    const a1 = randInt(-8, 15), d = randInt(2, 9) * (chance() ? 1 : -1)
    const n = randInt(4, 10 + l * 3)
    const answer = a1 + (n - 1) * d
    return problem(`Арифметическая прогрессия: a₁ = ${a1}, d = ${d}. Найди a${sup(n)}`, answer, [`Формула n-го члена: aₙ = a₁ + (n − 1)d.`, `a${sup(n)} = ${a1} + (${n} − 1) × (${d}) = ${answer}.`], 'В арифметической прогрессии разность постоянна: aₙ = a₁ + (n − 1)d.', { instruction: 'Вычисли член прогрессии' })
  }
  const a1 = randInt(1, 5), q = pick([2, 3, -2]), n = randInt(3, 5 + l)
  const answer = a1 * q ** (n - 1)
  return problem(`Геометрическая прогрессия: b₁ = ${a1}, q = ${q}. Найди b${sup(n)}`, answer, [`Формула n-го члена: bₙ = b₁ · qⁿ⁻¹.`, `b${sup(n)} = ${a1} × (${q})${sup(n - 1)} = ${answer}.`], 'В геометрической прогрессии знаменатель постоянен: bₙ = b₁ · qⁿ⁻¹.', { instruction: 'Вычисли член прогрессии' })
}

export const functionsNine = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const a = randInt(-3, 4) || 2, b = randInt(-6, 6), c = randInt(-8, 8)
  const x = randInt(-5 - l, 5 + l)
  const answer = a * x ** 2 + b * x + c
  return problem(`f(x) = ${a}x² ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))}x ${c < 0 ? '−' : '+'} ${fmt(Math.abs(c))}. Найди f(${x})`, answer, [`Подставь ${x} вместо x: f(${x}) = ${a} × (${x})² ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))} × (${x}) ${c < 0 ? '−' : '+'} ${fmt(Math.abs(c))}.`, `1) Степень и умножение: ${a} × (${x})² = ${signed(a * x ** 2)}; ${b} × (${x}) = ${signed(b * x)}.`, `2) После всех действий: f(${x}) = ${answer}.`], 'Подставь аргумент в скобках. Сначала степень, затем умножение, после этого сложение и вычитание.', { instruction: 'Вычисли значение функции' })
}

export const trigonometry = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const values = [
    { expression: 'sin 30°', answer: 0.5, display: '1/2', reason: 'sin 30° = 1/2' },
    { expression: 'cos 60°', answer: 0.5, display: '1/2', reason: 'cos 60° = 1/2' },
    { expression: 'sin 45°', answer: Math.SQRT1_2, display: '√2/2', reason: 'sin 45° = √2/2' },
    { expression: 'cos 45°', answer: Math.SQRT1_2, display: '√2/2', reason: 'cos 45° = √2/2' },
    { expression: 'tan 45°', answer: 1, display: '1', reason: 'tan 45° = 1' },
    { expression: 'sin 60°', answer: Math.sqrt(3) / 2, display: '√3/2', reason: 'sin 60° = √3/2' },
    { expression: 'cos 30°', answer: Math.sqrt(3) / 2, display: '√3/2', reason: 'cos 30° = √3/2' },
    { expression: 'tan 30°', answer: Math.sqrt(3) / 3, display: '√3/3', reason: 'tan 30° = √3/3' },
  ]
  const item = pick(values.slice(0, l === 0 ? 5 : values.length))
  return problem(item.expression, item.answer, [`Используй таблицу значений для углов 30°, 45°, 60°.`, `${item.reason}.`], 'Значения sin, cos и tan для 30°, 45° и 60° нужно знать. Можно ввести точное значение с √ или десятичное приближение.', { displayAnswer: item.display, answerHint: 'Например: √3/2 или 0,8660254' })
}

export const orderNine = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const root = randInt(2, 12), base = pick([2, 4, 5]), c = randInt(2, 7)
  if (l === 0) {
    const answer = root + 1 / base + c
    return problem(`√${root ** 2} + ${base}⁻¹ + ${c}`, answer, [`1) Корень: √${root ** 2} = ${root}; отрицательная степень: ${base}⁻¹ = 1/${base}.`, `2) Сложение слева направо: ${root} + 1/${base} + ${c} = ${fmt(answer)}.`], 'Корни и степени вычисляются первыми. Затем сложение слева направо.')
  }
  if (l === 1) {
    const answer = (root + c) / base + 1 / base
    return problem(`(√${root ** 2} + ${c}) : ${base} + ${base}⁻¹`, answer, [`1) Скобки и корень: √${root ** 2} + ${c} = ${root + c}.`, `2) Деление и степень: ${root + c} : ${base} = ${fmt((root + c) / base)}; ${base}⁻¹ = 1/${base}.`, `3) Сложение: ${fmt(answer)}.`], 'Скобки → корни и степени → деление → сложение.')
  }
  const a = randInt(2, 8), answer = root ** 2 / a - base ** -1 + c
  return problem(`(√${root ** 2})² : ${a} − ${base}⁻¹ + ${c}`, answer, [`1) Скобки и степени: (√${root ** 2})² = ${root ** 2}; ${base}⁻¹ = 1/${base}.`, `2) Деление: ${root ** 2} : ${a} = ${fmt(root ** 2 / a)}.`, `3) Слева направо: ${fmt(root ** 2 / a)} − 1/${base} + ${c} = ${fmt(answer)}.`], 'Не торопись: скобки, корни и степени, затем деление, в конце действия слева направо.')
}

export const topicsSevenToNine: Topic[] = [
  { id: 'powers-7', grade: 7, title: 'Степень с натуральным показателем', navTitle: 'Степени', description: 'Возведение положительных, отрицательных и дробных чисел.', rule: 'Повторное умножение', generate: powersSeven },
  { id: 'power-properties-7', grade: 7, title: 'Свойства степеней', navTitle: 'Свойства степеней', description: 'Умножение, деление и возведение степени в степень.', rule: 'Действия с показателями', generate: powerProperties },
  { id: 'expressions-7', grade: 7, title: 'Выражения со скобками и переменными', navTitle: 'Буквенные выражения', description: 'Подстановка и вычисление многошаговых выражений.', rule: 'Скобки и подстановка', generate: expressionsSeven },
  { id: 'linear-7', grade: 7, title: 'Линейные уравнения', navTitle: 'Линейные уравнения', description: 'Перенос слагаемых, скобки и переменные в обеих частях.', rule: 'Равносильные преобразования', generate: linearEquations },
  { id: 'formulas-7', grade: 7, title: 'Вычисления по формулам', navTitle: 'Формулы', description: 'Путь, периметр и линейная зависимость.', rule: 'Подстановка в формулу', generate: formulas },
  { id: 'order-7', grade: 7, title: 'Порядок действий со степенями', navTitle: 'Порядок действий', description: 'Степени, скобки и несколько действий.', rule: 'Скобки → степени → × : → + −', generate: orderSeven },
  { id: 'roots-8', grade: 8, title: 'Квадратные корни', navTitle: 'Квадратные корни', description: 'Корни из целых и дробных чисел, подкоренные выражения.', rule: 'Проверка квадратом', generate: squareRoots },
  { id: 'root-operations-8', grade: 8, title: 'Действия с квадратными корнями', navTitle: 'Действия с корнями', description: 'Сложение, умножение и совместные действия.', rule: 'Свойства корней', generate: rootOperations },
  { id: 'integer-powers-8', grade: 8, title: 'Степень с целым показателем', navTitle: 'Нулевая и отрицательная степень', description: 'Нулевой и отрицательный показатели.', rule: 'a⁻ⁿ = 1/aⁿ', generate: integerPowers },
  { id: 'rational-8', grade: 8, title: 'Рациональные выражения', navTitle: 'Рациональные выражения', description: 'Подстановка, разность квадратов и сокращение.', rule: 'Общий множитель', generate: rationalExpressions },
  { id: 'quadratic-8', grade: 8, title: 'Квадратные уравнения', navTitle: 'Квадратные уравнения', description: 'Неполные уравнения, нулевое произведение и дискриминант.', rule: 'Два корня и дискриминант', generate: quadraticEquations },
  { id: 'order-8', grade: 8, title: 'Порядок действий с корнями и степенями', navTitle: 'Порядок действий', description: 'Многошаговые выражения с корнями и степенями.', rule: 'Корни и степени раньше + и −', generate: orderEight },
  { id: 'scientific-9', grade: 9, title: 'Стандартный вид числа', navTitle: 'Стандартный вид', description: 'Вычисления со степенями десяти и малыми числами.', rule: 'Коэффициенты и показатели', generate: scientificNotation },
  { id: 'radicals-9', grade: 9, title: 'Квадратные и кубические корни', navTitle: 'Корни', description: 'Совместные действия с корнями разных степеней.', rule: 'Определение корня', generate: radicalsNine },
  { id: 'progressions-9', grade: 9, title: 'Арифметическая и геометрическая прогрессии', navTitle: 'Прогрессии', description: 'Вычисление n-го члена по формуле.', rule: 'aₙ и bₙ', generate: progressions },
  { id: 'functions-9', grade: 9, title: 'Значение квадратичной функции', navTitle: 'Значение функции', description: 'Подстановка аргумента и вычисление по формуле.', rule: 'Аргумент и значение', generate: functionsNine },
  { id: 'trig-9', grade: 9, title: 'Тригонометрические вычисления', navTitle: 'Тригонометрия', description: 'Синус, косинус и тангенс углов 30°, 45°, 60°.', rule: 'Табличные значения', generate: trigonometry },
  { id: 'order-9', grade: 9, title: 'Комплексный порядок действий', navTitle: 'Порядок действий', description: 'Корни, отрицательные степени, скобки и дроби.', rule: 'Весь порядок действий', generate: orderNine },
]
