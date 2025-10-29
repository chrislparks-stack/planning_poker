import React, { useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

export const OverlayPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ghostRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number }>();

  useLayoutEffect(() => {
    const update = () => {
      const rect = ghostRef.current?.getBoundingClientRect();
      if (!rect) return;

      // no scroll offsets here, because fixed coords are viewport-relative
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <>
      {/* The invisible ghost stays in normal layout */}
      <div ref={ghostRef} style={{ display: "inline-block", width: "fit-content" }} />

      {/* The portaled element visually follows the ghost */}
      {coords &&
        ReactDOM.createPortal(
          <div
            style={{
              position: "fixed",
              top: coords.top - 15,
              left: coords.left - 270,
              width: coords.width,
              height: coords.height,
              pointerEvents: "auto",
              isolation: "isolate",
              zIndex: 99999,
            }}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
};
