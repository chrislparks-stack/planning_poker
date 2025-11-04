import { Sun, Moon, Laptop, Check } from "lucide-react";
import { FC, useEffect, useRef, useState } from "react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent, DialogDescription,
  DialogFooter, DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useToast } from "@/hooks/use-toast";
import { applyAccent } from "@/lib/theme-accent";

interface ToggleModeDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

/** Accent tokens for preview (H S% L% strings) */
const ACCENT_MAP: Record<
  string,
  { base: string; foreground: string; hover?: string; active?: string }
> = {
  lilac: {
    base: "263.4 70% 50.4%",
    foreground: "210 20% 98%",
    hover: "256 72% 46%",
    active: "250 74% 42%"
  },
  aqua: {
    base: "225 65% 50%",
    foreground: "210 20% 98%",
    hover: "220 65% 45%",
    active: "215 67% 40%"
  },
  emerald: {
    base: "150 50% 40%",
    foreground: "210 20% 98%",
    hover: "150 54% 36%",
    active: "150 58% 32%"
  },
  rose: {
    base: "350 70% 55%",
    foreground: "210 20% 98%",
    hover: "350 72% 50%",
    active: "350 75% 46%"
  },
  amber: {
    base: "45 95% 50%",
    foreground: "220.9 39.3% 11%",
    hover: "45 90% 45%",
    active: "45 85% 40%"
  }
};

const ACCENTS = [
  { id: "lilac", label: "Lilac" },
  { id: "aqua", label: "Aqua" },
  { id: "emerald", label: "Emerald" },
  { id: "rose", label: "Rose" },
  { id: "amber", label: "Amber" }
] as const;

/**
 * computeGradientStopsFromHslToken
 * Input: "H S% L%"
 * Output: { stop1, stop2, stop3 } each "H S% L%"
 */
function computeGradientStopsFromHslToken(hslToken: string) {
  const parts = hslToken.trim().split(/\s+/);
  const h = parseFloat(parts[0].replace(",", ".") || "0");
  const s = parseFloat((parts[1] || "0").replace("%", "").replace(",", "."));
  const l = parseFloat((parts[2] || "0").replace("%", "").replace(",", "."));

  const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
  const wrapHue = (deg: number) => ((deg % 360) + 360) % 360;

  // analogous triad deltas — tweakable
  const leftHueDelta = -30;
  const rightHueDelta = 30;

  const leftS = clamp(s * 0.9, 8, 100);
  const leftL = clamp(l * 1.05, 0, 100);

  const midS = clamp(s, 8, 100);
  const midL = clamp(l, 0, 100);

  const rightS = clamp(s * 0.92, 8, 100);
  const rightL = clamp(l * 0.9, 0, 100);

  const stop1 = `${wrapHue(h + leftHueDelta)} ${leftS}% ${
    Number.isInteger(leftL) ? leftL : leftL.toFixed(1)
  }%`;
  const stop2 = `${wrapHue(h)} ${midS}% ${
    Number.isInteger(midL) ? midL : midL.toFixed(1)
  }%`;
  const stop3 = `${wrapHue(h + rightHueDelta)} ${rightS}% ${
    Number.isInteger(rightL) ? rightL : rightL.toFixed(1)
  }%`;

  return { stop1, stop2, stop3 };
}

/** parse an H S% L% string like "220 13% 96%" -> {h, s, l} */
function parseHslTokens(hslTokens: string) {
  const parts = hslTokens.trim().split(/\s+/);
  const h = parseFloat(parts[0].replace(",", ".") || "0");
  const s = parseFloat((parts[1] || "0").replace("%", "").replace(",", "."));
  const l = parseFloat((parts[2] || "0").replace("%", "").replace(",", "."));
  return { h, s, l };
}

/** adjustLightness returns a CSS "hsl(...)" string — useful for inline styles */
function adjustLightness(hslTokens: string, deltaPercent: number) {
  const { h, s, l } = parseHslTokens(hslTokens);
  let newL = l + deltaPercent;
  if (newL > 100) newL = 100;
  if (newL < 0) newL = 0;
  const lStr = Number.isInteger(newL) ? `${newL}%` : `${newL.toFixed(1)}%`;
  const sStr = Number.isInteger(s) ? `${s}%` : `${s.toFixed(1)}%`;
  const hStr = Number.isInteger(h) ? `${h}` : `${h.toFixed(1)}`;
  return `hsl(${hStr} ${sStr} ${lStr})`.replace(/\s+/g, " ");
}

