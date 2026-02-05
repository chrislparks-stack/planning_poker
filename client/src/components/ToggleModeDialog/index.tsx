import { Sun, Moon, Laptop, Check } from "lucide-react";
import { FC, useEffect, useRef, useState } from "react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent, DialogDescription,
  DialogFooter, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Settings } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useToast } from "@/hooks/use-toast";
import { applyAccent } from "@/lib/theme-accent";
import {ThumbSwitch} from "@/components/ui/thumb-switch.tsx";
import starrySkyThumbnail from "@/assets/StarrySkyThumb.png";
import Mountain from "@/assets/silhouetted-mountain-range-at-dusk.jpg";
import {loadBackgroundConfig} from "@/lib/background-config.ts";
import {useBackgroundConfig} from "@/contexts/BackgroundContext.tsx";

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

type BackgroundOptionToggle = {
  id: string;
  label: string;
  description?: string;
};

type BackgroundOption = {
  id: string;
  label: string;
  subtitle?: string;
  description?: string;
  previewThumbnail: string;
  options?: BackgroundOptionToggle[];
};

const BACKGROUNDS: BackgroundOption[] = [
  {
    id: "starry",
    label: "Starry Sky",
    subtitle: "Animated",
    previewThumbnail: starrySkyThumbnail,
    options: [
      {
        id: "gradient",
        label: "Accent gradient",
        description: "Subtle accent-tinted sky gradient"
      },
      {
        id: "shooting-stars",
        label: "Shooting stars",
        description: "Occasional animated stars streak across the sky"
      },
      {
        id: "mountains",
        label: "Mountain ridge",
        description: "Foreground silhouette along the bottom edge"
      }
    ]
  }
];

