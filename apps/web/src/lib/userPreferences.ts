export type Language = "vi" | "en";
export type Density = "compact" | "comfortable" | "spacious";

export interface UserPreferences {
  language: Language;
  density: Density;
}

const PREFS_KEY = "ttport.prefs";
const DEFAULTS: UserPreferences = { language: "vi", density: "comfortable" };

export function getPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const saved = localStorage.getItem(PREFS_KEY);
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function setPreferences(patch: Partial<UserPreferences>): void {
  const current = getPreferences();
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...patch }));
}