/** adjustTokenLightness returns a H S% L% string (no "hsl(...)" wrapper) */
function adjustTokenLightnessValue(hslToken: string, deltaPercent: number) {
  const { h, s, l } = parseHslTokens(hslToken);
  let newL = l + deltaPercent;
  if (newL > 100) newL = 100;
  if (newL < 0) newL = 0;
  const lStr = Number.isInteger(newL) ? `${newL}` : `${newL.toFixed(1)}`;
  const sStr = Number.isInteger(s) ? `${s}` : `${s.toFixed(1)}`;
  const hStr = Number.isInteger(h) ? `${h}` : `${h.toFixed(1)}`;
  return `${hStr} ${sStr}% ${lStr}%`;
}

/** Preview surface tokens (H S% L% strings) */
const THEME_PREVIEW_TOKENS = {
  light: {
    background: "0 0% 100%",
    foreground: "224 71.4% 4.1%",
    card: "0 0% 100%",
    cardForeground: "224 71.4% 4.1%",
    muted: "220 13% 96%",
    mutedForeground: "217 12% 28%"
  },
  dark: {
    background: "224 71.4% 4.1%",
    foreground: "210 20% 98%",
    card: "224 71.4% 4.1%",
    cardForeground: "210 20% 98%",
    muted: "215 27.9% 16.9%",
    mutedForeground: "217.9 10.6% 64.9%"
  }
};

