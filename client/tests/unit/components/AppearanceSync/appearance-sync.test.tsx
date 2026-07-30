import { beforeEach, describe, expect, it } from "vitest";

import { ThemeProvider, useTheme } from "@/components/theme-provider";
import {
  BackgroundConfigProvider,
  useBackgroundConfig
} from "@/contexts/BackgroundContext";
import { BACKGROUND_STORAGE_KEY } from "@/lib/background-config";
import { act, render, screen } from "@test";

function AppearanceProbe() {
  const { theme } = useTheme();
  const { background } = useBackgroundConfig();

  return (
    <>
      <span data-testid="theme">{theme}</span>
      <span data-testid="background">{JSON.stringify(background)}</span>
    </>
  );
}

function dispatchStorageChange(key: string, newValue: string) {
  window.dispatchEvent(
    new StorageEvent("storage", {
      key,
      newValue
    })
  );
}

describe("cross-tab appearance synchronization", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.removeAttribute("data-accent");
    document.documentElement.removeAttribute("style");
  });

  it("applies theme, accent, and background changes received from another tab", () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <BackgroundConfigProvider>
          <AppearanceProbe />
        </BackgroundConfigProvider>
      </ThemeProvider>
    );

    act(() => {
      localStorage.setItem("vite-ui-theme", "light");
      dispatchStorageChange("vite-ui-theme", "light");

      localStorage.setItem("accent", "emerald");
      dispatchStorageChange("accent", "emerald");

      const background = {
        enabled: true,
        id: "starry",
        options: { gradient: false, mountains: true }
      };
      localStorage.setItem(BACKGROUND_STORAGE_KEY, JSON.stringify(background));
      dispatchStorageChange(BACKGROUND_STORAGE_KEY, JSON.stringify(background));
    });

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(document.documentElement).toHaveClass("light");
    expect(document.documentElement.dataset.accent).toBe("emerald");
    expect(screen.getByTestId("background")).toHaveTextContent(
      JSON.stringify({
        enabled: true,
        id: "starry",
        options: { gradient: false, mountains: true }
      })
    );
  });
});
