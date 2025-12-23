import { motion } from "framer-motion";
import { ReactNode } from "react";

export type Direction = "up" | "down";

const sceneVariants = {
  enter: (dir: Direction) => ({
    y: dir === "down" ? 40 : -40,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
  },
  exit: (dir: Direction) => ({
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
    className="absolute h-full inset-0 flex items-center justify-center overflow-hidden"
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
