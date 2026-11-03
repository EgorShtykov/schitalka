import { chance, fmt, fraction, pick, problem, randInt, signed, sup } from './math'
import type { Difficulty, Problem, Topic } from './math'

const level = (difficulty: Difficulty) => difficulty === 'easy' ? 0 : difficulty === 'medium' ? 1 : 2

export const missingNumbers = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const kind = pick(l === 0 ? ['add', 'subtract'] : l === 1 ? ['add', 'multiply', 'divide'] : ['subtract', 'multiply', 'divide'])
  if (kind === 'add') {
    const x = randInt(7, 40 + l * 30), a = randInt(5, 60 + l * 40)
    return problem(`${a} + x = ${a + x}`, x, [`Неизвестное слагаемое: x = ${a + x} − ${a}.`, `x = ${x}. Проверка: ${a} + ${x} = ${a + x}.`], 'Ребус решается обратным действием. После ответа подставь число вместо x и проверь равенство.', { instruction: 'Восстанови пропущенное число' })
  }
  if (kind === 'subtract') {
    const x = randInt(20, 70 + l * 30), a = randInt(5, 19 + l * 10)
    const fromMinuend = chance()
    if (fromMinuend) return problem(`x − ${a} = ${x - a}`, x, [`x = ${x - a} + ${a}.`, `x = ${x}.`], 'Уменьшаемое находим сложением: разность + вычитаемое.', { instruction: 'Восстанови пропущенное число' })
    const minuend = x + a
    return problem(`${minuend} − x = ${x}`, a, [`x = ${minuend} − ${x}.`, `x = ${a}.`], 'Вычитаемое находим вычитанием: уменьшаемое − разность.', { instruction: 'Восстанови пропущенное число' })
  }
  if (kind === 'multiply') {
    const x = randInt(3, 12 + l * 4), a = randInt(3, 15 + l * 5)
    return problem(`${a} × x = ${a * x}`, x, [`x = ${a * x} : ${a}.`, `x = ${x}.`], 'Неизвестный множитель равен произведению, делённому на известный множитель.', { instruction: 'Восстанови пропущенное число' })
  }
  const x = randInt(3, 15 + l * 5), divisor = randInt(3, 12)
  const dividend = x * divisor
  return problem(`${dividend} : x = ${divisor}`, x, [`x = ${dividend} : ${divisor}.`, `x = ${x}. Проверка: ${dividend} : ${x} = ${divisor}.`], 'Делитель равен делимому, делённому на частное.', { instruction: 'Восстанови пропущенное число' })
}

