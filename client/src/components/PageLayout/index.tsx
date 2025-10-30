import { ReactElement, ReactNode, useState } from "react";
import { Header } from "@/components/Header";
import { ChatRevealPrompt } from "@/components/ui/chat-reveal";
import { Room, User } from "@/types";

interface PageLayoutProps {
  children: ReactNode;
  room?: Room;
  users?: User[];
}

export function PageLayout({ children, room, users }: PageLayoutProps): ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <Header
        room={room}
        users={users}
        onMenuOpenChange={setMenuOpen}
      />
      <ChatRevealPrompt
        onClick={() => console.log("reveal")}
        menuOpen={menuOpen}
      />
      <main className="flex flex-col flex-grow h-[calc(100vh-56px)] overflow-hidden">
        {children}
      </main>
    </>
  );
}
