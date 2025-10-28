/** @type {import('tailwindcss').Config} */
function hslVar(varName) {
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
				accent: {
					DEFAULT: hslVar("--accent"),
					foreground: hslVar("--accent-foreground")
				},
				"accent-hover": hslVar("--accent-hover"),
				"accent-active": hslVar("--accent-active"),
				"accent-foreground": hslVar("--accent-foreground"),

				"accent-lilac": {
					DEFAULT: hslVar("--accent-lilac"),
					foreground: hslVar("--accent-lilac-foreground"),
					hover: hslVar("--accent-lilac-hover")
				},
				"accent-aqua": {
					DEFAULT: hslVar("--accent-aqua"),
					foreground: hslVar("--accent-aqua-foreground"),
					hover: hslVar("--accent-aqua-hover")
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
			},

			// ---- ANIMATIONS ----
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" }
				},
				"color-cycle": {
					"0%": { backgroundColor: "hsl(var(--accent-lilac))" },
					"25%": { backgroundColor: "hsl(var(--accent-aqua))" },
					"50%": { backgroundColor: "hsl(var(--accent-emerald))" },
					"75%": { backgroundColor: "hsl(var(--accent-amber))" },
					"100%": { backgroundColor: "hsl(var(--accent-lilac))" }
				},
				"fade-slide-down": {
					"0%": { opacity: "0", transform: "translateY(-8px)" },
					"100%": { opacity: "1", transform: "translateY(0)" }
				},
				"fade-slide-up": {
					"0%": { opacity: "1", transform: "translateY(0)" },
					"100%": { opacity: "0", transform: "translateY(-8px)" }
				}
			},
			animation: {
				"accordion-down": "accordion-down 0.7s ease-out",
				"accordion-up": "accordion-up 0.7s ease-out",
				"color-cycle": "color-cycle 3s linear infinite",
				"fade-slide-down": "fade-slide-down 0.4s ease-out",
				"fade-slide-up": "fade-slide-up 0.4s ease-in forwards"
			}
		}
	},
	plugins: [require("tailwindcss-animate")]
};