export const wordProblemsFour = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const kind = pick(l === 0 ? ['shop', 'books', 'trip'] : l === 1 ? ['boxes', 'shop', 'craft'] : ['boxes', 'craft', 'trip'])
  if (kind === 'shop') {
    const price = randInt(3, 12 + l * 5) * 10, quantity = randInt(2, 4 + l), paid = Math.ceil(price * quantity / 100 + 1) * 100
    const answer = paid - price * quantity
    return problem(`Тетрадь стоит ${price} ₽. Купили ${quantity} тетради и заплатили ${paid} ₽. Сколько рублей сдачи получили?`, answer, [`1) Стоимость покупки: ${price} × ${quantity} = ${price * quantity} ₽.`, `2) Сдача: ${paid} − ${price * quantity} = ${answer} ₽.`], 'В текстовой задаче сначала найди стоимость всей покупки, затем сдачу.', { instruction: 'Реши задачу', answerHint: 'Только число, без знака ₽' })
  }
  if (kind === 'books') {
    const total = randInt(8, 20 + l * 10) * 10, read = randInt(2, total / 10 - 2) * 10
    return problem(`В книге ${total} страниц. Ученик прочитал ${read} страниц. Сколько страниц осталось прочитать?`, total - read, [`Осталось: ${total} − ${read} = ${total - read} страниц.`], 'Остаток равен разности целого и уже выполненной части.', { instruction: 'Реши задачу', answerHint: 'Ответ в страницах, только число' })
  }
  if (kind === 'boxes') {
    const boxes = randInt(3, 7 + l), perBox = randInt(8, 18 + l * 5), moved = randInt(2, boxes - 1)
    const answer = (boxes - moved) * perBox
    return problem(`В ${boxes} коробках по ${perBox} карандашей. ${moved} коробки убрали в шкаф. Сколько карандашей осталось снаружи?`, answer, [`1) Осталось коробок: ${boxes} − ${moved} = ${boxes - moved}.`, `2) Карандашей: ${boxes - moved} × ${perBox} = ${answer}.`], 'Сначала определи, сколько целых групп осталось, а затем умножь на размер группы.', { instruction: 'Реши задачу' })
  }
  if (kind === 'craft') {
    const perItem = randInt(3, 8 + l), items = randInt(4, 9 + l), used = randInt(2, perItem * items - 2)
    const answer = perItem * items - used
    return problem(`Для одной поделки нужно ${perItem} м ленты. Хотят сделать ${items} поделки. Уже отрезали ${used} м. Сколько метров ленты ещё понадобится?`, answer, [`1) На все поделки: ${perItem} × ${items} = ${perItem * items} м.`, `2) Ещё нужно: ${perItem * items} − ${used} = ${answer} м.`], 'Найди общую потребность и вычти уже использованное количество.', { instruction: 'Реши задачу', answerHint: 'Ответ в метрах' })
  }
  const speed = randInt(4, 9 + l) * 10, firstTime = randInt(2, 4 + l), secondTime = randInt(1, 3)
  const answer = speed * (firstTime + secondTime)
  return problem(`Туристы шли ${firstTime} ч до привала и ${secondTime} ч после него со скоростью ${speed} км/ч. Какое расстояние они прошли?`, answer, [`1) Общее время: ${firstTime} + ${secondTime} = ${firstTime + secondTime} ч.`, `2) Расстояние: ${speed} × ${firstTime + secondTime} = ${answer} км.`], 'Если скорость одинакова, можно сначала сложить время, а затем умножить на скорость.', { instruction: 'Реши задачу', answerHint: 'Ответ в километрах' })
}

export const averages = (difficulty: Difficulty): Problem => {
  const l = level(difficulty)
  const count = [3, 4, 5][l]
  const answer = l === 2 ? randInt(15, 65) / 2 : randInt(4, 20 + l * 8)
  const values = Array.from({ length: count - 1 }, () => l === 2 ? randInt(10, 80) / 2 : randInt(2, 28 + l * 8))
  const last = answer * count - values.reduce((sum, value) => sum + value, 0)
  if (last < 0) return averages(difficulty)
  values.push(last)
  const sum = values.reduce((total, value) => total + value, 0)
  return problem(`${values.map((value) => fmt(value)).join('; ')}`, answer, [`1) Сумма: ${values.map((value) => fmt(value)).join(' + ')} = ${fmt(sum)}.`, `2) Среднее: ${fmt(sum)} : ${count} = ${fmt(answer)}.`], 'Среднее арифметическое = сумма всех значений : их количество.', { instruction: 'Найди среднее арифметическое', answerHint: 'Можно ввести десятичную дробь' })
}

export const fractionOfNumber = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const d = pick(l === 0 ? [2, 4, 5] : [3, 4, 5, 6, 8]), n = randInt(1, d - 1)
  if (l === 2 && chance()) {
    const answer = d * randInt(3, 12), part = answer * n / d
    return problem(`${n}/${d} числа равны ${fmt(part)}. Найди число.`, answer, [`1) Одна часть: ${fmt(part)} : ${n} = ${fmt(part / n)}.`, `2) Всё число: ${fmt(part / n)} × ${d} = ${fmt(answer)}.`], 'По известной дробной части сначала найди одну долю, затем всё число.', { instruction: 'Найди число по его части' })
  }
  const base = d * randInt(3, 15 + l * 5), answer = base * n / d
  return problem(`${n}/${d} от ${base}`, answer, [`1) Одна доля: ${base} : ${d} = ${base / d}.`, `2) Таких долей ${n}: ${base / d} × ${n} = ${fmt(answer)}.`], 'Чтобы найти дробь от числа, раздели число на знаменатель и умножь на числитель.', { instruction: 'Найди часть числа' })
}

