import {RefObject, useEffect, useRef, useState} from "react";
import { Header } from "@/components/Header";
import { ChatRevealPrompt } from "@/components/ui/chat-reveal";
import { Room, User } from "@/types";
import {ChatPanel} from "@/components/ui/chat-panel.tsx";
import {CardPositionProvider} from "@/utils/cardPositionContext.tsx";


export function PageLayout({ children, room, users, showChat }: {
  children: React.ReactNode;
  room?: Room;
  users?: User[];
  showChat?: boolean;
  setShowChat?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);

  useEffect(() => {
    if (showChat) {
      setChatVisible(true);
    }
  }, [showChat])
  // this ref map will be filled by the room view
  const cardRefs = useRef<Record<string, RefObject<HTMLDivElement>>>({});

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const anyDialogOpen = !!document.querySelector('[data-state="open"][role="dialog"]');
      document.body.classList.toggle('dialog-open', anyDialogOpen);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <CardPositionProvider cardRefs={cardRefs}>
      <div className="h-dvh flex flex-col">
        <Header
          room={room}
          users={users}
          onMenuOpenChange={setMenuOpen}
          chatOpen={chatVisible}
        />
        <ChatRevealPrompt
          onClick={() => setChatVisible(true)}
          menuOpen={menuOpen}
        />
        <main className="flex flex-1 min-h-0 flex-col overflow-hidden relative">
          {children}
          <ChatPanel
            room={room}
            user={
              (() => {
                try {
                  const raw = localStorage.getItem("user");
                  if (!raw) return undefined;
                  return JSON.parse(raw);
                } catch {
                  return users?.[0];
                }
              })()
            }
            visible={chatVisible}
            onClose={() => setChatVisible(false)}
          />
        </main>
      </div>
    </CardPositionProvider>
  );
}