export const ToggleModeDialog: FC<ToggleModeDialogProps> = ({
  open,
  setOpen
}) => {
  const { toast } = useToast();
  const { setTheme, theme: currentTheme } = useTheme() as {
    setTheme: (t: "light" | "dark" | "system") => void;
    theme?: string;
  };

  // preview-only state
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark" | "system">(
    "system"
  );
  const [previewAccent, setPreviewAccent] = useState<string>(
    () => localStorage.getItem("accent") || "lilac"
  );

  // keep original applied values for cancel
  const originalThemeRef = useRef<"light" | "dark" | "system">("system");
  const originalAccentRef = useRef<string>(
    localStorage.getItem("accent") || "lilac"
  );

  // system pref tracking for accurate System preview
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  );

  // ensure the stored accent is set on mount so page reflects persistent choice
  useEffect(() => {
    const stored = localStorage.getItem("accent") || "lilac";
    setPreviewAccent(stored);
    setAccentVarsPreview(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) {
      originalThemeRef.current =
        currentTheme === "light" ||
        currentTheme === "dark" ||
        currentTheme === "system"
          ? currentTheme
          : "system";
      originalAccentRef.current = localStorage.getItem("accent") || "lilac";

      setPreviewTheme(originalThemeRef.current);
      setPreviewAccent(originalAccentRef.current);
      setAccentVarsPreview(originalAccentRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    setSystemPrefersDark(mq.matches);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

  const [sizeKey, setSizeKey] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setSizeKey(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const effectivePreviewTheme =
    previewTheme === "system"
      ? systemPrefersDark
        ? "dark"
        : "light"
      : previewTheme;
  const previewTokens =
    effectivePreviewTheme === "dark"
      ? THEME_PREVIEW_TOKENS.dark
      : THEME_PREVIEW_TOKENS.light;
  const accentPreview = ACCENT_MAP[previewAccent] || ACCENT_MAP.lilac;

  // visible skeleton stroke color tweak:
  const skeletonStrokeColor =
    effectivePreviewTheme === "light"
      ? adjustLightness(previewTokens.muted, -10)
      : adjustLightness(previewTokens.muted, 8);

  /**
   * setAccentVarsPreview(accentId)
   * - writes runtime CSS vars for preview (and also gradient stop tokens)
   * - does NOT persist to localStorage; call this while previewing
   */
  function setAccentVarsPreview(accentId: string) {
    const entry = ACCENT_MAP[accentId];
    if (!entry) return;
    try {
      const root = document.documentElement;

      // point runtime tokens to named palette tokens (keeps palette tokens authoritative)
      root.style.setProperty("--accent", `var(--accent-${accentId})`);
      root.style.setProperty(
        "--accent-hover",
        `var(--accent-${accentId}-hover)`
      );
      root.style.setProperty(
        "--accent-active",
        `var(--accent-${accentId}-active, var(--accent-${accentId}-hover))`
      );
      root.style.setProperty(
        "--accent-foreground",
        `var(--accent-${accentId}-foreground)`
      );
      root.dataset.accent = accentId;

      // compute gradient stops for base (store raw HSL triple strings)
      const { stop1, stop2, stop3 } = computeGradientStopsFromHslToken(
        entry.base
      );
      root.style.setProperty("--accent-stop-1", stop1);
      root.style.setProperty("--accent-stop-2", stop2);
      root.style.setProperty("--accent-stop-3", stop3);

      // hover/active gradient stops: prefer explicit entry.hover if available
      const hoverToken = entry.hover ?? entry.base;
      const hoverStops = computeGradientStopsFromHslToken(hoverToken);
      root.style.setProperty("--accent-hover-stop-1", hoverStops.stop1);
      root.style.setProperty("--accent-hover-stop-2", hoverStops.stop2);
      root.style.setProperty("--accent-hover-stop-3", hoverStops.stop3);

      // active fallback: use explicit active if present, otherwise slightly darken the hover/base
      if (entry.active) {
        const activeStops = computeGradientStopsFromHslToken(entry.active);
        root.style.setProperty("--accent-active-stop-1", activeStops.stop1);
        root.style.setProperty("--accent-active-stop-2", activeStops.stop2);
        root.style.setProperty("--accent-active-stop-3", activeStops.stop3);
      } else {
        root.style.setProperty(
          "--accent-active-stop-1",
          adjustTokenLightnessValue(hoverStops.stop1, -6)
        );
        root.style.setProperty(
          "--accent-active-stop-2",
          adjustTokenLightnessValue(hoverStops.stop2, -6)
        );
        root.style.setProperty(
          "--accent-active-stop-3",
          adjustTokenLightnessValue(hoverStops.stop3, -6)
        );
      }
    } catch (err) {
      console.error("Failed to set preview accent vars:", err);
    }
  }

  // Save — commit runtime vars (& persist) and apply theme
  const handleSave = () => {
    try {
      const themeChanged = previewTheme !== originalThemeRef.current;
      const accentChanged = previewAccent !== originalAccentRef.current;

      // Apply theme and accent regardless (so it stays consistent)
      setTheme(previewTheme);
      applyAccent(previewAccent);

      // Only show toast if something actually changed
      if (themeChanged || accentChanged) {
        const titleCase = (s: string) =>
          s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

        toast({
          title: "Theme updated",
          duration: 3000,
          description: (
            <>
              <div style={{ fontWeight: 700 }}>
                Your settings have been saved
              </div>
              <div className="flex items-baseline gap-1">
                <div style={{ fontWeight: 700 }}>Theme Mode:</div>
                <div style={{ fontWeight: 600 }}>
                  {previewTheme === "dark" ? (
                    <Moon size="12px" />
                  ) : previewTheme === "light" ? (
                    <Sun size="12px" />
                  ) : (
                    <Laptop size="12px" />
                  )}
                </div>
                <div style={{ fontWeight: 600 }}>{titleCase(previewTheme)}</div>
              </div>
              <div className="flex items-baseline gap-2">
                <div style={{ fontWeight: 700 }}>Accent Color:</div>
                <div style={{ fontWeight: 600 }} className="text-accent">
                  {titleCase(previewAccent)}
                </div>
              </div>
            </>
          )
        });
      }
    } catch (err) {
      console.error("Failed to apply theme/accent:", err);
      toast({
        title: "Failed to apply theme",
        description: "See console",
        variant: "destructive"
      });
    } finally {
      setOpen(false);
    }
  };

  // Cancel — revert preview to the original stored accent & theme
  const handleCancel = () => {
    const originalAccent = originalAccentRef.current || "lilac";
    setPreviewAccent(originalAccent);
    setAccentVarsPreview(originalAccent); // revert runtime vars
    setPreviewTheme(originalThemeRef.current || "system");
    setOpen(false);
  };

  const hslFromToken = (token: string) => `hsl(${token})`;

  return (
    <Dialog
      key={sizeKey}
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          handleCancel();
          return;
        }
        setOpen(next);
      }}
    >
      <DialogContent
        className="
          flex flex-col w-[90vw] max-w-[480px] max-h-[90vh]
          rounded-2xl backdrop-blur-md bg-background/80
          border border-border/50 shadow-[0_8px_32px_rgb(0_0_0_/_0.4)]
          p-0 animate-in fade-in-0 zoom-in-95
        "
      >

        <VisuallyHidden>
          <DialogTitle>Theme and Color Settings</DialogTitle>
          <DialogDescription>
            Adjust your appearance mode and accent color preferences
          </DialogDescription>
        </VisuallyHidden>

        {/* Accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-accent to-accent/60 shrink-0" />

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Theme & Color</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Choose your appearance mode and accent color. Changes apply when you save.
            </p>
          </div>

          {/* Mode picker */}
          <div>
            <p className="mb-2 text-sm font-medium">Mode</p>
            <div className="flex gap-2">
              {[
                { id: "light", icon: <Sun className="h-4 w-4" />, label: "Light" },
                { id: "dark", icon: <Moon className="h-4 w-4" />, label: "Dark" },
                { id: "system", icon: <Laptop className="h-4 w-4" />, label: "System" }
              ].map(({ id, icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setPreviewTheme(id as "light" | "dark" | "system")}
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all
                    ${
                      previewTheme === id
                          ? "bg-accent/10 ring-2 ring-accent/40 dark:ring-accent/50"
                          : "hover:bg-accent/5 dark:hover:bg-accent/10"
                    }`}
                  >
                    {icon}
                    {label}
                  </button>
              ))}
            </div>
          </div>

          {/* Accent swatches */}
          <div>
            <p className="mb-2 text-sm font-medium">Accent color</p>
            <div className="flex items-center gap-3">
              {ACCENTS.map((a) => {
                const selected = a.id === previewAccent;
                const mapEntry = ACCENT_MAP[a.id];
                return (
                  <button
                    key={a.id}
                    onClick={() => setPreviewAccent(a.id)}
                    className={`relative flex h-8 w-8 items-center justify-center rounded-md ring-offset-2 transition-all ${
                        selected
                            ? "ring-2 ring-offset-1 shadow-md"
                            : "hover:translate-y-[-2px]"
                    }`}
                    aria-label={a.label}
                    title={a.label}
                  >
                    <span
                      className="block h-6 w-6 rounded-sm"
                      style={{ backgroundColor: hslFromToken(mapEntry.base) }}
                    />
                    {selected && (
                    <span className="absolute -right-1 -top-1">
                      <Check
                        className="h-4 w-4"
                        style={{ color: hslFromToken(mapEntry.foreground) }}
                      />
                    </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Integrated, cohesive skeleton preview */}
          <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-200 dark:bg-zinc-900">
            <p className="mb-2">
              <span className="text-sm font-medium">Preview</span>{" "}
              <span className="text-xs font-light">
              - your window will look like this
            </span>
            </p>

            <div
              className="p-4 rounded-md"
              style={{
                background: hslFromToken(previewTokens.background),
                color: hslFromToken(previewTokens.foreground),
                borderRadius: 8
              }}
            >
              {/* skeleton header with tiny accent chips integrated */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12
                }}
              >
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div
                    style={{
                      height: 10,
                      width: 120,
                      borderRadius: 6,
                      background: skeletonStrokeColor
                    }}
                  />
                  {/* tiny integrated chips to the right of header */}
                  <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 4,
                        background: hslFromToken(accentPreview.base)
                      }}
                    />
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 4,
                        background: adjustLightness(accentPreview.base, -6)
                      }}
                    />
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 4,
                        background: adjustLightness(accentPreview.base, 6)
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* main skeleton card */}
              <div
                style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
              >
                <div
                  style={{
                    flex: 1,
                    minHeight: 64,
                    borderRadius: 8,
                    background: hslFromToken(previewTokens.card),
                    padding: 12,
                    boxShadow: "0 8px 20px rgba(0,0,0,0.04)"
                  }}
                >
                  {/* title line with accent underline integrated */}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        height: 12,
                        width: "45%",
                        borderRadius: 6,
                        background: skeletonStrokeColor
                      }}
                    />
                    {/* inline accent pill next to title */}
                    <div
                      style={{
                        width: 32,
                        height: 12,
                        borderRadius: 9999,
                        background: hslFromToken(accentPreview.base)
                      }}
                    />
                  </div>

                  <div style={{ height: 8 }} />

                  {/* two short lines (muted lines) */}
                  <div
                    style={{
                      height: 8,
                      width: "70%",
                      borderRadius: 6,
                      background: skeletonStrokeColor
                    }}
                  />
                  <div style={{ height: 6 }} />
                  <div
                    style={{
                      height: 8,
                      width: "40%",
                      borderRadius: 6,
                      background: skeletonStrokeColor
                    }}
                  />

                  <div style={{ height: 12 }} />

                  {/* explicit small text-sample lines to show real text colors and subtle accent row */}
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <div
                      style={{
                        height: 10,
                        width: 140,
                        borderRadius: 6,
                        background: hslFromToken(previewTokens.card)
                      }}
                    >
                      <div
                        style={{
                          height: 10,
                          width: 120,
                          background: hslFromToken(
                              previewTokens.cardForeground
                          ),
                          borderRadius: 4
                        }}
                      />
                    </div>

                    <div
                      style={{
                        height: 10,
                        width: 80,
                        borderRadius: 6,
                        background: hslFromToken(previewTokens.card)
                      }}
                    >
                      <div
                        style={{
                          height: 10,
                          width: 60,
                          background: hslFromToken(previewTokens.muted),
                          borderRadius: 4
                        }}
                      />
                    </div>
                  </div>

                  {/* integrated accent row — feels like part of the card */}
                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <div
                      style={{
                        height: 8,
                        flex: 1,
                        borderRadius: 6,
                        background: hslFromToken(accentPreview.base)
                      }}
                    />
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 9999,
                        background: adjustLightness(accentPreview.base, 6)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="flex justify-end gap-2 pt-3">
            <Button
              variant="ghost"
              className="text-sm font-medium px-3 py-1.5"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="
                text-sm font-semibold px-4 py-1.5
                transition-all duration-200
                hover:shadow-[0_0_10px_var(--accent)]
                hover:-translate-y-[1px]
              "
            >
              Save
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
