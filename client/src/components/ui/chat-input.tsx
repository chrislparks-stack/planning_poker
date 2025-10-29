import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  SendHorizonal,
  Underline,
  Palette,
  ImagePlay,
  Bold,
  Italic,
  Camera,
  X,
  Droplet,
} from "lucide-react";
import tenorLogo from "@/assets/PB_tenor_logo_grey_vertical.svg";
import { HexColorPicker } from "react-colorful";
import {OverlayPortal} from "@/utils/overlayPortal.tsx";

interface ChatInputProps {
  onSend: (plain: string, formatted: string) => void;
  onClose?: () => void;
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
                                                      onSend,
                                                      onClose,
                                                      className,
                                                    }) => {
  const [showPalette, setShowPalette] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customColor, setCustomColor] = useState("#7C3AED");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifs, setGifs] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const [isEmpty, setIsEmpty] = useState(true);

  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });

  const portalRoot =
    typeof document !== "undefined"
      ? document.getElementById("root") || document.body
      : null;

  const colors = [
    { color: "#000000", name: "Black" },
    { color: "#FFFFFF", name: "White" },
    { color: "#7C3AED", name: "Electric Lilac" },
    { color: "#0EA5E9", name: "Arctic Aqua" },
    { color: "#059669", name: "Verdant Emerald" },
    { color: "#E11D48", name: "Crimson Rose" },
    { color: "#F59E0B", name: "Solar Amber" },
  ];

  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.focus();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, []);

  const handleSend = () => {
    const editor = editorRef.current;
    if (!editor) return;

    // --- FIX: ensure images render in messages correctly ---
    const plain = editor.innerText.trim();
    const formatted = editor.innerHTML.trim();

    const imgHtml =
      attachments.length > 0
        ? attachments
          .map(
            (src) =>
              `<img src="${src}" alt="attachment" style="max-width:100%;border-radius:6px;margin:4px 0;display:block;object-fit:cover;" />`
          )
          .join("")
        : "";

    // Wrap formatted + image HTML so <img> stays valid
    const combined = `${formatted}${imgHtml}`;

    if (plain || formatted || attachments.length > 0) {
      onSend(plain, combined);
    }

    editor.innerHTML = "";
    setAttachments([]);
    setIsEmpty(true);
    onClose?.();
  };

  const applyCommand = (cmd: string, value?: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement !== editor) editor.focus();
    document.execCommand(cmd, false, value);
    updateActiveStates();
  };

  const applyColor = (color: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement !== editor) editor.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("foreColor", false, color);
    setShowPalette(false);
    setShowCustomPicker(false);
    editor.focus();
  };

  const updateActiveStates = () => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        gifPickerRef.current?.contains(target)
      )
        return;
      onClose?.();
      setShowPalette(false);
      setShowGifPicker(false);
      setShowCustomPicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

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
    editor?.addEventListener("keydown", onKey);
    editor?.addEventListener("keyup", updateActiveStates);
    editor?.addEventListener("mouseup", updateActiveStates);
    return () => {
      editor?.removeEventListener("keydown", onKey);
      editor?.removeEventListener("keyup", updateActiveStates);
      editor?.removeEventListener("mouseup", updateActiveStates);
    };
  }, []);

  const handleImageUpload = () => fileInputRef.current?.click();
  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (src) {
        setAttachments((prev) => [...prev, src]);
        setIsEmpty(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const fetchGifs = async (query?: string) => {
    const searchTerm = query?.trim() || "trending";
    const apiKey = import.meta.env.VITE_TENOR_KEY || process.env.TENOR_KEY;
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
      searchTerm
    )}&key=${apiKey}&client_key=SummitPoker&limit=12`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      const normalized = (data.results || []).map((g: any) => {
        const fm = g.media_formats || {};
        const url =
          fm.gif?.url ||
          fm.mediumgif?.url ||
          fm.tinygif?.url ||
          g.media?.[0]?.gif?.url ||
          g.url ||
          "";
        return { id: g.id, url };
      });
      setGifs(normalized.filter((g: { url: any; }) => !!g.url));
    } catch {
      setGifs([]);
    }
  };

  const handleGifSelect = (url: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (url) {
      setAttachments((prev) => [...prev, url]);
      setIsEmpty(false);
    }
    setShowGifPicker(false);
  };

  useEffect(() => {
    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setPickerPos({
        top: Math.max(8, rect.top - 210),
        left: Math.max(8, rect.left + rect.width - 260),
      });
    };
    updatePosition();
    if (showGifPicker) {
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [showGifPicker]);

  useEffect(() => {
    if (showGifPicker) fetchGifs();
  }, [showGifPicker]);

  // --- FIX: increase stacking context for all overlays ---
  const customPicker = showCustomPicker ? (
    <div
      className="absolute -top-[65px] left-[262px] bg-popover border border-border rounded-xl shadow-xl p-3 w-[120px]"
      onClick={(e) => e.stopPropagation()}
    >
      <section className="small">
        <HexColorPicker color={customColor} onChange={setCustomColor} />
      </section>
      <button
        onClick={() => {
          applyColor(customColor);
          setShowCustomPicker(false);
        }}
        className="mt-1 w-full py-1 text-sm font-medium rounded-md bg-accent text-background hover:opacity-90 transition"
      >
        Apply
      </button>
    </div>
  ) : null;

  const gifPicker = showGifPicker ? (
    <div
      ref={gifPickerRef}
      className="fixed w-[252px] max-h-[210px] overflow-y-auto border border-border rounded-xl shadow-xl bg-popover"
      style={{ top: `${pickerPos.top}px`, left: `${pickerPos.left}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="sticky top-0 bg-popover/90 backdrop-blur-md p-3 border-b border-border flex justify-between items-center">
        <input
          type="text"
          placeholder="Search Tenor GIFs..."
          className="w-full text-sm rounded-md px-2 py-[2px] bg-background/70 border border-border focus:ring-1 focus:ring-accent outline-none"
          onChange={(e) => fetchGifs(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowGifPicker(false);
          }}
          className="ml-2 text-muted-foreground hover:text-foreground transition"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1 p-3 pt-2">
        {gifs.map((g) => (
          <img
            key={g.id}
            src={g.url}
            alt=""
            className="w-full rounded-md cursor-pointer hover:opacity-80 hover:scale-[1.02] transition-transform"
            onClick={(e) => handleGifSelect(g.url, e)}
          />
        ))}
      </div>
      <div className="flex justify-center items-center py-1">
        <img src={tenorLogo} alt="Tenor" className="w-[80px] opacity-60 mt-1" />
      </div>
    </div>
  ) : null;

  return (
    <OverlayPortal>
      <div
        ref={containerRef}
        className={cn(
          "rounded-2xl bg-accent/20 border border-accent/30 shadow-lg backdrop-blur-md",
          "flex flex-col items-stretch justify-center px-2 pt-1 pb-2 space-y-2 relative",
          className
        )}
        style={{ width: 270 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileSelected}
          className="hidden"
        />

        {/* Toolbar */}
        <div className="flex justify-between px-1 items-center relative">
          <div className="flex gap-1">
            {[{ icon: <Bold size={14} />, key: "bold", cmd: "bold" },
              { icon: <Italic size={14} />, key: "italic", cmd: "italic" },
              { icon: <Underline size={14} />, key: "underline", cmd: "underline" }].map(({ icon, key, cmd }) => (
              <button
                key={key}
                onClick={() => applyCommand(cmd)}
                className={cn(
                  "p-[5px] rounded-md text-accent hover:bg-accent/10 transition",
                  activeFormats[key as keyof typeof activeFormats] &&
                  "bg-accent/25 ring-1 ring-accent/50"
                )}
              >
                {icon}
              </button>
            ))}
            <button
              onClick={() => setShowPalette((s) => !s)}
              className={cn(
                "p-[5px] rounded-md text-accent hover:bg-accent/10 transition",
                showPalette && "bg-accent/25 ring-1 ring-accent/50"
              )}
              title="Text color"
            >
              <Palette size={14} />
            </button>
          </div>

          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowGifPicker((s) => !s);
              }}
              className="p-[5px] rounded-md text-accent hover:bg-accent/10 transition"
              title="Insert GIF"
            >
              <ImagePlay size={15} />
            </button>
            <button
              onClick={handleImageUpload}
              title="Upload Image"
              className="p-[5px] rounded-md text-accent hover:bg-accent/10 transition"
            >
              <Camera size={15} />
            </button>
          </div>
        </div>

        {/* Color palette */}
        <div
          className={cn(
            "relative flex justify-center gap-2 transition-all duration-200 overflow-visible items-center",
            showPalette ? "max-h-12 opacity-100 mt-1" : "max-h-0 opacity-0 overflow-hidden"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {colors.map(({ color, name }) => (
            <button
              key={color}
              className="w-5 h-5 rounded-full border border-border hover:scale-110 hover:shadow-md transition-transform"
              style={{ backgroundColor: color }}
              title={name}
              onClick={() => applyColor(color)}
            />
          ))}
          <button
            onClick={() => setShowCustomPicker((v) => !v)}
            className="relative w-5 h-5 rounded-full border border-border flex items-center justify-center hover:scale-110 transition-transform bg-gradient-to-r from-accent/40 to-background"
            title="Custom color"
          >
            <Droplet size={13} className="text-accent" />
          </button>
          {customPicker}
        </div>

        {portalRoot && showGifPicker && createPortal(gifPicker, portalRoot)}

        {/* Input + chips */}
        <div className="relative w-full">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className={cn(
              "w-full bg-background/95 text-sm rounded-xl min-h-[38px] max-h-[80px]",
              "px-3 py-2 pr-10 outline-none overflow-y-auto focus:ring-1 focus:ring-accent"
            )}
            style={{ whiteSpace: "pre-wrap" }}
            onInput={(e) => {
              const el = e.currentTarget;
              const hasText = !!el.textContent?.trim();
              setIsEmpty(!hasText && attachments.length === 0);
            }}
          />

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 px-2">
              {attachments.map((src, i) => (
                <div
                  key={i}
                  className="relative w-[48px] h-[48px] rounded-md overflow-hidden border border-border flex-shrink-0 group cursor-pointer"
                >
                  <img
                    src={src}
                    alt="attachment"
                    className="object-cover w-full h-full rounded-md transition-transform group-hover:scale-105"
                  />
                  <div
                    onClick={() =>
                      setAttachments((prev) =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                    className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium tracking-wide"
                  >
                    <X size={22} strokeWidth={2.5} className="opacity-80 mb-0.5" />
                    REMOVE
                  </div>
                </div>
              ))}
            </div>
          )}

          {isEmpty && (
            <span className="absolute left-3 top-2 text-muted-foreground text-sm opacity-60 pointer-events-none select-none">
              Type message...
            </span>
          )}

          <button
            onClick={handleSend}
            className="absolute right-2 bottom-1 p-1.5 rounded-md text-accent hover:bg-accent/10 transition"
            title="Send"
          >
            <SendHorizonal size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </OverlayPortal>
  );
};