export const absoluteValues = (difficulty: Difficulty) => {
  const l = level(difficulty)
  if (l === 2) {
    const center = randInt(-8, 8), distance = randInt(2, 9)
    const roots = [center - distance, center + distance]
    return problem(`|x − (${signed(center)})| = ${distance}`, roots, [`Выражение внутри модуля равно ${distance} или −${distance}.`, `x − (${signed(center)}) = ${distance} → x = ${roots[1]}; x − (${signed(center)}) = −${distance} → x = ${roots[0]}.`], 'Уравнение |A| = a при a > 0 распадается на два: A = a и A = −a.', { instruction: 'Найди оба значения x', answerHint: 'Два ответа через точку с запятой' })
  }
  const a = randInt(-25 - l * 20, -2), b = randInt(3, 18 + l * 10)
  if (l === 0) return problem(`|${signed(a)}| + |${b}|`, Math.abs(a) + b, [`|${signed(a)}| = ${Math.abs(a)}; |${b}| = ${b}.`, `${Math.abs(a)} + ${b} = ${Math.abs(a) + b}.`], 'Модуль числа — расстояние до нуля, поэтому он всегда неотрицателен.')
  return problem(`|${signed(a)} × ${b}| − |${signed(a)}|`, Math.abs(a * b) - Math.abs(a), [`1) |${signed(a)} × ${b}| = ${Math.abs(a * b)}; |${signed(a)}| = ${Math.abs(a)}.`, `2) ${Math.abs(a * b)} − ${Math.abs(a)} = ${Math.abs(a * b) - Math.abs(a)}.`], 'Сначала вычисли выражение внутри модуля, затем уберите знак модуля.')
}

export const percentProblems = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const percent = pick(l === 0 ? [10, 20, 25, 50] : [5, 12, 15, 20, 30, 40])
  const kind = pick(l === 0 ? ['discount', 'class'] : l === 1 ? ['discount', 'increase', 'class'] : ['reverse', 'increase', 'discount'])
  if (kind === 'reverse') {
    const original = randInt(8, 30) * 100, part = original * percent / 100
    return problem(`После скидки ${percent}% покупатель сэкономил ${fmt(part)} ₽. Какова первоначальная цена товара?`, original, [`1% цены: ${fmt(part)} : ${percent} = ${fmt(part / percent)} ₽.`, `Вся цена: ${fmt(part / percent)} × 100 = ${fmt(original)} ₽.`], 'Известная экономия — это процент от первоначальной цены. Найди целое по его проценту.', { instruction: 'Реши процентную задачу', answerHint: 'Ответ в рублях' })
  }
  const base = randInt(5, 24 + l * 8) * 100, change = base * percent / 100
  if (kind === 'increase') {
    return problem(`Цена абонемента ${base} ₽ выросла на ${percent}%. Какова новая цена?`, base + change, [`1) Повышение: ${base} × ${percent}/100 = ${fmt(change)} ₽.`, `2) Новая цена: ${base} + ${fmt(change)} = ${fmt(base + change)} ₽.`], 'При увеличении на процент сначала найди величину изменения, затем прибавь её к исходному значению.', { instruction: 'Реши процентную задачу', answerHint: 'Ответ в рублях' })
  }
  if (kind === 'class') {
    const absentPercent = pick([10, 20, 25, 50])
    const students = randInt(3, 8) * 20, present = students * (100 - absentPercent) / 100
    return problem(`В классе ${students} учеников. ${absentPercent}% отсутствуют. Сколько учеников присутствует?`, present, [`1) Отсутствует: ${students} × ${absentPercent}/100 = ${students - present}.`, `2) Присутствует: ${students} − ${students - present} = ${present}.`], 'Можно найти отсутствующих и вычесть их из общего числа учеников.', { instruction: 'Реши процентную задачу' })
  }
  return problem(`Книга стоила ${base} ₽. На распродаже цену снизили на ${percent}%. Сколько стоит книга теперь?`, base - change, [`1) Скидка: ${base} × ${percent}/100 = ${fmt(change)} ₽.`, `2) Новая цена: ${base} − ${fmt(change)} = ${fmt(base - change)} ₽.`], 'При скидке вычитай найденный процент из первоначальной цены.', { instruction: 'Реши процентную задачу', answerHint: 'Ответ в рублях' })
}

