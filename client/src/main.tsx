// src/main.tsx
import { ApolloProvider } from "@apollo/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { client } from "@/api";
import { ConfirmationDialogProvider } from "@/components/ConfirmationDialog";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts";
import { applyAccent } from "@/lib/theme-accent";
import { NotFoundPage } from "@/pages/NotFoundPage";

import { TooltipProvider } from "./components/ui/tooltip";
import { routeTree } from "./routeTree.gen";

import "./index.css";

import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

try {
  if (typeof document !== "undefined") {
    const stored = localStorage.getItem("accent") || "lilac";
    applyAccent(stored, { persist: false });
  }
} catch (err) {
  console.warn("Failed to apply stored accent on startup:", err);
}

const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundPage
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const container = document.getElementById("root") as HTMLElement;
container.classList.add("h-full");
const root = createRoot(container);

root.render(
  <StrictMode>
    {import.meta.env.PROD ? <VercelAnalytics /> : null}
    {import.meta.env.PROD ? <SpeedInsights /> : null}
    <Toaster />
    <ThemeProvider defaultTheme="dark">
      <ApolloProvider client={client}>
        <TooltipProvider>
          <AuthProvider>
            <ConfirmationDialogProvider>
              <RouterProvider router={router} />
            </ConfirmationDialogProvider>
          </AuthProvider>
        </TooltipProvider>
      </ApolloProvider>
    </ThemeProvider>
  </StrictMode>
);
