// Сюжетный слой «Тысячи огней»: главы, открываемые делом — прогрессом.
// Тон: лиричный, в духе Экзюпери. Короткие абзацы, уважение к читателю,
// никаких «ты должен» и сравнений с другими. Сюжет — награда, не стена.

export interface StoryChapter {
  id: string;
  title: string;
  /** Короткие абзацы главы. */
  paragraphs: string[];
  /** Финальная строка-голограмма Наблюдателя. */
  observerLine: string;
  /** Ключ иллюстрации в src/assets/story/. */
  art: string;
}

export interface StoryStats {
  bestStreak: number;
  /** Освоенные сектора текущего класса. */
  masteredCount: number;
  /** Всего секторов в текущем классе. */
  totalTopics: number;
  /** Кубки с космических гонок. */
  trophies: number;
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: "lantern",
    title: "Фонарщик",
    paragraphs: [
      "На твоей планете зажёгся первый фонарь. Он маленький — пять ответов подряд, — но теперь по эту сторону планеты есть свет, который горит ночью.",
      "Один фонарщик меняет ночь больше, чем сто советов о том, какая она тёмная.",
      "Фонари не спрашивают, зачем гореть. Они горят — и дорога появляется сама.",
    ],
    observerLine:
      "Видел вспышку со станции. Продолжай — я покажу, сколько фонарей умещается на одной планете.",
    art: "lantern",
  },
  {
    id: "constellation",
    title: "Первое созвездие",
    paragraphs: [
      "Сектор освоен — и над планетой встало первое созвездие. Теперь этот кусочек неба навсегда твой: ты зажёг его сам, задачами и точностью.",
      "Звёзды не загораются сами. Каждая где-то когда-то была чьей-то решённой задачей.",
      "Помнишь, как этот сектор казался тёмным? Тьма — это просто место, где ещё не был твой свет.",
    ],
    observerLine:
      "Первое созвездие — всегда самое важное. Оно доказывает, что карта настоящая.",
    art: "constellation",
  },
  {
    id: "neighbors",
    title: "Соседи",
    paragraphs: [
      "С космодрома видно то, что с планеты не разглядеть: рядом летят другие планеты. У каждой — свой свет, свой лес, свои фонари.",
      "Гонки — не про то, кто быстрее. Они про то, чтобы увидеть: ты не единственный хранитель. Таких, как ты, целый экипаж.",
      "Чужие планеты не конкуренты. Они — доказательство, что галактика ещё вспыхнет.",
    ],
    observerLine:
      "Когда-то я тоже думал, что хранитель один. Хорошо, что мы оба ошибались.",
    art: "neighbors",
  },
  {
    id: "halfway",
    title: "Посреди галактики",
    paragraphs: [
      "Половина карты горит. Посмотри назад: путь уже не вернуть — он весь в свете, который ты оставил за собой.",
      "Дальше сектора труднее. Но у тебя есть то, чего не было в начале: доказательство, что ты умеешь зажигать.",
      "Галактика не торопит. Она просто ждёт остальные огни.",
    ],
    observerLine:
      "Я давно смотрю на эту карту. Половина сияния — моё любимое место каждой истории.",
    art: "halfway",
  },
  {
    id: "fullshine",
    title: "Полное сияние",
    paragraphs: [
      "Вся галактика горит. Каждый сектор, каждая звезда — твоими руками.",
      "Помнишь первую ночь? Ты пришёл к маленькой тёмной планете и зажёг один фонарь. Теперь её свет видно со станции без телескопа.",
      "Карта закрыта, но свет не кончается. Он просто переходит в другие руки.",
    ],
    observerLine:
      "Теперь ты знаешь, как выращивать свет. Это умение останется с тобой — для всего, что захочешь вырастить дальше.",
    art: "fullshine",
  },
];

/** Какие главы открыты при такой статистике. Порядок = порядок в книге. */
export function unlockedChapterIds(stats: StoryStats): string[] {
  const unlocked: string[] = [];
  if (stats.bestStreak >= 5) unlocked.push("lantern");
  if (stats.masteredCount >= 1) unlocked.push("constellation");
  if (stats.trophies >= 1) unlocked.push("neighbors");
  if (stats.totalTopics > 0 && stats.masteredCount >= Math.ceil(stats.totalTopics / 2))
    unlocked.push("halfway");
  if (stats.totalTopics > 0 && stats.masteredCount >= stats.totalTopics)
    unlocked.push("fullshine");
  return unlocked;
}

/** Первая открытая, но ещё не прочитанная глава — её показываем заставкой. */
export function nextUnreadChapter(stats: StoryStats, readIds: readonly string[]): StoryChapter | null {
  const unlocked = new Set(unlockedChapterIds(stats));
  const read = new Set(readIds);
  return STORY_CHAPTERS.find(chapter => unlocked.has(chapter.id) && !read.has(chapter.id)) ?? null;
}

export function getChapter(id: string): StoryChapter | undefined {
  return STORY_CHAPTERS.find(chapter => chapter.id === id);
}

const STORAGE_KEY = "schitalka-story-read-v1";

export function loadReadChapters(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function saveReadChapters(ids: readonly string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    // приватный режим — главы просто откроются заново
  }
}
