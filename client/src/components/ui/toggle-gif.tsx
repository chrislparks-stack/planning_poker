import React, { useState, useEffect } from "react";
import {cn} from "@/lib/utils.ts";

export const ToggleGif: React.FC<{ src: string; alt?: string }> = ({ src, alt }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [staticFrame, setStaticFrame] = useState<string | null>(null);

  useEffect(() => {
    // Extract the first frame of the GIF for paused mode
    const extractFrame = async () => {
      const img = document.createElement("img");
      img.crossOrigin = "anonymous";
      img.src = src;
      await new Promise((r) => (img.onload = r));

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0, img.width, img.height);
      setStaticFrame(canvas.toDataURL("image/png"));
    };

    extractFrame().catch(() => setStaticFrame(null));
  }, [src]);

  return (
    <div
      className="relative group cursor-pointer inline-block rounded-xl overflow-hidden"
      onClick={() => setIsPlaying((p) => !p)}
    >
      <img
        src={isPlaying ? src : staticFrame || src}
        alt={alt || "gif"}
        className="rounded-lg max-w-full object-contain border border-accent/30 shadow-[0_0_12px_rgba(var(--accent-rgb),0.25)] transition-all duration-300"
      />

      {/* Overlay */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "bg-[rgba(0,0,0,0.35)] backdrop-blur-[2px]"
        )}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "bg-[hsl(var(--background)/0.75)] border border-accent/60",
            "shadow-[0_0_12px_rgba(var(--accent-rgb),0.4)] text-accent",
            "transition-transform duration-200 group-hover:scale-105"
          )}
        >
          {isPlaying ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-fit h-fit"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-fit h-fit"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};