export const identities = (difficulty: Difficulty) => {
  const l = level(difficulty)
  if (l === 0) {
    const a = randInt(12, 35), b = randInt(2, 11)
    return problem(`${a}² − ${b}²`, a * a - b * b, [`Разность квадратов: (${a} − ${b})(${a} + ${b}).`, `${a - b} × ${a + b} = ${a * a - b * b}.`], 'a² − b² = (a − b)(a + b). Формула часто сокращает вычисления.', { instruction: 'Вычисли удобным способом' })
  }
  if (l === 1) {
    const a = randInt(21, 69), b = randInt(2, 12)
    return problem(`(${a} + ${b})² − 2 × ${a} × ${b}`, a * a + b * b, [`(${a} + ${b})² = ${a}² + 2 × ${a} × ${b} + ${b}².`, `После вычитания остаётся ${a}² + ${b}² = ${a * a} + ${b * b} = ${a * a + b * b}.`], 'Квадрат суммы: (a + b)² = a² + 2ab + b².', { instruction: 'Вычисли по формуле' })
  }
  const base = pick([49, 51, 99, 101]), reference = base < 60 ? 50 : 100, delta = base - reference
  return problem(`${base}²`, base * base, [`Представь ${base} как ${reference} ${delta < 0 ? '−' : '+'} ${Math.abs(delta)}.`, `(${reference} ${delta < 0 ? '−' : '+'} ${Math.abs(delta)})² = ${reference ** 2} ${2 * reference * delta < 0 ? '−' : '+'} ${Math.abs(2 * reference * delta)} + ${delta ** 2} = ${base * base}.`], 'Ближайшее круглое число и квадрат суммы или разности помогают считать устно.', { instruction: 'Вычисли удобным способом' })
}

export const powerCombinations = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const base = pick(l === 2 ? [2, 3, 5] : [2, 3, 4, 5])
  const a = randInt(2, 4), b = randInt(1, 3), c = randInt(1, Math.min(a + b - 1, 3))
  if (l === 0) {
    return problem(`${base}${sup(a)} × ${base}${sup(b)}`, base ** (a + b), [`Показатели складываем: ${a} + ${b} = ${a + b}.`, `${base}${sup(a + b)} = ${base ** (a + b)}.`], 'Одинаковое основание позволяет сложить показатели вместо длинного умножения.', { instruction: 'Вычисли результат' })
  }
  if (l === 1) {
    return problem(`${base}${sup(a)} × ${base}${sup(b)} : ${base}${sup(c)}`, base ** (a + b - c), [`Суммарный показатель: ${a} + ${b} − ${c} = ${a + b - c}.`, `${base}${sup(a + b - c)} = ${base ** (a + b - c)}.`], 'При умножении показатели складываются, при делении — вычитаются.', { instruction: 'Вычисли результат' })
  }
  const n = randInt(2, 4), answer = base ** n + base ** (n - 1)
  return problem(`${base}${sup(n)} + ${base}${sup(n - 1)}`, answer, [`Вынеси ${base}${sup(n - 1)}: ${base}${sup(n - 1)} × (${base} + 1).`, `${base ** (n - 1)} × ${base + 1} = ${answer}.`], 'Общий множитель с меньшим показателем помогает упростить сумму степеней.', { instruction: 'Вычисли через общий множитель' })
}

export const vieta = (difficulty: Difficulty) => {
  const l = level(difficulty)
  const r1 = randInt(-8, 7), r2 = randInt(r1 + 1, 10)
  const b = -(r1 + r2), c = r1 * r2
  const equation = `x² ${b < 0 ? '−' : '+'} ${Math.abs(b)}x ${c < 0 ? '−' : '+'} ${Math.abs(c)} = 0`
  if (l === 0) {
    return problem(`${equation}. Найди сумму корней`, r1 + r2, [`По теореме Виета: x₁ + x₂ = −b.`, `Здесь b = ${b}, значит сумма корней ${r1 + r2}.`], 'Для x² + bx + c = 0 сумма корней равна −b, а произведение равно c.', { instruction: 'Примени теорему Виета' })
  }
  if (l === 1) {
    return problem(`${equation}. Найди произведение корней`, c, [`По теореме Виета: x₁ · x₂ = c.`, `Свободный член c = ${c}, значит произведение корней ${c}.`], 'Для приведённого квадратного уравнения произведение корней равно свободному члену.', { instruction: 'Примени теорему Виета' })
  }
  return problem(`Один корень уравнения ${equation} равен ${r1}. Найди второй корень`, r2, [`Сумма корней: −b = ${r1 + r2}.`, `Второй корень: ${r1 + r2} − (${r1}) = ${r2}.`], 'Если известен один корень, второй можно найти через сумму или произведение корней.', { instruction: 'Найди второй корень' })
}

