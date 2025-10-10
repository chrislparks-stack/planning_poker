/** @type {import('tailwindcss').Config} */
function hslVar(varName) {
  // supports `bg-accent/50` style:
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `hsl(var(${varName}) / ${opacityValue})`;
    }
    return `hsl(var(${varName}))`;
  };
}

module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },

      // ---- COLORS ----
      colors: {
        background: hslVar("--background"),
        foreground: hslVar("--foreground"),

        card: {
          DEFAULT: hslVar("--card"),
          foreground: hslVar("--card-foreground")
        },
        popover: {
          DEFAULT: hslVar("--popover"),
          foreground: hslVar("--popover-foreground")
        },

        primary: {
          DEFAULT: hslVar("--primary"),
          foreground: hslVar("--primary-foreground")
        },
        secondary: {
          DEFAULT: hslVar("--secondary"),
          foreground: hslVar("--secondary-foreground")
        },
        muted: {
          DEFAULT: hslVar("--muted"),
          foreground: hslVar("--muted-foreground")
        },

        // The dynamic "active" accent (set by dialog at runtime)
        accent: {
          DEFAULT: hslVar("--accent"),
          foreground: hslVar("--accent-foreground")
        },

        "accent-hover": hslVar("--accent-hover"),
        "accent-active": hslVar("--accent-active"),
        "accent-foreground": hslVar("--accent-foreground"),

        // Named palettes — static variable names we also define in CSS
        "accent-purple": {
          DEFAULT: hslVar("--accent-purple"),
          foreground: hslVar("--accent-purple-foreground"),
          hover: hslVar("--accent-purple-hover")
        },
        "accent-indigo": {
          DEFAULT: hslVar("--accent-indigo"),
          foreground: hslVar("--accent-indigo-foreground"),
          hover: hslVar("--accent-indigo-hover")
        },
        "accent-emerald": {
          DEFAULT: hslVar("--accent-emerald"),
          foreground: hslVar("--accent-emerald-foreground"),
          hover: hslVar("--accent-emerald-hover")
        },
        "accent-rose": {
          DEFAULT: hslVar("--accent-rose"),
          foreground: hslVar("--accent-rose-foreground"),
          hover: hslVar("--accent-rose-hover")
        },
        "accent-amber": {
          DEFAULT: hslVar("--accent-amber"),
          foreground: hslVar("--accent-amber-foreground"),
          hover: hslVar("--accent-amber-hover")
        },

        destructive: {
          DEFAULT: hslVar("--destructive"),
          foreground: hslVar("--destructive-foreground")
        },

        border: hslVar("--border"),
        input: hslVar("--input"),
        ring: hslVar("--ring"),

        chart: {
          1: hslVar("--chart-1"),
          2: hslVar("--chart-2"),
          3: hslVar("--chart-3"),
          4: hslVar("--chart-4"),
          5: hslVar("--chart-5")
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};
