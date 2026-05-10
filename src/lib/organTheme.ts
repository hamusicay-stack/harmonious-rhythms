// Organ UI theme — schema + defaults
export type OrganButton = {
  id: string;
  label: string;
  group: "INTRO" | "MAIN" | "FILL" | "ENDING" | "EXTRA";
  led: "blue" | "green" | "amber" | "red";
  code: string; // sample code (e.g. Intro_1, Main_A)
};

export type OrganToolbarItem = { id: string; label: string; icon?: string };

export type OrganTheme = {
  brandText: string;
  screenLabel: string; // STYLE / VOICE / etc.
  tabs: { label: string; activeOn?: "sets" | "folders" | "items" }[];
  topBanner: {
    bg: string;
    textColor: string;
    height: number;
    showLogo: boolean;
  };
  tabsBar: {
    bg: string;
    activeBg: string;
    textColor: string;
    activeTextColor: string;
  };
  lcd: {
    bg: string;
    textColor: string;
    cardBg: string;
    cardTextColor: string;
    accentColor: string;
  };
  bottomBanner: {
    bg: string;
    textColor: string;
    pButton: { bg: string; activeColor: string };
    upButton: { bg: string; textColor: string; show: boolean };
  };
  toolbar: {
    bg: string;
    itemBg: string;
    textColor: string;
    items: OrganToolbarItem[];
    show: boolean;
  };
  chassis: {
    bg: string;
    borderRadius: number;
    showScrews: boolean;
  };
  buttons: {
    bg: string;
    textColor: string;
    ledBlue: string;
    ledGreen: string;
    ledAmber: string;
    ledRed: string;
    list: OrganButton[];
  };
};

export const DEFAULT_TYROS_THEME: OrganTheme = {
  brandText: "YAMAHA",
  screenLabel: "STYLE",
  tabs: [
    { label: "PRESET", activeOn: "sets" },
    { label: "USER" },
    { label: "HD1", activeOn: "folders" },
    { label: "USB1", activeOn: "items" },
  ],
  topBanner: {
    bg: "linear-gradient(180deg, #1a1c22 0%, #0a0b0f 100%)",
    textColor: "#ffffff",
    height: 38,
    showLogo: true,
  },
  tabsBar: {
    bg: "linear-gradient(180deg, #6a6d75 0%, #4a4d54 60%, #3a3d44 100%)",
    activeBg: "linear-gradient(180deg, #d6dae0 0%, #a4a8af 100%)",
    textColor: "#ffffff",
    activeTextColor: "#1a1c22",
  },
  lcd: {
    bg: "linear-gradient(180deg, #c9d2dc 0%, #9faab8 55%, #8893a3 100%)",
    textColor: "#0e1420",
    cardBg: "linear-gradient(180deg, #ffffff 0%, #e7ecf2 60%, #cdd4dd 100%)",
    cardTextColor: "#0e1420",
    accentColor: "#ff7a18",
  },
  bottomBanner: {
    bg: "linear-gradient(180deg, #93969c 0%, #7d8086 100%)",
    textColor: "#ffffff",
    pButton: { bg: "linear-gradient(180deg, #4a4d54 0%, #2c2e34 100%)", activeColor: "#ff7a18" },
    upButton: {
      bg: "linear-gradient(180deg, #e6ebf2 0%, #b7c0cc 50%, #8a94a3 100%)",
      textColor: "#0e1420",
      show: true,
    },
  },
  toolbar: {
    bg: "linear-gradient(180deg, #2a2c33 0%, #15171c 100%)",
    itemBg: "linear-gradient(180deg, #6a6d75 0%, #3a3d44 100%)",
    textColor: "#ffffff",
    show: true,
    items: [
      { id: "name", label: "NAME", icon: "FileText" },
      { id: "cut", label: "CUT", icon: "Scissors" },
      { id: "copy", label: "COPY", icon: "Copy" },
      { id: "paste", label: "PASTE", icon: "ClipboardPaste" },
      { id: "delete", label: "DELETE", icon: "Trash2" },
      { id: "save", label: "SAVE", icon: "Save" },
      { id: "folder", label: "FOLDER", icon: "FolderOpen" },
      { id: "menu", label: "MENU 2", icon: "MenuSquare" },
    ],
  },
  chassis: {
    bg: "linear-gradient(180deg, #d8dde4 0%, #b6bcc6 50%, #8d949f 100%)",
    borderRadius: 14,
    showScrews: true,
  },
  buttons: {
    bg: "linear-gradient(180deg, #3e434d 0%, #2a2e36 35%, #15181e 75%, #0a0c10 100%)",
    textColor: "#f5f7fb",
    ledBlue: "#4ab5ff",
    ledGreen: "#4ef58c",
    ledAmber: "#ffb13a",
    ledRed: "#ff2a2a",
    list: [
      { id: "i1", code: "Intro_1", label: "Intro I", group: "INTRO", led: "blue" },
      { id: "i2", code: "Intro_2", label: "Intro II", group: "INTRO", led: "blue" },
      { id: "i3", code: "Intro_3", label: "Intro III", group: "INTRO", led: "blue" },
      { id: "ma", code: "Main_A", label: "Main A", group: "MAIN", led: "green" },
      { id: "mb", code: "Main_B", label: "Main B", group: "MAIN", led: "green" },
      { id: "mc", code: "Main_C", label: "Main C", group: "MAIN", led: "green" },
      { id: "md", code: "Main_D", label: "Main D", group: "MAIN", led: "green" },
      { id: "faa", code: "Fill_AA", label: "Fill In AA", group: "FILL", led: "amber" },
      { id: "fbb", code: "Fill_BB", label: "Fill In BB", group: "FILL", led: "amber" },
      { id: "fcc", code: "Fill_CC", label: "Fill In CC", group: "FILL", led: "amber" },
      { id: "fdd", code: "Fill_DD", label: "Fill In DD", group: "FILL", led: "amber" },
      { id: "e1", code: "Ending_1", label: "Ending I", group: "ENDING", led: "red" },
      { id: "e2", code: "Ending_2", label: "Ending II", group: "ENDING", led: "red" },
      { id: "e3", code: "Ending_3", label: "Ending III", group: "ENDING", led: "red" },
    ],
  },
};