export const rationalEquations = (difficulty: Difficulty): Problem => {
  const l = level(difficulty)
  if (l === 0) {
    const x = randInt(-6, 9), b = randInt(1, 8), c = randInt(2, 5)
    if (x + b === 0) return rationalEquations(difficulty)
    const a = c * (x + b)
    return problem(`${a} : (x + ${b}) = ${c}`, x, [`Умножь обе части на x + ${b} (при x ≠ ${-b}): ${a} = ${c}(x + ${b}).`, `${c}x = ${a - c * b}; x = ${x}. Знаменатель при этом не равен нулю.`], 'Перед решением дробного уравнения отметь, когда знаменатель равен нулю. После ответа сделай проверку.', { instruction: 'Реши уравнение' })
  }
  const x = randInt(-4, 10), b = randInt(1, 7), c = randInt(2, 4)
  if (x + b === 0) return rationalEquations(difficulty)
  const a = c * (x + b) - x
  return problem(`(x + ${a}) : (x + ${b}) = ${c}`, x, [`x + ${a} = ${c}(x + ${b}), при x ≠ ${-b}.`, `${c - 1}x = ${a - c * b}; x = ${x}. Проверка знаменателя: ${x + b} ≠ 0.`], 'После умножения на знаменатель получаем линейное уравнение, но ограничение на знаменатель сохраняется.', { instruction: 'Реши уравнение' })
}

export const progressionSums = (difficulty: Difficulty) => {
  const l = level(difficulty)
  if (l === 2 || chance(0.4)) {
    const a1 = randInt(1, 4), q = pick([2, 3, -2]), n = randInt(3, 5 + l)
    const answer = a1 * (1 - q ** n) / (1 - q)
    const last = a1 * q ** (n - 1)
    return problem(`Геометрическая прогрессия: b₁ = ${a1}, q = ${q}. Найди сумму первых ${n} членов`, answer, [`Формула: Sₙ = b₁(qⁿ − 1)/(q − 1).`, `S${n} = ${a1} × ((${q})${sup(n)} − 1) : (${q} − 1) = ${answer}.`, `Проверка: последний член b${n} = ${last}.`], 'Для суммы геометрической прогрессии используй формулу Sₙ = b₁(qⁿ − 1)/(q − 1), q ≠ 1.', { instruction: 'Найди сумму прогрессии' })
  }
  const a1 = randInt(-5, 12), d = randInt(2, 7) * (chance() ? 1 : -1), n = randInt(4, 8 + l * 2)
  const last = a1 + (n - 1) * d, answer = (a1 + last) * n / 2
  return problem(`Арифметическая прогрессия: a₁ = ${a1}, d = ${d}. Найди сумму первых ${n} членов`, answer, [`1) a${n} = ${a1} + (${n} − 1) × (${d}) = ${last}.`, `2) S${n} = (${a1} + ${last}) × ${n} : 2 = ${answer}.`], 'Сумма арифметической прогрессии: Sₙ = (a₁ + aₙ)n/2.', { instruction: 'Найди сумму прогрессии' })
}

