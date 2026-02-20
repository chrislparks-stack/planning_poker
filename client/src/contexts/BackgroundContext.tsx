import {
  createContext,
  useContext,
  useState,
  ReactNode
} from "react";
import {
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

export function BackgroundConfigProvider({ children }: { children: ReactNode }) {
  const [background, setBackgroundState] = useState<BackgroundConfig>(() =>
    loadBackgroundConfig()
  );

  const setBackground = (config: BackgroundConfig) => {
    setBackgroundState(config);
    saveBackgroundConfig(config);
  };

  return (
    <BackgroundConfigContext.Provider value={{ background, setBackground }}>
      {children}
    </BackgroundConfigContext.Provider>
  );
}

export function useBackgroundConfig() {
  const ctx = useContext(BackgroundConfigContext);
  if (!ctx) {
    throw new Error("useBackgroundConfig must be used inside BackgroundConfigProvider");
  }
  return ctx;
}
