import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode
} from "react";

import {
  BACKGROUND_STORAGE_KEY,
  loadBackgroundConfig,
  saveBackgroundConfig,
  type BackgroundConfig
} from "@/lib/background-config";

type BackgroundConfigContextValue = {
  background: BackgroundConfig;
  setBackground: (config: BackgroundConfig) => void;
};

const BackgroundConfigContext =
  createContext<BackgroundConfigContextValue | null>(null);

export function BackgroundConfigProvider({
  children
}: {
  children: ReactNode;
}) {
  const [background, setBackgroundState] = useState<BackgroundConfig>(() =>
    loadBackgroundConfig()
  );

  const setBackground = (config: BackgroundConfig) => {
    setBackgroundState(config);
    saveBackgroundConfig(config);
  };

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === BACKGROUND_STORAGE_KEY || event.key === null) {
        setBackgroundState(loadBackgroundConfig());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <BackgroundConfigContext.Provider value={{ background, setBackground }}>
      {children}
    </BackgroundConfigContext.Provider>
  );
}

export function useBackgroundConfig() {
  const ctx = useContext(BackgroundConfigContext);
  if (!ctx) {
    throw new Error(
      "useBackgroundConfig must be used inside BackgroundConfigProvider"
    );
  }
  return ctx;
}
