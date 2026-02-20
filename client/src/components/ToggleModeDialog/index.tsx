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
import {DEFAULT_BACKGROUND_CONFIG, loadBackgroundConfig} from "@/lib/background-config.ts";
import {useBackgroundConfig} from "@/contexts/BackgroundContext.tsx";
import {Switch} from "@/components/ui/switch.tsx";

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

  // Live preview toggle (default ON)
  const [livePreviewEnabled, setLivePreviewEnabled] = useState(false);

  // preview-only state
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark" | "system">(
    "system"
  );
  const [previewAccent, setPreviewAccent] = useState<string>(
    () => localStorage.getItem("accent") || "lilac"
  );

  const originalThemeRef = useRef<"light" | "dark" | "system">("system");
  const originalAccentRef = useRef<string>(
    localStorage.getItem("accent") || "lilac"
  );
  const originalBackgroundRef = useRef<ReturnType<typeof loadBackgroundConfig>>(DEFAULT_BACKGROUND_CONFIG);

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

    originalBackgroundRef.current = bg;

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
      const originalBg = originalBackgroundRef.current;

      const backgroundChanged = !!originalBg && (
        originalBg.enabled !== previewBackgroundsEnabled ||
        originalBg.id !== (previewBackgroundsEnabled ? previewBackgroundId : null) ||
        JSON.stringify(originalBg.options ?? {}) !==
        JSON.stringify(previewBackgroundsEnabled ? previewBackgroundOptions : {})
      );

      // Apply theme and accent regardless (so it stays consistent)
      setTheme(previewTheme);
      applyAccent(previewAccent);
      setBackground({
        enabled: previewBackgroundsEnabled,
        id: previewBackgroundsEnabled ? previewBackgroundId : null,
        options: previewBackgroundsEnabled ? previewBackgroundOptions : {}
      });

      // Only show toast if something actually changed
      if (themeChanged || accentChanged || backgroundChanged) {
        const backgroundLabel = previewBackgroundsEnabled
          ? BACKGROUNDS.find(b => b.id === previewBackgroundId)?.label ?? "Custom"
          : "Disabled";

        toast({
          title: "Appearance updated",
          duration: 3000,
          description: (
            <>
              <div style={{ fontWeight: 700 }}>
                Your settings have been saved
              </div>

              {themeChanged && (
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
                  <div style={{ fontWeight: 600 }}>
                    {previewTheme.charAt(0).toUpperCase() + previewTheme.slice(1)}
                  </div>
                </div>
              )}

              {accentChanged && (
                <div className="flex items-baseline gap-2">
                  <div style={{ fontWeight: 700 }}>Accent Color:</div>
                  <div style={{ fontWeight: 600 }} className="text-accent">
                    {previewAccent.charAt(0).toUpperCase() + previewAccent.slice(1)}
                  </div>
                </div>
              )}

              {backgroundChanged && (
                <div className="flex items-baseline gap-2">
                  <div style={{ fontWeight: 700 }}>Background:</div>
                  <div style={{ fontWeight: 600 }}>
                    {backgroundLabel}
                  </div>
                </div>
              )}
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
        className={[
          "p-0 max-h-[90vh] overflow-hidden",
          "rounded-2xl backdrop-blur-md bg-background/80",
          "border border-border/50",
          "shadow-[0_8px_32px_rgb(0_0_0_/_0.4)]",
          "transition-all duration-700 ease-out",
          livePreviewEnabled ? "max-w-[80vw] lg:max-w-[980px] min-w-[400px]" : "max-w-[500px] min-w-[400px]"
        ].join(" ")}
      >
      <VisuallyHidden>
          <DialogTitle>Theme and Color Settings</DialogTitle>
          <DialogDescription>
            Adjust your appearance mode and accent color preferences
          </DialogDescription>
        </VisuallyHidden>

        {/* Accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-accent to-accent/60" />

        <div
          className={[
            "grid",
            livePreviewEnabled
              ? "grid-cols-1 lg:grid-cols-[1fr_520px]"
              : "grid-cols-1"
          ].join(" ")}
        >
          {/* LEFT: Controls (scrolls) */}
          <div className="max-h-[calc(90vh-6px)] min-w-[400px] w-full overflow-y-auto px-6 py-4 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-1">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Appearance Settings
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Choose the appearance of your voting experience
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  *Changes apply when you save.
                </p>
              </div>

              <div className="flex flex-col items-center rounded-lg border border-border/60 bg-background/40 p-2 w-32">
                <p className="text-sm tracking-tight mb-2">
                  Live Preview
                </p>
                <div className="hidden lg:flex">
                  <Switch
                    id="live-preview"
                    checked={livePreviewEnabled}
                    onCheckedChange={setLivePreviewEnabled}
                    className="flex-shrink-0"
                    size="sm"
                  />
                </div>

                <div className="lg:hidden text-lg text-muted-foreground">
                  N/A
                </div>
              </div>
            </div>

            {/* Mode + Accent */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {/* Mode picker */}
              <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                <p className="mb-2 text-sm font-medium">Mode</p>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "light", icon: <Sun className="h-4 w-4" />, label: "Light" },
                    { id: "dark", icon: <Moon className="h-4 w-4" />, label: "Dark" },
                    { id: "system", icon: <Laptop className="h-4 w-4" />, label: "System" }
                  ].map(({ id, icon, label }) => {
                    const selected = previewTheme === id;

                    return (
                      <button
                        key={id}
                        onClick={() => setPreviewTheme(id as "light" | "dark" | "system")}
                        className={[
                          "flex flex-col items-center justify-center gap-1 rounded-md py-2 text-xs font-medium transition-all",
                          selected
                            ? "bg-accent/15 ring-2 ring-accent/40 dark:ring-accent/50"
                            : "hover:bg-accent/5 dark:hover:bg-accent/10"
                        ].join(" ")}
                      >
                        {icon}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent swatches */}
              <div className="rounded-lg border border-border/60 bg-background/40 p-4">
                <p className="mb-4 text-sm font-medium">Accent color</p>

                <div className="flex items-center justify-start gap-3 lg:gap-1">
                  {ACCENTS.map((a) => {
                    const selected = a.id === previewAccent;
                    const mapEntry = ACCENT_MAP[a.id];

                    return (
                      <button
                        key={a.id}
                        onClick={() => setPreviewAccent(a.id)}
                        aria-label={a.label}
                        title={a.label}
                        className="
                          relative h-9 w-9 flex items-center justify-center
                          rounded-md transition-transform
                          hover:-translate-y-[1px]
                        "
                      >
                        {/* Glow wrapper */}
                        <span
                          className={[
                            "flex items-center justify-center rounded-md",
                            "h-8 w-8",
                            selected
                              ? "bg-accent/15 ring-2 ring-accent/40 dark:ring-accent/50"
                              : "hover:bg-accent/5 dark:hover:bg-accent/10"
                          ].join(" ")}
                        >
                          {/* Actual color swatch */}
                          <span
                            className="block h-6 w-6 rounded-sm"
                            style={{ backgroundColor: hslFromToken(mapEntry.base) }}
                          />
                        </span>

                        {selected && (
                          <span className="absolute right-0 top-0.5">
                            <Check className="h-4 w-4 text-black dark:text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Backgrounds */}
            <div className="rounded-lg border border-border/60 bg-background/40 p-4 space-y-3">
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
                <div
                  className="
                    grid grid-cols-1 lg:grid-cols-2 gap-3
                    max-w-[250px] lg:max-w-[400px] overflow-auto
                  "
                >
                {BACKGROUNDS.map((bg) => {
                    const selected = previewBackgroundId === bg.id;

                    return (
                      <div
                        key={bg.id}
                        className={[
                          "group relative overflow-hidden rounded-lg border transition-all",
                          "hover:-translate-y-[1px] hover:shadow-md",
                          "flex flex-col lg:block w-[70%]",
                          selected
                            ? "border-accent/60 ring-2 ring-accent/40"
                            : "border-border/60 hover:border-accent/40"
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          className="absolute inset-0 z-10 pointer-events-auto"
                          onClick={() => {
                            setPreviewBackgroundId(bg.id);

                            if (bg.options?.length) {
                              const defaults = Object.fromEntries(
                                bg.options.map((opt) => [opt.id, true])
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
                                className="
                                absolute top-2 right-2 z-20 inline-flex h-7 w-7
                                items-center justify-center rounded-md
                                bg-background/80 backdrop-blur
                                border border-border/50
                                text-muted-foreground hover:text-foreground
                              "
                                aria-label="Background options"
                                onPointerDown={(e) => e.stopPropagation()}
                              >
                                <Settings className="h-4 w-4" />
                              </button>
                            </PopoverTrigger>

                            <PopoverContent
                              side="right"
                              align="start"
                              className="w-72 p-3 space-y-2 pointer-events-auto"
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
                          alt={bg.label}
                          className="w-full object-cover"
                        />
                        {/* Label strip */}
                        <div
                          className="
                            flex items-center justify-between gap-2
                            px-3 py-3 lg:px-2 lg:py-2
                            bg-background/70 backdrop-blur-sm
                          "
                        >
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

            {/* Footer */}
          <DialogFooter className="flex flex-row justify-end gap-2 pb-1">
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

          {/* RIGHT: Preview (sticky, no scroll) */}
          {livePreviewEnabled && (
            <div className="hidden lg:flex flex-col border-l border-border/40 bg-muted/10">
              <div className="flex flex-col h-full p-6 gap-4">
                {/* Header */}
                <div className="shrink-0">
                  <h2 className="text-lg font-semibold tracking-tight">
                    Live Preview
                  </h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Updates as you change settings
                  </p>
                </div>

                {/* Preview container */}
                <div className="flex-1 min-h-0">
                  <div className="h-full rounded-xl border border-border/60 bg-background/40 p-4 flex flex-col">
                    <p className="mb-3 shrink-0">
                      <span className="text-sm font-medium">Preview</span>{" "}
                      <span className="text-xs text-muted-foreground font-light">
                        – your window will look like this
                      </span>
                    </p>

                    {/* Preview surface */}
                    <div
                      className="flex-1 min-h-0 rounded-lg overflow-hidden relative"
                      style={{
                        background: hslFromToken(previewTokens.background),
                        color: hslFromToken(previewTokens.foreground)
                      }}
                    >
                      <div
                        className="absolute inset-0 p-6"
                        style={{
                          background: isStarryPreviewActive
                            ? "#030712"
                            : hslFromToken(previewTokens.card)
                        }}
                      >
                        {/* Accent gradient */}
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

                        {/* Stars */}
                        {isStarryPreviewActive && (
                          <div className="absolute inset-0 pointer-events-none">
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

                        {/* Shooting star */}
                        {isStarryPreviewActive && bgOpt("shooting-stars") && (
                          <div
                            className="absolute pointer-events-none"
                            style={{
                              top: "20%",
                              left: "70%",
                              width: 90,
                              height: 2,
                              transform: "rotate(45deg)",
                              filter: "blur(0.2px)",
                              background: `linear-gradient(
                                to right,
                                rgba(255,255,255,0) 0%,
                                rgba(255,255,255,0.2) 30%,
                                rgba(255,255,255,0.9) 100%
                              )`
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                right: -3,
                                top: "50%",
                                width: 7,
                                height: 7,
                                transform: "translateY(-50%)",
                                borderRadius: "50%",
                                background: "white",
                                boxShadow: "0 0 8px 3px rgba(255,255,255,0.8)"
                              }}
                            />
                          </div>
                        )}

                        {/* Mountains */}
                        {isStarryPreviewActive && bgOpt("mountains") && (
                          <img
                            src={Mountain}
                            alt=""
                            className="absolute bottom-0 left-0 w-full pointer-events-none"
                            style={{ opacity: 0.9 }}
                          />
                        )}

                        {/* ===== Mock content to fill negative space ===== */}
                        <div className="absolute inset-0 pointer-events-none z-[1] p-4">
                          {(() => {
                            const surface = hslFromToken(previewTokens.card);
                            const surfaceMuted = hslFromToken(previewTokens.muted);
                            const stroke = `hsl(${previewTokens.foreground} / 0.12)`;
                            const accent = hslFromToken(accentPreview.base);

                            return (
                              <div className="h-full w-full grid grid-rows-[auto_1fr_auto] gap-4">
                                {/* ───────── Top row ───────── */}
                                <div className="flex items-start justify-between gap-3">
                                  {/* Summary card */}
                                  <div
                                    style={{
                                      width: "min(260px, 68%)",
                                      padding: 10,
                                      background: surface,
                                      borderRadius: 12,
                                      border: `1px solid ${stroke}`
                                    }}
                                  >
                                    <div className="space-y-1.5">
                                      <div
                                        style={{
                                          height: 8,
                                          width: "60%",
                                          borderRadius: 6,
                                          background: skeletonStrokeColor
                                        }}
                                      />
                                      <div
                                        style={{
                                          height: 6,
                                          width: "90%",
                                          borderRadius: 6,
                                          background: skeletonStrokeColor,
                                          opacity: 0.6
                                        }}
                                      />
                                      <div
                                        style={{
                                          height: 6,
                                          width: "50%",
                                          borderRadius: 6,
                                          background: skeletonStrokeColor,
                                          opacity: 0.4
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Accent status pill */}
                                  <div
                                    style={{
                                      height: 26,
                                      padding: "6px 12px",
                                      background: accent,
                                      borderRadius: 9999,
                                      boxShadow: `0 0 0 3px hsl(${accentPreview.base} / 0.25)`
                                    }}
                                  >
                                    <div
                                      style={{
                                        height: 6,
                                        width: 64,
                                        borderRadius: 9999,
                                        background: "#fff"
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* ───────── Middle row ───────── */}
                                <div className="min-h-0 grid grid-cols-[minmax(100px,150px)_1fr] gap-3 items-center">
                                  {/* Left info card */}
                                  <div
                                    style={{
                                      minHeight: 140,
                                      padding: 10,
                                      background: surfaceMuted,
                                      borderRadius: 12,
                                      border: `1px solid ${stroke}`
                                    }}
                                  >
                                    <div className="space-y-1.5">
                                      <div
                                        style={{
                                          height: 8,
                                          width: "70%",
                                          borderRadius: 6,
                                          background: skeletonStrokeColor
                                        }}
                                      />
                                      <div
                                        style={{
                                          height: 26,
                                          width: "100%",
                                          borderRadius: 8,
                                          background: skeletonStrokeColor,
                                          opacity: 0.45
                                        }}
                                      />
                                      <div
                                        style={{
                                          height: 6,
                                          width: "85%",
                                          borderRadius: 6,
                                          background: skeletonStrokeColor,
                                          opacity: 0.5
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Center voting board (accent outline) */}
                                  <div className="min-w-0 flex justify-end">
                                    <div
                                      style={{
                                        width: "min(100%, 420px)",
                                        height: 120,
                                        background: surface,
                                        borderRadius: 9999,
                                        border: `2px solid ${accent}`,
                                        boxShadow: `0 0 0 6px hsl(${accentPreview.base} / 0.15)`
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* ───────── Bottom row ───────── */}
                                <div className="flex justify-center gap-2 flex-wrap">
                                  {[0, 1, 2, 3, 5, 8, 13].map((_, i) => {
                                    const selected = i === 3;

                                    return (
                                      <div
                                        key={i}
                                        style={{
                                          width: 40,
                                          height: 58,
                                          background: selected ? accent : surfaceMuted,
                                          borderRadius: 10,
                                          border: selected
                                            ? `2px solid ${accent}`
                                            : `1px solid ${stroke}`,
                                          boxShadow: selected
                                            ? `0 0 0 4px hsl(${accentPreview.base} / 0.25)`
                                            : undefined
                                        }}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
