const superscripts: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁻': '-', '⁺': '+', 'ⁿ': 'n', 'ᵐ': 'm',
}
const subscripts: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', 'ₙ': 'n',
}
const superscriptChars = Object.keys(superscripts).join('')
const subscriptChars = Object.keys(subscripts).join('')
const atomPattern = /[A-Za-z0-9.,]/
const isAtom = (char: string | undefined) => Boolean(char && (
  atomPattern.test(char) || superscripts[char] || subscripts[char]
))

function matchingParenthesis(text: string, open: number) {
  let depth = 0
  for (let index = open; index < text.length; index++) {
    if (text[index] === '(') depth++
    if (text[index] === ')') {
      depth--
      if (depth === 0) return index
    }
  }
  return -1
}

function leftOperandStart(text: string, index: number) {
  let end = index
  while (end > 0 && /\s/.test(text[end - 1])) end--
  if (!end) return -1
  let start = end
  if (text[end - 1] === ')') {
    let depth = 0
    for (let cursor = end - 1; cursor >= 0; cursor--) {
      if (text[cursor] === ')') depth++
      if (text[cursor] === '(') {
        depth--
        if (depth === 0) {
          start = cursor
          break
        }
      }
    }
    if (start === end) return -1
    while (start > 0 && isAtom(text[start - 1])) start--
  } else {
    while (start > 0 && isAtom(text[start - 1])) start--
  }
  if (start > 0 && (text[start - 1] === '√' || text[start - 1] === '∛')) start--
  if (start > 0 && (text[start - 1] === '−' || text[start - 1] === '-')) start--
  return start
}

function rightOperandEnd(text: string, index: number) {
  let start = index
  while (start < text.length && /\s/.test(text[start])) start++
  if (start >= text.length) return -1
  let cursor = start
  if (text[cursor] === '√' || text[cursor] === '∛') cursor++
  if (text[cursor] === '(') {
    const close = matchingParenthesis(text, cursor)
    if (close < 0) return -1
    cursor = close + 1
  } else {
    while (cursor < text.length && isAtom(text[cursor])) cursor++
  }
  while (cursor < text.length && superscripts[text[cursor]]) cursor++
  return cursor
}

function replaceWithFractions(text: string, operator: string) {
  let result = ''
  let cursor = 0
  let search = 0
  while (search < text.length) {
    const index = text.indexOf(operator, search)
    if (index < 0) break
    const left = leftOperandStart(text, index)
    const rightIndex = index + operator.length
    const right = rightOperandEnd(text, rightIndex)
    if (left < cursor || left < 0 || right < 0) {
      search = rightIndex
      continue
    }
    const numerator = text.slice(left, index).trim()
    const denominator = text.slice(rightIndex, right).trim()
    if (!numerator || !denominator || /[А-Яа-яЁё]/.test(numerator + denominator)) {
      search = rightIndex
      continue
    }
    result += `${text.slice(cursor, left)}\\frac{${numerator}}{${denominator}}`
    cursor = right
    search = right
  }
  return result + text.slice(cursor)
}

function replaceRadicals(text: string) {
  let result = ''
  let cursor = 0
  let search = 0
  while (search < text.length) {
    const square = text.indexOf('√', search)
    const cube = text.indexOf('∛', search)
    const index = square < 0 ? cube : cube < 0 ? square : Math.min(square, cube)
    if (index < 0) break
    const cubeRoot = text[index] === '∛'
    const start = index + 1
    let end = start
    let radicand = ''
    if (text[start] === '(') {
      const close = matchingParenthesis(text, start)
      if (close > 0) {
        radicand = text.slice(start + 1, close)
        end = close + 1
      }
    } else {
      while (end < text.length && isAtom(text[end])) end++
      radicand = text.slice(start, end)
    }
    if (!radicand) {
      search = start
      continue
    }
    result += text.slice(cursor, index)
    result += cubeRoot ? `\\sqrt[3]{${radicand}}` : `\\sqrt{${radicand}}`
    cursor = end
    search = end
  }
  return result + text.slice(cursor)
}

export function mathToTex(source: string) {
  let text = replaceWithFractions(source, ' : ')
  text = replaceWithFractions(text, '/')
  text = replaceRadicals(text)
  text = text.replace(new RegExp(`[${superscriptChars}]+`, 'g'), (run) =>
    `^{${run.split('').map((char) => superscripts[char]).join('')}}`,
  )
  text = text.replace(new RegExp(`[${subscriptChars}]+`, 'g'), (run) =>
    `_{${run.split('').map((char) => subscripts[char]).join('')}}`,
  )
  text = text
    .replace(/(\d),(\d)/g, '$1{,}$2')
    .replace(/\b(sin|cos|tan)\b/g, '\\$1')
    .replace(/×/g, '\\times')
    .replace(/·/g, '\\cdot')
    .replace(/−/g, '-')
    .replace(/≠/g, '\\ne')
    .replace(/≥/g, '\\ge')
    .replace(/≤/g, '\\le')
    .replace(/±/g, '\\pm')
    .replace(/→/g, '\\to')
    .replace(/°/g, '^{\\circ}')
    .replace(/%/g, '\\%')
    .replace(/[А-Яа-яЁё]+/g, (word) => `\\text{${word}}`)
    .replace(/\s+/g, '\\ ')
  return text
}

export function hasAdvancedNotation(text: string) {
  return /[√∛]/.test(text) || text.includes(' : ') || /[A-Za-z0-9⁰-⁹₀-₉]\/[A-Za-z0-9(]/.test(text)
}

