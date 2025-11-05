import path from "path";
import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-vite-plugin";
import { visualizer } from "rollup-plugin-visualizer";
import legacy from "@vitejs/plugin-legacy";
import viteCompression from "vite-plugin-compression";

// --- Optional: Google Analytics injector ---
const injectGoogleAnalytics = ({
                                 mode,
                                 GOOGLE_ANALYTICS_ID,
                               }: {
  mode: string;
  GOOGLE_ANALYTICS_ID: string;
}): Plugin => ({
  name: "inject-google-analytics",
  transformIndexHtml: {
    order: "pre",
    handler(html) {
      if (mode === "production" && GOOGLE_ANALYTICS_ID) {
        const googleAnalyticsScript = `
          <!-- Google tag (gtag.js) -->
          <script async src="https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}"></script>
          <script>
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_ANALYTICS_ID}');
          </script>
        `;
        return html.replace("</head>", `${googleAnalyticsScript}</head>`);
      }
      return html;
    },
  },
});

// --- React compiler config ---
const ReactCompilerConfig = {};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const GRAPHQL_ENDPOINT = env.VITE_GRAPHQL_ENDPOINT;
  const GOOGLE_ANALYTICS_ID = env.VITE_GOOGLE_ANALYTICS_ID;

  return {
    base: "/",
    plugins: [
      tanstackRouter(),
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
        },
      }),
      injectGoogleAnalytics({ mode, GOOGLE_ANALYTICS_ID }),
      visualizer({
        filename: "dist/stats.html",
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
      legacy({ targets: ["defaults", "not IE 11"] }),
      viteCompression({
        algorithm: "brotliCompress",
        ext: ".br"
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: "index.html",
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;

            if (
              id.includes("react") ||
              id.includes("@apollo") ||
              id.includes("graphql") ||
              id.includes("@tanstack")
            ) {
              return "vendor_core";
            }

            if (id.includes("@radix-ui") || id.includes("@astrouxds") || id.includes("lucide-react")) {
              return "vendor_ui";
            }

            return "vendor_misc";
          }
        }
      },
      chunkSizeWarningLimit: 800, // optional
    },
    server: {
      proxy: {
        "/api": {
          target: GRAPHQL_ENDPOINT,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      include: ["**/*.test.tsx", "**/*.test.ts"],
    },
  };
});
