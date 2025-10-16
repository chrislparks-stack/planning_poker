import { FC, useEffect, useRef, useState } from "react";

interface CardFanProps {
  selectedCards: (string | number)[];
  toggleCardSelection: (card: string | number) => void;
  className?: string;
}

const DEFAULT_CARDS = [0, 0.5, 1, 2, 3, 5, 8, 13, 21, "?", "☕"];

export const CardFan: FC<CardFanProps> = ({
  selectedCards,
  toggleCardSelection,
  className = ""
}) => {
  const [scaleFactor, setScaleFactor] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const baseWidth = 640;

    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        // curve the scaling for smoother compression:
        const linear = Math.min(width / baseWidth, 1);
        const curved = Math.pow(linear, 0.75); // less squish at large sizes
        setScaleFactor(curved);
      }
    };

    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    updateScale();

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`relative mt-4 h-56 w-full ${className}`}
      ref={containerRef}
    >
      <div className="mb-2 text-sm">Pick poker cards to use:</div>
      <div className="flex justify-center items-baseline h-full overflow-visible">
        {DEFAULT_CARDS.map((card, index) => {
          const total = DEFAULT_CARDS.length;
          const middle = (total - 1) / 2;
          const offset = index - middle;

          const rotate = offset * 5.5;
          const baseSpacing = 48; // slightly wider baseline
          const spacing = baseSpacing * scaleFactor;
          const translateX = offset * spacing;
          const arcStrength = 2.2;
          const arc = Math.pow(offset, 2) * arcStrength;
          const selected = selectedCards.some(
            (c) => String(c) === String(card)
          );

          return (
            <button
              key={String(card)}
              onClick={() => toggleCardSelection(card)}
              aria-pressed={selected}
              className={`absolute w-12 h-20 rounded-md text-sm font-semibold transition-transform duration-300 ease-out
                flex items-center justify-center shadow-md
                ${
                  selected
                    ? "bg-accent text-white hover:bg-accent-hover"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                }`}
              style={{
                left: "50%",
                transform: `translateX(calc(${translateX}px - 24px)) translateY(${arc}px) rotate(${rotate}deg)`,
                zIndex: 1000 + index,
                boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = `translateX(calc(${translateX}px - 24px)) translateY(${
                  arc - 20
                }px) rotate(${rotate}deg) scale(1.05)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = `translateX(calc(${translateX}px - 24px)) translateY(${arc}px) rotate(${rotate}deg)`;
              }}
            >
              {card}
            </button>
          );
        })}
      </div>
    </div>
  );
};
