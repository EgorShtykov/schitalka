import { useEffect } from "react";
import { BookOpenText } from "lucide-react";
import type { StoryChapter } from "../story/chapters";
import { STORY_ART } from "../story/art";
import observerHello from "../assets/avatar/observer-hello.webp";
import "./ChapterView.css";

interface ChapterViewProps {
  chapter: StoryChapter;
  /** true — глава открылась впервые (торжественный показ); false — перечитывание из дневника. */
  firstRead: boolean;
  onClose: () => void;
}

/** Полноэкранная заставка сюжетной главы: иллюстрация, текст, строка Наблюдателя. */
export function ChapterView({ chapter, firstRead, onClose }: ChapterViewProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="chapter-overlay" role="dialog" aria-modal="true" aria-label={`Глава «${chapter.title}»`}>
      <div className="chapter-card">
        <div className="chapter-art-wrap">
          <img className="chapter-art" src={STORY_ART[chapter.art]} alt="" />
          <div className="chapter-art-fade" aria-hidden="true" />
        </div>
        <div className="chapter-body">
          <p className="chapter-kicker">
            <BookOpenText size={14} aria-hidden="true" />
            {firstRead ? "Новая глава" : "Дневник хранителя"}
          </p>
          <h2 className="chapter-title">{chapter.title}</h2>
          {chapter.paragraphs.map((paragraph, index) => (
            <p key={index} className="chapter-paragraph" style={{ animationDelay: `${0.25 + index * 0.35}s` }}>
              {paragraph}
            </p>
          ))}
          <div className="chapter-observer">
            <img src={observerHello} alt="Наблюдатель" />
            <p>{chapter.observerLine}</p>
          </div>
          <button type="button" className="chapter-close" onClick={onClose} autoFocus>
            В дневник хранителя
          </button>
        </div>
      </div>
    </div>
  );
}
