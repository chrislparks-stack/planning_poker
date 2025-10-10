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

import "./index.css";

import { TooltipProvider } from "./components/ui/tooltip";
import { routeTree } from "./routeTree.gen";

// NEW: apply stored accent before mount so gradients & SVGs have the right colors on first paint

try {
  if (typeof document !== "undefined") {
    const stored = localStorage.getItem("accent") || "purple";
    // persist: false so we only write runtime tokens now (we'll persist on Save in the dialog)
    applyAccent(stored, { persist: false });
  }
} catch (err) {
  // if localStorage access is blocked or applyAccent fails, don't crash the app
  // eslint-disable-next-line no-console
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
