// scene.tsx
import { motion } from "framer-motion";
import { ReactNode } from "react";

export type Direction = "up" | "down";

const sceneVariants = {
  enter: (dir: Direction) => ({
    x: 0,
    y: dir === "down" ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    y: 0,
    opacity: 1,
  },
  exit: (dir: Direction) => ({
    x: 0,
    y: dir === "down" ? -40 : 40,
    opacity: 0,
  }),
};

export const Scene = ({
  children,
  direction,
}: {
  children: ReactNode;
  direction: Direction;
}) => (
  <motion.div
    className="absolute inset-0 w-full flex items-center justify-center"
    layout={false}
    custom={direction}
    variants={sceneVariants}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
    }}
  >
    {children}
  </motion.div>
);