export const probability = (difficulty: Difficulty) => {
  const l = level(difficulty)
  if (l === 0) {
    const faces = pick([4, 6, 8]), favorable = randInt(1, Math.floor(faces / 2))
    return problem(`На ${faces} карточках написаны разные числа, на ${favorable} из них — чётные. Наугад берут одну карточку. Какова вероятность выбрать чётное число?`, favorable / faces, [`Благоприятных исходов ${favorable}, всего исходов ${faces}.`, `P = ${favorable}/${faces} = ${fraction(favorable, faces)}.`], 'Вероятность = число благоприятных исходов : число всех равновозможных исходов.', { instruction: 'Найди вероятность', displayAnswer: fraction(favorable, faces), answerHint: 'Можно ввести дробь или десятичное число' })
  }
  if (l === 1) {
    const red = randInt(2, 7), blue = randInt(2, 8), total = red + blue
    return problem(`В коробке ${red} красных и ${blue} синих шаров. Наугад достают один шар. Какова вероятность достать красный?`, red / total, [`Всего шаров: ${red} + ${blue} = ${total}.`, `P = ${red}/${total} = ${fraction(red, total)}.`], 'Сначала найди общее число равновозможных исходов, затем долю благоприятных.', { instruction: 'Найди вероятность', displayAnswer: fraction(red, total), answerHint: 'Можно ввести дробь a/b' })
  }
  const first = pick([2, 3, 4, 6]), second = pick([2, 3, 4, 6]), answer = 1 / (first * second)
  return problem(`Бросают два одинаковых кубика. Вероятность нужного результата на каждом равна 1/${first} и 1/${second} соответственно. Найди вероятность, что оба события произойдут`, answer, [`События независимы, поэтому вероятности перемножаются.`, `P = 1/${first} × 1/${second} = 1/${first * second}.`], 'Вероятность совместного наступления независимых событий равна произведению их вероятностей.', { instruction: 'Найди вероятность двух событий', displayAnswer: `1/${first * second}`, answerHint: 'Ответ можно записать дробью' })
}

export const extraTopics: Topic[] = [
  { id: 'missing-4', grade: 4, title: 'Арифметические ребусы', navTitle: 'Числовые ребусы', description: 'Находи пропущенные числа и проверяй равенства обратным действием.', rule: 'Обратное действие + проверка', generate: missingNumbers },
  { id: 'word-problems-4', grade: 4, title: 'Текстовые задачи', navTitle: 'Текстовые задачи', description: 'Покупки, путешествия, книги и коробки — переводи сюжет в вычисления.', rule: 'Сюжет → два действия → ответ', generate: wordProblemsFour },
  { id: 'averages-5', grade: 5, title: 'Среднее арифметическое', navTitle: 'Среднее арифметическое', description: 'Сумма значений и количество: от целых чисел до десятичных дробей.', rule: 'Сумма : количество', generate: averages },
  { id: 'fraction-of-number-5', grade: 5, title: 'Дробь от числа', navTitle: 'Дробь от числа', description: 'Находи часть числа и восстанавливай целое по известной части.', rule: 'Доля и целое', generate: fractionOfNumber },
  { id: 'absolute-6', grade: 6, title: 'Модуль числа', navTitle: 'Модуль числа', description: 'Действия с модулями и уравнения с двумя решениями.', rule: 'Расстояние до нуля', generate: absoluteValues },
  { id: 'percent-problems-6', grade: 6, title: 'Процентные задачи', navTitle: 'Процентные задачи', description: 'Скидки, повышение цены и восстановление исходного значения.', rule: 'Процент от исходного числа', generate: percentProblems },
  { id: 'identities-7', grade: 7, title: 'Формулы сокращённого умножения', navTitle: 'Быстрые формулы', description: 'Разность квадратов и квадрат суммы для быстрых устных вычислений.', rule: 'Формула вместо длинного счёта', generate: identities },
  { id: 'power-combinations-7', grade: 7, title: 'Степенные комбинации', navTitle: 'Степенные комбинации', description: 'Несколько действий со степенями и общий множитель.', rule: 'Показатели и общий множитель', generate: powerCombinations },
  { id: 'vieta-8', grade: 8, title: 'Теорема Виета', navTitle: 'Теорема Виета', description: 'Сумма и произведение корней, поиск второго корня без дискриминанта.', rule: 'x₁ + x₂ = −b; x₁x₂ = c', generate: vieta },
  { id: 'rational-equations-8', grade: 8, title: 'Дробные рациональные уравнения', navTitle: 'Дробные уравнения', description: 'Переход к линейному уравнению и обязательная проверка знаменателя.', rule: 'Знаменатель ≠ 0', generate: rationalEquations },
  { id: 'progression-sums-9', grade: 9, title: 'Сумма членов прогрессии', navTitle: 'Сумма прогрессии', description: 'Арифметические и геометрические суммы по формулам.', rule: 'Sₙ для двух прогрессий', generate: progressionSums },
  { id: 'probability-9', grade: 9, title: 'Вероятность события', navTitle: 'Вероятность', description: 'Равновозможные исходы, доля благоприятных и независимые события.', rule: 'Благоприятные : все исходы', generate: probability },
]
