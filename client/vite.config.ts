import path from "path";
import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-vite-plugin";

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
      },
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
