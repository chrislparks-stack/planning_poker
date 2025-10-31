import {RefObject, useRef, useState} from "react";
import { Header } from "@/components/Header";
import { ChatRevealPrompt } from "@/components/ui/chat-reveal";
import { Room, User } from "@/types";
import {ChatPanel} from "@/components/ui/chat-panel.tsx";
import {CardPositionProvider} from "@/utils/cardPositionContext.tsx";


export function PageLayout({ children, room, users }: {
  children: React.ReactNode;
  room?: Room;
  users?: User[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);

  // this ref map will be filled by the room view
  const cardRefs = useRef<Record<string, RefObject<HTMLDivElement>>>({});

  return (
    <CardPositionProvider cardRefs={cardRefs.current}>
      <Header room={room} users={users} onMenuOpenChange={setMenuOpen} />
      <ChatRevealPrompt onClick={() => setChatVisible(true)} menuOpen={menuOpen} />

      <main className="flex flex-col flex-grow h-[calc(100vh-56px)] overflow-hidden relative">
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
    </CardPositionProvider>
  );
}
