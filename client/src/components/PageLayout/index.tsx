import { AnimatePresence } from "framer-motion";
import {
  lazy,
  ReactNode,
  RefObject,
  Suspense,
  useEffect,
  useRef,
  useState
} from "react";

import { Header } from "@/components/Header";
import { ChatRevealPrompt } from "@/components/ui/chat-reveal";
import { ThemeHint } from "@/components/ui/theme-hint.tsx";
import { useAuth } from "@/contexts";
import { Room, User } from "@/types";
import { CardPositionProvider } from "@/utils/cardPositionContext.tsx";
import { getCookie, setCookie } from "@/utils/cookies.ts";

const ChatPanel = lazy(() =>
  import("@/components/ui/chat-panel.tsx").then(({ ChatPanel: Panel }) => ({
    default: Panel
  }))
);

export function PageLayout({
  children,
  room,
  users,
  showChat,
  setShowChat
}: {
  children: ReactNode;
  room?: Room;
  users?: User[];
  showChat?: boolean;
  setShowChat?: (value: boolean) => void;
}) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showThemeHint, setShowThemeHint] = useState(false);
  const [highlightAppearance, setHighlightAppearance] = useState(false);
  const [chatPanelLoaded, setChatPanelLoaded] = useState(Boolean(showChat));
  const cardRefs = useRef<Record<string, RefObject<HTMLDivElement>>>({});

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const anyDialogOpen = !!document.querySelector(
        '[data-state="open"][role="dialog"]'
      );
      document.body.classList.toggle("dialog-open", anyDialogOpen);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const hasOpenedMenu = getCookie("menuOpened");

    if (hasOpenedMenu) return;

    const timer = setTimeout(
      () => {
        setShowThemeHint(true);
      },
      5 * 60 * 1000
    );

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      const hasOpenedMenu = getCookie("menuOpened");

      if (!hasOpenedMenu) {
        setCookie("menuOpened", "true");
        setShowThemeHint(false);
      }
    }
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen && showThemeHint) {
      setHighlightAppearance(true);
      setShowThemeHint(false);
    }
  }, [menuOpen, showThemeHint]);

  useEffect(() => {
    if (showChat) setChatPanelLoaded(true);
  }, [showChat]);

  return (
    <CardPositionProvider cardRefs={cardRefs}>
      <div className="h-dvh flex flex-col">
        <Header
          room={room}
          users={users}
          onMenuOpenChange={setMenuOpen}
          chatOpen={showChat}
          highlightAppearance={highlightAppearance}
        />
        <AnimatePresence>
          {showThemeHint && (
            <ThemeHint
              onDismiss={() => {
                setCookie("menuOpened", "true");
                setShowThemeHint(false);
              }}
            />
          )}
        </AnimatePresence>
        {!menuOpen && (
          <ChatRevealPrompt
            onClick={() => setShowChat?.(true)}
            menuOpen={menuOpen}
            room={room}
            chatOpen={showChat}
          />
        )}
        <main className="flex flex-1 min-h-0 flex-col overflow-hidden relative">
          {children}
          {chatPanelLoaded && (
            <Suspense fallback={null}>
              <ChatPanel
                room={room}
                user={room?.users.find((roomUser) => roomUser.id === user?.id)}
                visible={showChat ?? false}
                onClose={() => setShowChat?.(false)}
              />
            </Suspense>
          )}
        </main>
      </div>
    </CardPositionProvider>
  );
}
