export type BackgroundConfig = {
  enabled: boolean;
  id: string | null;
  options: Record<string, boolean>;
};

export const DEFAULT_BACKGROUND_CONFIG: BackgroundConfig = {
  enabled: false,
  id: null,
  options: {}
};

const STORAGE_KEY = "background";

export function loadBackgroundConfig(): BackgroundConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BACKGROUND_CONFIG;
    return { ...DEFAULT_BACKGROUND_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BACKGROUND_CONFIG;
  }
}

export function saveBackgroundConfig(config: BackgroundConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
