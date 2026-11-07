interface CompetitionTask {
  expression: string;
  answer: number;
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomGenerator(seed: string) {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const superscript = (value: number) => String(value).replace(/\d/g, (digit) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(digit)]);

export function createCompetitionTasks(seed: string, grade: number, difficulty: "medium" | "hard", count = 10): CompetitionTask[] {
  const random = randomGenerator(`${seed}:${grade}:${difficulty}`);
  const integer = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;
  const choose = <T,>(values: T[]) => values[integer(0, values.length - 1)];
  const boost = difficulty === "hard" ? 1 : 0;

  return Array.from({ length: count }, (_, index) => {
    if (grade === 4) {
      const kind = index % 3;
      if (kind === 0) {
        const a = integer(3, 9 + boost * 3), b = integer(4, 12 + boost * 4);
        return { expression: `${a} × ${b}`, answer: a * b };
      }
      if (kind === 1) {
        const divisor = integer(3, 9 + boost * 2), answer = integer(4, 12 + boost * 3);
        return { expression: `${divisor * answer} : ${divisor}`, answer };
      }
      const a = integer(8, 35), b = integer(3, 9), c = integer(3, 9);
      return { expression: `${a} + ${b} × ${c}`, answer: a + b * c };
    }

    if (grade === 5) {
      const kind = index % 3;
      if (kind === 0) {
        const denominator = choose([2, 4, 5, 8, 10]);
        const whole = denominator * integer(3, 9 + boost * 2);
        const numerator = integer(1, denominator - 1);
        return { expression: `${numerator}/${denominator} от ${whole}`, answer: whole * numerator / denominator };
      }
      if (kind === 1) {
        const a = integer(12, 65) / 10, b = integer(12, 55) / 10;
        return { expression: `${String(a).replace(".", ",")} + ${String(b).replace(".", ",")}`, answer: Math.round((a + b) * 10) / 10 };
      }
      const a = integer(3, 9), b = integer(4, 12), c = integer(2, 8);
      return { expression: `(${a} + ${b}) × ${c}`, answer: (a + b) * c };
    }

    if (grade === 6) {
      const kind = index % 3;
      const a = integer(-12 - boost * 4, 12 + boost * 4) || 3;
      const b = integer(-9, 9) || -2;
      if (kind === 0) return { expression: `(${a}) + (${b})`, answer: a + b };
      if (kind === 1) return { expression: `(${a}) × (${b})`, answer: a * b };
      const c = integer(3, 9);
      return { expression: `(${a}) − (${b}) × ${c}`, answer: a - b * c };
    }

    if (grade === 7) {
      const kind = index % 3;
      if (kind === 0) {
        const m = integer(1, 3), n = integer(1, 2);
        const base = choose([2, 3, 4, 5].filter((value) => value ** (m + n) <= 512));
        return { expression: `${base}${superscript(m)} × ${base}${superscript(n)}`, answer: base ** (m + n) };
      }
      if (kind === 1) {
        const x = integer(-7, 8) || 2, a = integer(2, 7), b = integer(-8, 9);
        return { expression: `${a}x ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${a * x + b}. Найди x`, answer: x };
      }
      const base = integer(2, 7), c = integer(2, 6), a = integer(3, 12);
      return { expression: `${a} + ${base}² × ${c}`, answer: a + base ** 2 * c };
    }

    if (grade === 8) {
      const kind = index % 3;
      const a = integer(2, 12 + boost * 3), b = integer(2, 10);
      if (kind === 0) return { expression: `√${a ** 2} + √${b ** 2}`, answer: a + b };
      if (kind === 1) return { expression: `√${a ** 2} × ${b} − ${a}`, answer: a * b - a };
      const c = integer(2, 8);
      return { expression: `(${a} + ${b})² − ${c} × ${a} × ${b}`, answer: (a + b) ** 2 - c * a * b };
    }

    const kind = index % 3;
    if (kind === 0) {
      const first = integer(-4, 9), difference = integer(2, 8), n = integer(4, 9 + boost * 2);
      return { expression: `a₁ = ${first}, d = ${difference}. Найди a${superscript(n)}`, answer: first + (n - 1) * difference };
    }
    if (kind === 1) {
      const a = choose([-2, -1, 1, 2, 3]), b = integer(-5, 5), c = integer(-6, 6), x = integer(-3, 4);
      return { expression: `f(x) = ${a}x² ${b < 0 ? "−" : "+"} ${Math.abs(b)}x ${c < 0 ? "−" : "+"} ${Math.abs(c)}. Найди f(${x})`, answer: a * x ** 2 + b * x + c };
    }
    const root = integer(2, 12), multiplier = integer(2, 7);
    return { expression: `√${root ** 2} × ${multiplier} + ${root}`, answer: root * multiplier + root };
  });
}

export function competitionAnswerMatches(input: string, expected: number) {
  const normalized = input.trim().replace(/−/g, "-").replace(/\s+/g, "").replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return false;
  const value = Number(normalized);
  return Number.isFinite(value) && Math.abs(value - expected) <= 1e-9;
}