type Star = {
  top: number;
  left: number;
  size: number;
  opacity: number;
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

  const { setBackground } = useBackgroundConfig();

  const [previewBackgroundsEnabled, setPreviewBackgroundsEnabled] = useState<boolean>(false);
  const [previewBackgroundId, setPreviewBackgroundId] = useState<string>(BACKGROUNDS[0]?.id ?? "starry");
  const [previewBackgroundOptions, setPreviewBackgroundOptions] = useState<Record<string, boolean>>({});
  const isStarryPreviewActive = previewBackgroundsEnabled && previewBackgroundId === "starry";
  const bgOpt = (id: string) => previewBackgroundOptions[id] ?? true;

  const starFieldRef = useRef<Star[]>([]);

  useEffect(() => {
    if (!open) return;

    // Load an enable background
    const bg = loadBackgroundConfig();

    setPreviewBackgroundsEnabled(bg.enabled);
    setPreviewBackgroundId(bg.id ?? BACKGROUNDS[0]?.id ?? "starry");
    setPreviewBackgroundOptions(bg.options ?? {});

    // Generate star field
    starFieldRef.current = Array.from({ length: 50 }).map(() => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() > 0.85 ? 2 : 1,
      opacity: Math.random() * 0.6 + 0.25
    }));
  }, [open]);

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
      setBackground({
        enabled: previewBackgroundsEnabled,
        id: previewBackgroundsEnabled ? previewBackgroundId : null,
        options: previewBackgroundsEnabled ? previewBackgroundOptions : {}
      });

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
            <h2 className="text-lg font-semibold tracking-tight">Appearance Settings</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Choose the appearance of your voting experience
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              *Changes apply when you save.
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
                        className="text-black dark:text-white h-4 w-4"
                      />
                    </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Backgrounds */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Backgrounds</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Enable and choose a background style for your voting table
                </p>
              </div>

              <ThumbSwitch
                checked={previewBackgroundsEnabled}
                onCheckedChange={(next: boolean) => setPreviewBackgroundsEnabled(next)}
                label="Enable backgrounds"
              />
            </div>

            {/* Album-style selection */}
            <div
              className={[
                "rounded-md border p-3 transition-opacity",
                previewBackgroundsEnabled
                  ? "opacity-100"
                  : "opacity-50 pointer-events-none select-none",
                "border-border/60 bg-background/40"
              ].join(" ")}
            >
              <div className="grid grid-cols-2 gap-3">
                {BACKGROUNDS.map((bg) => {
                  const selected = previewBackgroundId === bg.id;

                  return (
                    <div
                      key={bg.id}
                      className={[
                        "group relative overflow-hidden rounded-lg border transition-all",
                        "hover:-translate-y-[1px] hover:shadow-md",
                        selected
                          ? "border-accent/60 ring-2 ring-accent/40"
                          : "border-border/60 hover:border-accent/40"
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        className="absolute inset-0 z-10 pointer-events-none"
                        onClick={() => {
                          setPreviewBackgroundId(bg.id);

                          if (bg.options?.length) {
                            const defaults = Object.fromEntries(
                              bg.options.map(opt => [opt.id, true])
                            );
                            setPreviewBackgroundOptions(defaults);
                          } else {
                            setPreviewBackgroundOptions({});
                          }
                        }}
                        aria-label={`Select ${bg.label} background`}
                      />

                      {selected && bg.options?.length && (
                        <Popover modal={false}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="absolute top-2 right-2 z-20 inline-flex h-7 w-7
                                         items-center justify-center rounded-md
                                         bg-background/80 backdrop-blur
                                         border border-border/50
                                         text-muted-foreground hover:text-foreground"
                              aria-label="Background options"
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                          </PopoverTrigger>

                          <PopoverContent
                            side="right"
                            align="start"
                            className="w-64 p-3 space-y-2 pointer-events-auto"
                            onPointerDown={(e) => e.stopPropagation()}
                            onFocusOutside={(e) => e.preventDefault()}
                          >
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {bg.label} options
                            </div>

                            <div className="space-y-2">
                              {bg.options.map((option) => {
                                const enabled = previewBackgroundOptions[option.id] ?? true;

                                return (
                                  <div
                                    key={option.id}
                                    className="flex items-start justify-between gap-3"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium leading-none">
                                        {option.label}
                                      </p>
                                      {option.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {option.description}
                                        </p>
                                      )}
                                    </div>

                                    <div onPointerDown={(e) => e.stopPropagation()}>
                                      <ThumbSwitch
                                        checked={enabled}
                                        onCheckedChange={(next: boolean) =>
                                          setPreviewBackgroundOptions((prev) => ({
                                            ...prev,
                                            [option.id]: next
                                          }))
                                        }
                                        label={option.label}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}

                      {/* Thumbnail */}
                      <img
                        src={bg.previewThumbnail}
                        alt="Starry Sky"
                        className="h-20 w-full"
                      />

                      {/* Label strip */}
                      <div className="flex items-center justify-between gap-2 px-2 py-2 bg-background/70 backdrop-blur-sm">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold leading-none truncate">
                            {bg.label}
                          </div>
                          {bg.subtitle && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {bg.subtitle}
                            </div>
                          )}
                          {bg.description && (
                            <div className="text-[8px] text-muted-foreground break-words mt-0.5">
                              {bg.description}
                            </div>
                          )}
                        </div>

                        {selected && (
                          <div className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-accent/15">
                            <Check className="h-4 w-4 text-accent" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                  className="relative overflow-hidden"
                  style={{
                    flex: 1,
                    minHeight: 64,
                    borderRadius: 8,
                    background: isStarryPreviewActive
                      ? "#030712"
                      : hslFromToken(previewTokens.card),
                    padding: 12,
                    boxShadow: "0 8px 20px rgba(0,0,0,0.04)"
                  }}
                >
                  {isStarryPreviewActive && bgOpt("gradient") && (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(
                                      to top,
                                      hsl(${accentPreview.base} / 0.25),
                                      transparent 60%
                                    )`
                      }}
                    />
                  )}
                  {isStarryPreviewActive && (
                    <div className="absolute inset-0 pointer-events-none z-0">
                      {starFieldRef.current.map((star, i) => (
                        <div
                          key={i}
                          style={{
                            position: "absolute",
                            top: `${star.top}%`,
                            left: `${star.left}%`,
                            width: star.size,
                            height: star.size,
                            background: "#fff",
                            opacity: star.opacity,
                            borderRadius: 9999
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {isStarryPreviewActive && bgOpt("shooting-stars") && (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        top: "28%",
                        left: "65%",
                        width: 75,
                        height: 2,
                        transform: "rotate(45deg)",
                        zIndex: 0,
                        filter: "blur(0.2px)",
                        background: `
                                    linear-gradient(
                                      to right,
                                      rgba(255,255,255,0) 0%,
                                      rgba(255,255,255,0.15) 25%,
                                      rgba(255,255,255,0.9) 100%
                                    )
                                  `
                      }}
                    >
                      {/* bright head */}
                      <div
                        style={{
                          position: "absolute",
                          right: -2,
                          top: "50%",
                          width: 6,
                          height: 6,
                          transform: "translateY(-50%)",
                          borderRadius: "50%",
                          background: "white",
                          boxShadow: "0 0 6px 2px rgba(255,255,255,0.8)"
                        }}
                      />
                    </div>
                  )}

                  {isStarryPreviewActive && bgOpt("mountains") && (
                    <img
                      src={Mountain}
                      alt=""
                      className="absolute bottom-0 left-0 w-full -mb-16 pointer-events-none -z-1"
                      style={{
                        opacity: 0.9
                      }}
                    />
                  )}
                  {/* title line with accent underline integrated */}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8, zIndex: 1 }}
                  >
                    <div
                      style={{
                        height: 12,
                        width: "45%",
                        borderRadius: 6,
                        background: skeletonStrokeColor,
                        zIndex: 1
                      }}
                    />
                    {/* inline accent pill next to title */}
                    <div
                      style={{
                        width: 32,
                        height: 12,
                        borderRadius: 9999,
                        background: hslFromToken(accentPreview.base),
                        zIndex: 1
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
                      background: skeletonStrokeColor,
                      zIndex: 1
                    }}
                  />
                  <div style={{ height: 6 }} />
                  <div
                    style={{
                      height: 8,
                      width: "40%",
                      borderRadius: 6,
                      background: skeletonStrokeColor,
                      zIndex: 1
                    }}
                  />

                  <div style={{ height: 12 }} />

                  {/* explicit small text-sample lines to show real text colors and subtle accent row */}
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center", zIndex: 1 }}
                  >
                    <div
                      style={{
                        height: 10,
                        width: 140,
                        borderRadius: 6,
                        background: hslFromToken(previewTokens.card),
                        zIndex: 1
                      }}
                    >
                      <div
                        style={{
                          height: 10,
                          width: 120,
                          background: hslFromToken(
                              previewTokens.cardForeground
                          ),
                          borderRadius: 4,
                          zIndex: 1
                        }}
                      />
                    </div>

                    <div
                      style={{
                        height: 10,
                        width: 80,
                        borderRadius: 6,
                        background: hslFromToken(previewTokens.card),
                        zIndex: 1
                      }}
                    >
                      <div
                        style={{
                          height: 10,
                          width: 60,
                          background: hslFromToken(previewTokens.muted),
                          borderRadius: 4,
                          zIndex: 1
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
                        background: hslFromToken(accentPreview.base),
                        zIndex: 1
                      }}
                    />
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 9999,
                        background: adjustLightness(accentPreview.base, 6),
                        zIndex: 1
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
