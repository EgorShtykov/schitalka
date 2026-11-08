// Палитры мира под темы оформления сайта: планета «пересвечивается»
// в цвета выбранной темы — бесплатный эффект персонализации.

export interface WorldPalette {
  skyTop: string;
  skyBottom: string;
  nebulaA: string;
  nebulaB: string;
  star: string;
  constellation: string;
  rockLow: string;
  rockHigh: string;
  foliage: string;
  flower: string;
  crystal: string;
  lanternGlow: string;
  spirit: string;
}

const BASE: WorldPalette = {
  skyTop: "#070b24",
  skyBottom: "#151b3f",
  nebulaA: "#31439b",
  nebulaB: "#7b3fa0",
  star: "#fff6d8",
  constellation: "#ffd66e",
  rockLow: "#3d4a78",
  rockHigh: "#6a7fb5",
  foliage: "#3fbf8f",
  flower: "#ff9ecb",
  crystal: "#8fd8ff",
  lanternGlow: "#ffc46b",
  spirit: "#a8e6ff",
};

const BY_THEME: Record<string, Partial<WorldPalette>> = {
  classic: {},
  "sakura-neon": {
    nebulaA: "#5b2050",
    nebulaB: "#b03a8e",
    foliage: "#7fe0c3",
    flower: "#ff73bf",
    crystal: "#ffd3e8",
    spirit: "#ff9ed6",
  },
  noir: {
    nebulaA: "#3a4a2a",
    nebulaB: "#6a7a3a",
    foliage: "#a2b84d",
    flower: "#e8f0a0",
    crystal: "#d8e8b0",
    spirit: "#e4f0b8",
  },
  "mint-comic": {
    nebulaA: "#2a6a5a",
    nebulaB: "#3fbf8f",
    foliage: "#4fd0a0",
    flower: "#ff8f70",
    spirit: "#b8f4dc",
  },
  cosmic: {
    nebulaA: "#23204d",
    nebulaB: "#5a4fd0",
    foliage: "#3fa97a",
    flower: "#ffbf2e",
    crystal: "#a1d9f7",
    spirit: "#ffbf2e",
  },
  "peach-rhythm": {
    nebulaA: "#7a4a3a",
    nebulaB: "#d08060",
    foliage: "#60c0a0",
    flower: "#f2765b",
    spirit: "#ffd6bc",
  },
  "lime-arena": {
    nebulaA: "#3a5a20",
    nebulaB: "#7ab030",
    foliage: "#9ad040",
    flower: "#cdfb52",
    spirit: "#e8ffb0",
  },
  "coral-overdrive": {
    nebulaA: "#5a2020",
    nebulaB: "#c04038",
    foliage: "#50b090",
    flower: "#f8473d",
    spirit: "#ffb0a8",
  },
  "sticker-pop": {
    nebulaA: "#5a3a70",
    nebulaB: "#c060c8",
    foliage: "#50c8d8",
    flower: "#ff7ad9",
    spirit: "#ffc8f0",
  },
};

export function paletteForTheme(themeId: string): WorldPalette {
  return { ...BASE, ...(BY_THEME[themeId] ?? {}) };
}
