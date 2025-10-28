import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  SendHorizonal,
  Image as ImageIcon,
  Underline,
  Palette,
  ImagePlay,
  Bold,
  Italic,
} from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onClose?: () => void;
  className?: string;
}

/**
 * ChatInput – inline chat composer with text formatting and color options.
 */
export const ChatInput: React.FC<ChatInputProps> = ({
                                                      onSend,
                                                      onClose,
                                                      className,
                                                    }) => {
  const [showPalette, setShowPalette] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const [isEmpty, setIsEmpty] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);

  const colors = [
    { color: "#000000", name: "Black" },
    { color: "#FFFFFF", name: "White" },
    { color: "#7C3AED", name: "Electric Lilac" },
    { color: "#0EA5E9", name: "Arctic Aqua" },
    { color: "#059669", name: "Verdant Emerald" },
    { color: "#E11D48", name: "Crimson Rose" },
    { color: "#F59E0B", name: "Solar Amber" }
  ];

  const handleSend = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const msg = editor.innerText.trim();
    if (msg) onSend(msg);
    editor.innerHTML = "";
    setIsEmpty(true);
    onClose?.();
  };

  const applyCommand = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    updateActiveStates();
  };

  const updateActiveStates = () => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        const key = e.key.toLowerCase();
        if (key === "b") {
          e.preventDefault();
          applyCommand("bold");
        } else if (key === "i") {
          e.preventDefault();
          applyCommand("italic");
        } else if (key === "u") {
          e.preventDefault();
          applyCommand("underline");
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSend();
      } else if (e.key === "Escape") {
        onClose?.();
      }
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener("keydown", onKey);
      editor.addEventListener("keyup", updateActiveStates);
      editor.addEventListener("mouseup", updateActiveStates);
    }
    return () => {
      if (editor) {
        editor.removeEventListener("keydown", onKey);
        editor.removeEventListener("keyup", updateActiveStates);
        editor.removeEventListener("mouseup", updateActiveStates);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        "rounded-2xl bg-accent/20 border border-accent/30 shadow-lg backdrop-blur-sm",
        "flex flex-col items-stretch justify-center px-2 pt-1 pb-2 space-y-1 relative",
        className
      )}
      style={{ width: 270 }}
    >
    {/* Toolbar */}
      <div className="flex flex-row items-center justify-between px-1">
        <div className="flex flex-row gap-1">
          <button
            onClick={() => applyCommand("bold")}
            title="Bold (Ctrl+B)"
            className={cn(
              "p-[5px] rounded-md transition text-accent hover:bg-accent/10",
              activeFormats.bold && "bg-accent/25 ring-1 ring-accent/50"
            )}
          >
            <Bold size={14} />
          </button>
          <button
            onClick={() => applyCommand("italic")}
            title="Italic (Ctrl+I)"
            className={cn(
              "p-[5px] rounded-md transition text-accent hover:bg-accent/10",
              activeFormats.italic && "bg-accent/25 ring-1 ring-accent/50"
            )}
          >
            <Italic size={14} />
          </button>
          <button
            onClick={() => applyCommand("underline")}
            title="Underline (Ctrl+U)"
            className={cn(
              "p-[5px] rounded-md transition text-accent hover:bg-accent/10",
              activeFormats.underline && "bg-accent/25 ring-1 ring-accent/50"
            )}
          >
            <Underline size={14} />
          </button>

          {/* Color Palette */}
          <div className="relative">
            <button
              onClick={() => setShowPalette((s) => !s)}
              title="Text color"
              className={cn(
                "p-[5px] rounded-md text-accent hover:bg-accent/10 transition",
                showPalette && "bg-accent/25 ring-1 ring-accent/50"
              )}
            >
              <Palette size={14} />
            </button>

            {showPalette && (
              <div className="absolute mb-2 -left-24 bg-popover border border-border rounded-lg shadow-lg p-3 w-[238px] z-50">
                {colors.map(({ color, name }) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded-full border border-border hover:scale-110 hover:shadow-lg transition-transform"
                    style={{ backgroundColor: color }}
                    title={name}
                    onClick={() => {
                      applyCommand("foreColor", color);
                      setShowPalette(false);
                    }}
                  />
                ))}
                  <button
                    title="Custom"
                    className="w-6 h-6 ml-5 rounded-full border border-border animate-color-cycle hover:scale-110 hover:shadow-lg transition-transform"
                    onClick={() => {
                      const picker = document.createElement("input");
                      picker.type = "color";
                      picker.oninput = (e) =>
                        applyCommand(
                          "foreColor",
                          (e.target as HTMLInputElement).value
                        );
                      picker.click();
                      setShowPalette(false);
                    }}
                  />

              </div>
            )}
          </div>
        </div>

        {/* Media */}
        <div className="flex flex-row gap-1">
          <button
            onClick={() => alert("GIF picker coming soon")}
            title="Send GIF"
            className="p-[5px] rounded-md text-accent hover:bg-accent/10 transition"
          >
            <ImagePlay size={15} />
          </button>
          <button
            onClick={() => alert("Image upload coming soon")}
            title="Send Image"
            className="p-[5px] rounded-md text-accent hover:bg-accent/10 transition"
          >
            <ImageIcon size={15} />
          </button>
        </div>
      </div>

      {/* Editable message input */}
      <div className="relative w-full">
        <div
          ref={editorRef}
          id="chat-input-field"
          contentEditable
          suppressContentEditableWarning
          className={cn(
            "w-full bg-background/95 text-sm rounded-xl min-h-[34px]",
            "px-3 py-2 pr-10 outline-none overflow-y-auto",
            "focus:ring-1 focus:ring-accent relative"
          )}
          style={{ whiteSpace: "pre-wrap" }}
          onInput={(e) => setIsEmpty(!e.currentTarget.textContent?.trim())}
        />
        {isEmpty && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm opacity-60 pointer-events-none select-none">
            Type message...
          </span>
        )}
        <button
          onClick={handleSend}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-accent hover:bg-accent/10 transition"
          title="Send"
        >
          <SendHorizonal size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};
