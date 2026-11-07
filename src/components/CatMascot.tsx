interface CatMascotProps {
  happy?: boolean;
  themeId?: string;
}

export function CatMascot({ happy = false, themeId = "classic" }: CatMascotProps) {
  return (
    <svg className={`cat-mascot cat-${themeId}`} viewBox="0 0 120 100" role="img" aria-label={happy ? "Довольный кот" : "Кот-думатель"}>
      {themeId === "cosmic" && (
        <g className="cat-accessory helmet-back">
          <circle cx="60" cy="52" r="45" fill="var(--paper)" fillOpacity=".16" stroke="var(--orange)" strokeWidth="2.5" />
          <path d="M60 7V1m-4 0h8" fill="none" stroke="var(--orange)" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
      <path d="M29 39 24 12l22 14c9-4 20-4 29 0l22-14-5 28c7 9 8 24 2 35-8 15-24 20-35 20S35 90 28 75c-6-12-5-27 1-36Z" fill="var(--blue-cat)" stroke="var(--green)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32 24l2 13 9-8-11-5Zm56 0-2 13-9-8 11-5Z" fill="var(--blush)" />
      <path d="M42 54h12m12 0h12" fill="none" stroke="var(--brown)" strokeWidth="3" strokeLinecap="round" />
      {happy ? (
        <>
          <path d="m45 52 4 4 4-4m14 0 4 4 4-4" fill="none" stroke="var(--brown)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M51 68c5 7 13 7 18 0" fill="none" stroke="var(--brown)" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="49" cy="53" r="2.5" fill="var(--brown)" />
          <circle cx="71" cy="53" r="2.5" fill="var(--brown)" />
          <path d="M54 70c4-3 8-3 12 0" fill="none" stroke="var(--brown)" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}
      <path d="m60 60-4 3h8l-4-3Z" fill="var(--blush)" />
      <path d="M39 63 17 60m22 8-21 3m63-8 22-3M81 68l21 3" fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" />
      {themeId === "sakura-neon" && (
        <g className="cat-accessory" fill="none" stroke="var(--orange)" strokeWidth="4" strokeLinecap="round">
          <path d="M31 42c-5-33 57-44 65-5" />
          <path d="M28 39v19m68-22v19" strokeWidth="8" />
          <path d="M31 57c9 19 51 23 64 1" strokeWidth="2" strokeDasharray="2 5" />
        </g>
      )}
      {themeId === "noir" && (
        <g className="cat-accessory" fill="var(--brown)" stroke="var(--light-green)" strokeWidth="1.5">
          <rect x="37" y="44" width="20" height="15" rx="5" />
          <rect x="63" y="44" width="20" height="15" rx="5" />
          <path d="M57 49h6" fill="none" stroke="var(--brown)" strokeWidth="3" />
        </g>
      )}
      {themeId === "mint-comic" && (
        <path className="cat-accessory" d="m88 15 3 7 8 .6-6 5 2 8-7-4-7 4 2-8-6-5 8-.6Z" fill="var(--gold)" stroke="var(--green)" strokeWidth="2" strokeLinejoin="round" />
      )}
      {themeId === "cosmic" && (
        <g className="cat-accessory" fill="none" stroke="var(--orange)" strokeWidth="2.5">
          <path d="M19 65c8 23 69 34 84-4" strokeLinecap="round" />
          <path d="M25 77c19 14 51 15 69 0" stroke="var(--paper)" strokeWidth="5" strokeLinecap="round" />
        </g>
      )}
      {themeId === "peach-rhythm" && (
        <g className="cat-accessory" fill="var(--orange)" stroke="var(--brown)" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M86 25c15-13 22-3 12 9l-12 3Z" />
          <path d="M86 25c-2-17-17-13-13 1l13 11Z" />
          <circle cx="86" cy="30" r="5" fill="var(--gold)" />
        </g>
      )}
      {themeId === "lime-arena" && (
        <g className="cat-accessory" stroke="var(--green)" strokeLinejoin="round">
          <path d="M31 43 44 39h32l13 4-4 17-15 3-10-7-10 7-15-3Z" fill="var(--orange)" fillOpacity=".9" strokeWidth="2.5" />
          <path d="m43 46 10-2m14 0 10 2" fill="none" stroke="var(--paper)" strokeWidth="3" strokeLinecap="round" />
          <path d="M31 47H22m67 0H98" fill="none" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
      {themeId === "coral-overdrive" && (
        <g className="cat-accessory" stroke="var(--green)" strokeWidth="2.5" strokeLinejoin="round">
          <path d="m39 25-5-22 16 11 10-13 10 13 16-11-5 22Z" fill="var(--orange)" />
          <path d="M39 25h42v9H39Z" fill="var(--gold)" />
          <circle cx="60" cy="29" r="3" fill="var(--paper)" stroke="none" />
        </g>
      )}
      {themeId === "sticker-pop" && (
        <g className="cat-accessory" strokeLinejoin="round">
          <path d="m91 16 5 10 11 1-8 7 3 11-11-6-10 6 2-11-8-7 11-1Z" fill="var(--paper)" stroke="var(--paper)" strokeWidth="7" />
          <path d="m91 16 5 10 11 1-8 7 3 11-11-6-10 6 2-11-8-7 11-1Z" fill="var(--gold)" stroke="var(--green)" strokeWidth="2.5" />
          <path d="m91 25 2 5 5 .5-4 3 1.5 5-4.5-2.8L86 38l1.5-5-4-3 5-.5Z" fill="var(--light-green)" stroke="none" />
        </g>
      )}
    </svg>
  );
}
