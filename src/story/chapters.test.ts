import { describe, expect, it } from "vitest";
import { nextUnreadChapter, unlockedChapterIds, STORY_CHAPTERS } from "./chapters";

const base = { bestStreak: 0, masteredCount: 0, totalTopics: 8, trophies: 0 };

describe("story chapters", () => {
  it("в начале пути главы закрыты", () => {
    expect(unlockedChapterIds(base)).toEqual([]);
  });

  it("первая серия открывает «Фонарщика»", () => {
    expect(unlockedChapterIds({ ...base, bestStreak: 5 })).toEqual(["lantern"]);
  });

  it("полный путь открывает все главы по порядку", () => {
    const stats = { bestStreak: 12, masteredCount: 8, totalTopics: 8, trophies: 2 };
    expect(unlockedChapterIds(stats)).toEqual(
      STORY_CHAPTERS.map(chapter => chapter.id),
    );
  });

  it("«Посреди галактики» — от половины секторов", () => {
    expect(unlockedChapterIds({ ...base, masteredCount: 4 })).toEqual([
      "constellation",
      "halfway",
    ]);
    expect(unlockedChapterIds({ ...base, masteredCount: 3 })).toEqual([
      "constellation",
    ]);
  });

  it("nextUnreadChapter пропускает прочитанные", () => {
    const stats = { ...base, bestStreak: 6, masteredCount: 1 };
    expect(nextUnreadChapter(stats, [])?.id).toBe("lantern");
    expect(nextUnreadChapter(stats, ["lantern"])?.id).toBe("constellation");
    expect(nextUnreadChapter(stats, ["lantern", "constellation"])).toBeNull();
  });

  it("nextUnreadChapter не показывает закрытые главы", () => {
    expect(nextUnreadChapter(base, [])).toBeNull();
  });
});
