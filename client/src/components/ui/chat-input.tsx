import React, {useState, useRef, useEffect, startTransition} from "react";
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
import { OverlayPortal } from "@/utils/overlayPortal.tsx";
import { motion } from "framer-motion";

interface ChatInputProps {
  onSend: (
    plain: string,
    formatted: string,
    position?: { x: number; y: number; width: number; height: number } | null
  ) => void;
  onClose?: () => void;
  className?: string;
  isLeftSide?: boolean;
  isTopSide?: boolean;
  /** when true, renders inline in a chat panel instead of popup overlay */
  inPanel?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onClose,
  className,
  isLeftSide = false,
  isTopSide = true,
  inPanel = false,
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
  const [isLoading, setIsLoading] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });

  const portalRoot =
    typeof document !== "undefined"
      ? document.getElementById("root") || document.body
      : null;

  const colors = [
    { color: "auto", name: "Auto" },
    { color: "#000000", name: "Charcoal" },
    { color: "#FFFFFF", name: "Opal" },
    { color: "#7C3AED", name: "Lilac" },
    { color: "#0EA5E9", name: "Aqua" },
    { color: "#059669", name: "Emerald" },
    { color: "#E11D48", name: "Rose" },
    { color: "#F59E0B", name: "Amber" },
  ];

  // Focus editor on mount
  useEffect(() => {
    if (inPanel) return; // panel input shouldn't auto-focus like overlay
    let attempts = 0;
    const tryFocus = () => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      const sel = window.getSelection();
      if (sel && sel.rangeCount === 0) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      if (document.activeElement !== editor && attempts < 10) {
        attempts++;
        setTimeout(tryFocus, 30);
      }
    };
    requestAnimationFrame(tryFocus);
  }, [inPanel]);

  // === Core handlers ===
  const handleSend = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const hasText = editor.innerText.trim().length > 0;
    const formatted = editor.innerHTML.trim();
    let messageHtml = formatted;
    if (attachments.length > 0) {
      const imgHtml = attachments
        .map(
          (src) =>
            `<img src="${src}" alt="attachment" style="border-radius:6px;margin:4px 0;display:block;object-fit:cover;max-width:100%;" />`
        )
        .join("");
      messageHtml += imgHtml;
    }
    if (!hasText && attachments.length === 0) return;
    onSend(editor.innerText.trim(), messageHtml);
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
    setTimeout(updateActiveStates, 10);
  };

  const applyColor = (color: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement !== editor) editor.focus();
    document.execCommand("styleWithCSS", false, "true");
    const resolved = color === "auto" ? "currentColor" : color;
    document.execCommand("foreColor", false, resolved);
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

  // === Global listeners ===
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        gifPickerRef.current?.contains(target)
      )
        return;
      if (!inPanel) onClose?.();
      setShowPalette(false);
      setShowGifPicker(false);
      setShowCustomPicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, inPanel]);

  useEffect(() => {
    const handler = () => updateActiveStates();
    document.addEventListener("mouseup", handler, true);
    document.addEventListener("keyup", handler, true);
    return () => {
      document.removeEventListener("mouseup", handler, true);
      document.removeEventListener("keyup", handler, true);
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };
    const handleBeforeInput = (e: InputEvent) => {
      const hasShift =
        (e as any).shiftKey ||
        (typeof (e as any).getModifierState === "function" &&
          (e as any).getModifierState("Shift"));
      if (e.inputType === "insertParagraph" && !hasShift) {
        e.preventDefault();
      }
    };
    editor.addEventListener("keydown", handleKeyDown);
    editor.addEventListener("beforeinput", handleBeforeInput);
    return () => {
      editor.removeEventListener("keydown", handleKeyDown);
      editor.removeEventListener("beforeinput", handleBeforeInput);
    };
  }, [handleSend]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        const key = e.key.toLowerCase();
        if (["b", "i", "u"].includes(key)) {
          e.preventDefault();
          applyCommand(key === "b" ? "bold" : key === "i" ? "italic" : "underline");
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
    document.addEventListener("selectionchange", updateActiveStates);
    return () => {
      editor?.removeEventListener("keydown", onKey);
      document.removeEventListener("selectionchange", updateActiveStates);
    };
  }, []);

  // === Attachments & GIFs ===
  const handleImageUpload = () => fileInputRef.current?.click();

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (src) setAttachments((prev) => [...prev, src]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const fetchGifs = async (query?: string) => {
    const term = query?.trim() || "trending";
    const apiKey = import.meta.env.VITE_TENOR_KEY || process.env.TENOR_KEY;
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
      term
    )}&key=${apiKey}&client_key=SummitPoker&limit=12`;

    try {
      setIsLoading(true);
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

      const filtered = normalized.filter((g: { url: string }) => !!g.url);

      // Preload all images before updating DOM
      const preloadAll = filtered.map(
        (g: { url: any }) =>
          new Promise((resolve) => {
            const img = new Image();
            img.src = g.url;
            img.onload = img.onerror = () => resolve(g);
          })
      );

      const loaded = await Promise.all(preloadAll);

      requestAnimationFrame(() => {
        setGifs(loaded);
        setIsLoading(false);
      });
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  const handleGifSelect = (url: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (url) setAttachments((prev) => [...prev, url]);
    setShowGifPicker(false);
  };

  const handleGifSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(() => fetchGifs(term));
    }, 300);
  };

  useEffect(() => {
    if (showGifPicker) fetchGifs();
  }, [showGifPicker]);

  useEffect(() => {
    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setPickerPos({
        top: Math.max(8, rect.top - 210),
        left: Math.max(8, rect.left + rect.width - 220),
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

  // === Shared Render sections ===
  const renderToolbar = () => {
    const iconSize = inPanel ? 17 : 14;        // slightly larger icons in panel
    const pad = inPanel ? "p-1.5" : "p-[5px]"; // and looser button padding

    return (
      <div
        className="flex justify-between px-1 items-center relative"
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="flex gap-1.5">
          {[{ icon: <Bold size={iconSize} />, key: "bold", cmd: "bold" },
            { icon: <Italic size={iconSize} />, key: "italic", cmd: "italic" },
            { icon: <Underline size={iconSize} />, key: "underline", cmd: "underline" }].map(
            ({ icon, key, cmd }) => (
              <button
                key={key}
                onClick={() => applyCommand(cmd)}
                className={cn(
                  `${pad} rounded-md text-accent hover:bg-accent/10 transition`,
                  activeFormats[key as keyof typeof activeFormats] &&
                  "bg-accent/25 ring-1 ring-accent/50"
                )}
              >
                {icon}
              </button>
            )
          )}
          <button
            onClick={() => setShowPalette((s) => !s)}
            className={cn(
              `${pad} rounded-md text-accent hover:bg-accent/10 transition`,
              showPalette && "bg-accent/25 ring-1 ring-accent/50"
            )}
            title="Text color"
          >
            <Palette size={iconSize} />
          </button>
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowGifPicker((s) => !s);
            }}
            className={cn(
              `${pad} rounded-md text-accent hover:bg-accent/10 transition`,
              showGifPicker && "bg-accent/25 ring-1 ring-accent/50"
            )}
            title="Insert GIF"
          >
            <ImagePlay size={inPanel ? 18 : 15} />
          </button>
          <button
            onClick={handleImageUpload}
            title="Upload Image"
            className={`${pad} rounded-md text-accent hover:bg-accent/10 transition`}
          >
            <Camera size={inPanel ? 18 : 15} />
          </button>
        </div>
      </div>
    );
  };

  const renderInput = () => (
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
          setIsEmpty(!hasText);
        }}
      />
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
  );

  const renderAttachments = () =>
    attachments.length > 0 && (
      <div className="flex flex-wrap flex-col mt-1 text-xs text-accent">
        Attachments:
        <div className="flex flex-wrap flex-row gap-2 mt-2 px-2">
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
                  setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 text-[10px] font-medium tracking-wide"
              >
                <X size={22} strokeWidth={2.5} className="opacity-80 mb-0.5" />
                REMOVE
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  const renderGifPicker = () => {
    if (!showGifPicker) return null;

    // INLINE MODE (chat panel)
    if (inPanel) {
      return (
        <div
          ref={gifPickerRef}
          className="border border-border rounded-xl bg-popover p-2 shadow-xl relative z-[60]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between mb-2">
            <input
              type="text"
              placeholder="Search Tenor GIFs..."
              className="w-full text-xs rounded-md px-2 py-[3px] bg-background/70 border border-border focus:ring-1 focus:ring-accent outline-none"
              onChange={handleGifSearch}
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
              <X size={12} />
            </button>
          </div>

          <div className="relative max-h-[160px] overflow-y-auto overflow-x-hidden">
            <div className="grid grid-cols-3 gap-1">
              {gifs.map((g) => (
                <motion.img
                  key={g.id}
                  src={g.url}
                  alt=""
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="rounded-md cursor-pointer hover:opacity-80 hover:scale-[1.02] transition-transform"
                  onClick={(e) => handleGifSelect(g.url, e)}
                />
              ))}
            </div>

            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/70 backdrop-blur-[1px] bg-background/40">
                Loading GIFs…
              </div>
            )}
          </div>

          <div className="flex justify-center py-1">
            <img src={tenorLogo} alt="Tenor" className="w-[60px] opacity-60" />
          </div>
        </div>
      );
    }

    // FLOATING / OVERLAY MODE (popup composer)
    if (!portalRoot) return null;

    return createPortal(
      <div
        ref={gifPickerRef}
        className="fixed w-[218px] border border-border rounded-xl shadow-xl bg-popover overflow-hidden z-[60]"
        style={{
          top: `${isTopSide ? pickerPos.top + 309 : pickerPos.top - 53}px`,
          left: `${pickerPos.left}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-popover/90 backdrop-blur-md p-3 border-b border-border flex justify-between items-center">
          <input
            type="text"
            placeholder="Search Tenor GIFs..."
            className="w-full text-sm rounded-md px-2 py-[2px] bg-background/70 border border-border focus:ring-1 focus:ring-accent outline-none"
            onChange={handleGifSearch}
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

        <div className="max-h-[210px] overflow-y-auto overflow-x-hidden">
          <div className="grid grid-cols-3 gap-1 p-3 pt-2">
            {gifs.map((g) => (
              <motion.img
                key={g.id}
                src={g.url}
                alt=""
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="rounded-md cursor-pointer hover:opacity-80 hover:scale-[1.02] transition-transform"
                onClick={(e) => handleGifSelect(g.url, e)}
              />
            ))}
          </div>
          <div className="sticky bottom-0 flex justify-center items-center bg-popover py-1">
            <img src={tenorLogo} alt="Tenor" className="w-[80px] opacity-70 mt-1" />
          </div>
        </div>
      </div>,
      portalRoot
    );
  };

  const renderColorPalette = () => (
    <div
      className={cn(
        "relative flex justify-center items-center gap-1 transition-all duration-200 overflow-visible",
        showPalette ? "max-h-12 opacity-100 mt-1" : "max-h-0 opacity-0 overflow-hidden"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* left-side custom droplet if isLeftSide */}
      {isLeftSide && (
        <>
          <button
            onClick={() => setShowCustomPicker((v) => !v)}
            className="relative w-5 h-5 rounded-full border border-border flex items-center justify-center hover:scale-110 transition-transform bg-gradient-to-r from-accent/40 to-background"
            title="Custom Color"
            aria-label="Custom color"
          >
            <Droplet size={13} className="text-accent" />
          </button>
          <div className="h-5 w-px bg-border mx-1" />
        </>
      )}

      {/* preset swatches */}
      {colors.map(({ color, name }, i) => (
        <React.Fragment key={color}>
          <button
            className="w-5 h-5 rounded-full border border-border hover:scale-110 hover:shadow-md transition-transform grid place-items-center"
            style={color === "auto" ? undefined : { backgroundColor: color }}
            title={name}
            aria-label={name}
            onClick={() => applyColor(color)}
          >
            {color === "auto" && (
              <span className="text-[10px] font-semibold leading-none text-foreground">
              A
            </span>
            )}
          </button>

          {color === "auto" && i < colors.length - 1 && (
            <div className="h-5 w-px bg-border mx-1" />
          )}
        </React.Fragment>
      ))}

      {/* right-side custom droplet if !isLeftSide */}
      {!isLeftSide && (
        <>
          <div className="h-5 w-px bg-border mx-1" />
          <button
            onClick={() => setShowCustomPicker((v) => !v)}
            className="relative w-5 h-5 rounded-full border border-border flex items-center justify-center hover:scale-110 transition-transform bg-gradient-to-r from-accent/40 to-background"
            title="Custom Color"
            aria-label="Custom color"
          >
            <Droplet size={13} className="text-accent" />
          </button>
        </>
      )}

      {/* custom picker bubble */}
      {showCustomPicker && (
        <>
          {inPanel ? (
            // INLINE MODE (panel)
            <div
              className={cn(
                "absolute z-[60] bg-popover border border-border rounded-xl shadow-xl p-3 w-[105px] h-[125px]",
                "-top-[140px] right-0"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <section className="small -mt-1 mb-1">
                <HexColorPicker color={customColor} onChange={setCustomColor} />
              </section>
              <button
                onClick={() => {
                  applyColor(customColor);
                  setShowCustomPicker(false);
                }}
                className="mt-1 w-full py-1 text-xs font-medium rounded-md bg-accent text-background hover:opacity-90 transition"
              >
                Apply
              </button>
            </div>
          ) : (
            // FLOATING / OVERLAY MODE (popup composer)
            <div
              className={cn(
                "absolute -top-[48px] bg-popover border border-border rounded-xl shadow-xl p-3 w-[105px] h-[125px]",
                isLeftSide ? "right-[212px]" : "left-[212px]"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <section className="small -mt-1 mb-1">
                <HexColorPicker color={customColor} onChange={setCustomColor} />
              </section>
              <button
                onClick={() => {
                  applyColor(customColor);
                  setShowCustomPicker(false);
                }}
                className="mt-1 w-full py-1 text-xs font-medium rounded-md bg-accent text-background hover:opacity-90 transition"
              >
                Apply
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // === MAIN RETURN ===
  const coreContent = (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col items-stretch justify-center space-y-2 relative",
        inPanel
          ? "rounded-none bg-transparent border-none shadow-none p-2"
          : "rounded-2xl bg-accent/20 border border-accent/30 shadow-lg backdrop-blur-md px-2 pt-1 pb-2",
        className
      )}
      style={inPanel ? undefined : { width: 220 }}
      onClick={() => showGifPicker && setShowGifPicker(false)}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileSelected}
        className="hidden"
      />
      {renderToolbar()}
      {renderColorPalette()}
      {renderGifPicker()}
      {renderInput()}
      {renderAttachments()}
    </div>
  );

  if (inPanel) return coreContent;
  return <OverlayPortal>{coreContent}</OverlayPortal>;
};
