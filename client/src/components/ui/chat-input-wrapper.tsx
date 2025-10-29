// @ts-ignore
import React, { useEffect, useState } from "react";
import { ChatInput } from "@/components/ui/chat-input";

export const ChatInputWrapper = ({
   onSend,
   onClose,
   className,
   isOpen,
 }: {
  onSend: (plain: string, formatted: string) => void;
  onClose: () => void;
  className?: string;
  isOpen: boolean;
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animClass, setAnimClass] = useState("");

  useEffect(() => {
    if (isOpen) {
      // keep it hidden for the first frame
      setShouldRender(true);
      setAnimClass("opacity-0 translate-y-[-8px]");
      const timer = setTimeout(() => {
        setAnimClass("animate-fade-slide-down");
      }, 20); // small delay lets the browser paint the hidden state first
      return () => clearTimeout(timer);
    } else {
      setAnimClass("animate-fade-slide-up");
      const timeout = setTimeout(() => setShouldRender(false), 400);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  const handleInternalClose = () => {
    setAnimClass("animate-fade-slide-up");
    setTimeout(() => {
      onClose();
      setShouldRender(false);
    }, 400);
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`absolute ${className} z-50 transition-all duration-400 ease-&lsqb;cubic-bezier(0.4,0,0.2,1)&rsqb; ${animClass}`}
      style={{ opacity: 0, transform: "translateY(-8px)", animationFillMode: "forwards" }}
    >
      <ChatInput onSend={onSend} onClose={handleInternalClose} />
    </div>
  );
};
