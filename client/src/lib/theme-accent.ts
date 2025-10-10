// src/lib/theme-accent.ts
// Utilities to apply an accent palette (and compute gradient stops) at runtime.

type AccentEntry = {
  base: string; // "H S% L%"
  foreground?: string;
  hover?: string;
  active?: string;
};

// Optional fallback map if CSS variables are not present for some reason.
// You can keep this in-sync with the ACCENT_MAP in your dialog, or remove it
// if you prefer CSS tokens to be the single-source of truth.
export const FALLBACK_ACCENTS: Record<string, AccentEntry> = {
  purple: {
    base: "263.4 70% 50.4%",
    foreground: "210 20% 98%",
    hover: "256 72% 46%",
    active: "250 74% 42%"
  },
  indigo: {
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

/* ----------------- helpers ----------------- */
function parseHslTokens(hslTokens: string) {
  const parts = (hslTokens || "").trim().split(/\s+/);
  const h = parseFloat((parts[0] || "0").replace(",", ".")) || 0;
  const s =
    parseFloat(((parts[1] || "0").replace("%", "") || "0").replace(",", ".")) ||
    0;
  const l =
    parseFloat(((parts[2] || "0").replace("%", "") || "0").replace(",", ".")) ||
    0;
  return { h, s, l };
}

function wrapHue(deg: number) {
  return ((deg % 360) + 360) % 360;
}

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Programmatic analogous triad generator (returns raw "H S% L%" strings)
 */
export function computeGradientStopsFromHslToken(hslToken: string) {
  const { h, s, l } = parseHslTokens(hslToken);

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

/* returns "hsl(H S% L%)" string */
export function hslFromToken(hslToken: string) {
  return `hsl(${hslToken})`;
}

/* slightly adjust a "H S% L%" token's lightness and return a token string */
export function adjustTokenLightnessValue(
  hslToken: string,
  deltaPercent: number
) {
  const { h, s, l } = parseHslTokens(hslToken);
  let newL = l + deltaPercent;
  newL = clamp(newL, 0, 100);
  const lStr = Number.isInteger(newL) ? `${newL}` : `${newL.toFixed(1)}`;
  const sStr = Number.isInteger(s) ? `${s}` : `${s.toFixed(1)}`;
  const hStr = Number.isInteger(h) ? `${h}` : `${h.toFixed(1)}`;
  return `${hStr} ${sStr}% ${lStr}%`;
}

/* ----------------- main function ----------------- */

/**
 * applyAccent
 * - accentId: "purple" etc.
 * - options.persist: whether to write to localStorage (default true)
 *
 * This will:
 *  - set --accent to `var(--accent-<id>)` (so palette tokens remain authoritative)
 *  - set --accent-hover, --accent-active, --accent-foreground
 *  - compute and write --accent-stop-1/2/3 (raw HSL token strings)
 *  - compute/write hover & active stops too (using palette hover/active if present)
 */
export function applyAccent(accentId: string, opts?: { persist?: boolean }) {
  const persist = opts?.persist ?? true;
  const root = document.documentElement;

  // 1) try to read the explicit palette token from CSS (preferred)
  // e.g. --accent-purple should contain "263.4 70% 50.4%"
  const cs = getComputedStyle(root);
  const paletteBase = cs.getPropertyValue(`--accent-${accentId}`).trim();
  const paletteHover = cs.getPropertyValue(`--accent-${accentId}-hover`).trim();
  const paletteActive = cs
    .getPropertyValue(`--accent-${accentId}-active`)
    .trim();
  const paletteForeground = cs
    .getPropertyValue(`--accent-${accentId}-foreground`)
    .trim();

  // 2) fallback to the in-file map if a palette token isn't present
  const entryFallback = FALLBACK_ACCENTS[accentId];

  const baseToken = paletteBase || entryFallback?.base || "263.4 70% 50.4%";
  const hoverToken = paletteHover || entryFallback?.hover || baseToken;
  const activeToken = paletteActive || entryFallback?.active || hoverToken;
  const foregroundToken =
    paletteForeground || entryFallback?.foreground || "210 20% 98%";

  try {
    // write runtime tokens pointing to palette tokens so you keep palette tokens authoritative:
    // using `var(--accent-<id>)` as the runtime pointer means you can later change theme tokens in CSS
    // and the runtime pointer still resolves.
    root.style.setProperty("--accent", `var(--accent-${accentId})`);
    root.style.setProperty("--accent-hover", `var(--accent-${accentId}-hover)`);
    root.style.setProperty(
      "--accent-active",
      `var(--accent-${accentId}-active, var(--accent-${accentId}-hover))`
    );
    root.style.setProperty(
      "--accent-foreground",
      `var(--accent-${accentId}-foreground)`
    );

    // compute stops for base/hover/active tokens (these are raw "H S% L%" strings)
    const baseStops = computeGradientStopsFromHslToken(baseToken);
    const hoverStops = computeGradientStopsFromHslToken(hoverToken);
    const activeStops = computeGradientStopsFromHslToken(activeToken);

    root.style.setProperty("--accent-stop-1", baseStops.stop1);
    root.style.setProperty("--accent-stop-2", baseStops.stop2);
    root.style.setProperty("--accent-stop-3", baseStops.stop3);

    root.style.setProperty("--accent-hover-stop-1", hoverStops.stop1);
    root.style.setProperty("--accent-hover-stop-2", hoverStops.stop2);
    root.style.setProperty("--accent-hover-stop-3", hoverStops.stop3);

    root.style.setProperty("--accent-active-stop-1", activeStops.stop1);
    root.style.setProperty("--accent-active-stop-2", activeStops.stop2);
    root.style.setProperty("--accent-active-stop-3", activeStops.stop3);

    // store readable computed foreground (useful for icons/checks)
    root.style.setProperty("--accent-foreground-computed", foregroundToken);

    // dataset for debugging and quick CSS
    root.dataset.accent = accentId;

    if (persist) {
      try {
        localStorage.setItem("accent", accentId);
      } catch {
        /* ignore storage errors */
      }
    }
  } catch (err) {
    // don't let failure stop the app; fall back to nothing
    console.error("applyAccent failed", err);
  }
}
