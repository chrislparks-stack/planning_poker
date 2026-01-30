import {CSSProperties, FC, useEffect, useMemo, useState} from "react";
import Mountain from "@/assets/silhouetted-mountain-range-at-dusk.jpg";

interface StarrySkyProps {
  gradient?: boolean;
  fallingStars?: boolean;
  mountains?: boolean;
}

type Star = {
  className: string;
  style: CSSProperties;
};

type ShootingStar = {
  id: number;
  top: string;
  left: string;
  angle: number;
  duration: number;
  length: number;
  travel: number;
};

function getAccentRGB(): [number, number, number] {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent-rgb")
    .trim();

  if (!raw) return [186, 147, 255]; // lilac fallback

  return raw.split(",").map(n => parseInt(n.trim(), 10)) as [
    number,
    number,
    number
  ];
}

function tint(
  [r, g, b]: [number, number, number],
  amount: number
): string {
  const mix = (c: number) =>
    Math.min(255, Math.round(c + (255 - c) * amount));

  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function generateNightSkyColors(): string[] {
  const accent = getAccentRGB();

  return [
    tint(accent, 0.0),
    tint(accent, 0.15),
    tint(accent, 0.3),
    tint(accent, 0.45),
    tint(accent, 0.6),
  ];
}

const nightsky = generateNightSkyColors();

const rand = (min: number, max: number) =>
  Math.random() * (max - min) + min;

const pickColor = () =>
  nightsky[Math.floor(rand(0, nightsky.length))];

function generateBackgroundShadows(count: number): string {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(
      `${rand(0, 100).toFixed(2)}vw ` +
      `${rand(0, 100).toFixed(2)}vh rgba(255,255,255,0.6)`
    );
  }
  return out.join(", ");
}

export const StarrySky: FC<StarrySkyProps> = ({gradient, fallingStars, mountains}) => {
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);

  useEffect(() => {
    let id = 0;
    let timeout: number;

    const spawn = () => {
      const star: ShootingStar = {
        id: id++,
        top: `${rand(5, 30)}vh`,
        left: `${rand(10, 75)}vw`,
        angle: rand(25, 65),
        duration: rand(600, 1500),
        length: rand(50, 220),
        travel: rand(400, 900)
      };

      setShootingStars(s => [...s, star]);

      // remove after animation
      window.setTimeout(() => {
        setShootingStars(s => s.filter(x => x.id !== star.id));
      }, star.duration + 200);

      // next spawn (random interval)
      timeout = window.setTimeout(spawn, rand(60_000, 300_000));
    };

    timeout = window.setTimeout(spawn, rand(10_000, 60_000));

    return () => window.clearTimeout(timeout);
  }, []);

  const { stars, crossStars, crossAuxStars, backgroundShadows } = useMemo(() => {
    const stars: Star[] = [];
    const crossStars: Star[] = [];
    const crossAuxStars: Star[] = [];

    /* -----------------------------
       INDIVIDUAL TWINKLE STARS
    ------------------------------ */

    for (let i = 0; i < 100; i++) {
      stars.push({
        className: "star star-1 blink",
        style: {
          top: `${rand(0, 70)}vh`,
          left: `${rand(0, 100)}vw`,
          animationDuration: `${rand(3, 8)}s`,
        },
      });
    }

    for (let i = 0; i < 90; i++) {
      stars.push({
        className: "star star-2 blink",
        style: {
          top: `${rand(0, 75)}vh`,
          left: `${rand(0, 100)}vw`,
          animationDuration: `${rand(4, 9)}s`,
        },
      });
    }

    for (let i = 0; i < 100; i++) {
      stars.push({
        className: "star star-4 blink",
        style: {
          top: `${rand(0, 70)}vh`,
          left: `${rand(0, 100)}vw`,
          animationDuration: `${rand(6, 12)}s`,
        },
      });
    }

    /* -----------------------------
             CROSS STARS
    ------------------------------ */

    for (let i = 0; i < 100; i++) {
      const color = pickColor();

      crossStars.push(
        {
          className: "blur",
          style: {
            top: `${rand(0, 100)}%`,
            left: `${rand(0, 100)}%`,
            backgroundColor: color,
          },
        },
        {
          className: "star star-1 blink",
          style: {
            top: `${rand(0, 100)}%`,
            left: `${rand(0, 100)}%`,
            animationDuration: `${rand(6, 12)}s`,
            backgroundColor: color,
          },
        }
      );
    }

    for (let i = 0; i < 50; i++) {
      if (i % 2 === 0) {
        stars.push({
          className: "star star-5",
          style: {
            top: `${rand(0, 50)}vh`,
            left: `${rand(0, 100)}vw`,
            animationDuration: `${rand(5, 7)}s`,
            backgroundColor: pickColor(),
          },
        });
      }

      const color = pickColor();

      crossAuxStars.push(
        {
          className: "blur",
          style: {
            top: `${rand(0, 100)}%`,
            left: `${rand(0, 100)}%`,
            backgroundColor: color,
          },
        },
        {
          className: "star star-2",
          style: {
            top: `${rand(0, 100)}%`,
            left: `${rand(0, 100)}%`,
            animationDuration: `${rand(4, 10)}s`,
            backgroundColor: color,
            boxShadow: `0 0 10px 1px ${pickColor()}`,
            opacity: 0.7,
          },
        }
      );
    }

    /* -----------------------------
       BACKGROUND STAR DENSITY
    ------------------------------ */

    const backgroundShadows = generateBackgroundShadows(1000);

    return { stars, crossStars, crossAuxStars, backgroundShadows };
  }, []);

  return (
    <div className="sky">
      <div className="stars-cross">
        {crossStars.map((s, i) => (
          <div key={i} className={s.className} style={s.style} />
        ))}
      </div>

      <div className="stars-cross-aux">
        {crossAuxStars.map((s, i) => (
          <div key={i} className={s.className} style={s.style} />
        ))}
      </div>

      {fallingStars === false ?
        null :
        <div className="shooting-stars">
          {shootingStars.map(star => (
            <div
              key={star.id}
              className="shooting-star"
              style={{
                top: star.top,
                left: star.left,
                "--angle": `${star.angle}deg`,
                "--duration": `${star.duration}ms`,
                "--tail-length": `${star.length}px`,
                "--travel": `${star.travel}px`
              } as CSSProperties}
            />
          ))}
        </div>
      }

      <div className="celestial-rotation">
        <div
          className="star-layer background-stars"
          style={{ "--stars": backgroundShadows } as CSSProperties}
        />

        <div className="stars">
          {stars.map((s, i) => (
            <div key={i} className={s.className} style={s.style} />
          ))}
        </div>
      </div>
      <div
        className={["bg-black",
          gradient !== false &&
            `before:absolute before:inset-0
            before:bg-gradient-to-b
            before:from-black
            before:via-accent/10
            before:to-accent/30
            after:absolute after:inset-0
            after:bg-gradient-to-b
            after:from-transparent
            after:via-accent/10
            after:to-accent/40`
        ]
        .filter(Boolean)
        .join(" ")}/>
      {mountains === false ?
        null :
        <div>
          <img
            src={Mountain}
            alt="Mountain Range1"
            className="absolute bottom-0 left-0 w-1/2 min-h-[200px] max-h-[650px] opacity-100"
          />
          <img
            src={Mountain}
            alt="Mountain Range2"
            className="absolute bottom-0 right-0 w-1/2 min-h-[200px] max-h-[650px] opacity-100 -scale-x-100"
          />
        </div>
      }
    </div>
  );
};