export const DEFAULT_GENOS_THEME: OrganTheme = {
  ...DEFAULT_TYROS_THEME,
  brandText: "YAMAHA",
  screenLabel: "STYLE",
  topBanner: {
    bg: "linear-gradient(180deg, #ff7a18 0%, #c14a00 100%)",
    textColor: "#ffffff",
    height: 36,
    showLogo: true,
  },
  lcd: {
    bg: "linear-gradient(180deg, #18223a 0%, #0a0c14 100%)",
    textColor: "#e6ecff",
    cardBg: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.25) 100%)",
    cardTextColor: "#e6ecff",
    accentColor: "#ff7a18",
  },
  chassis: {
    bg: "linear-gradient(180deg, #23252b 0%, #15171c 50%, #0a0b0f 100%)",
    borderRadius: 14,
    showScrews: true,
  },
};

export function mergeTheme(base: OrganTheme, override: Partial<OrganTheme> | null | undefined): OrganTheme {
  if (!override) return base;
  return {
    ...base,
    ...override,
    topBanner: { ...base.topBanner, ...(override.topBanner ?? {}) },
    tabsBar: { ...base.tabsBar, ...(override.tabsBar ?? {}) },
    lcd: { ...base.lcd, ...(override.lcd ?? {}) },
    bottomBanner: {
      ...base.bottomBanner,
      ...(override.bottomBanner ?? {}),
      pButton: { ...base.bottomBanner.pButton, ...((override.bottomBanner ?? {}).pButton ?? {}) },
      upButton: { ...base.bottomBanner.upButton, ...((override.bottomBanner ?? {}).upButton ?? {}) },
    },
    toolbar: { ...base.toolbar, ...(override.toolbar ?? {}) },
    chassis: { ...base.chassis, ...(override.chassis ?? {}) },
    buttons: { ...base.buttons, ...(override.buttons ?? {}) },
    tabs: override.tabs ?? base.tabs,
  };
}
