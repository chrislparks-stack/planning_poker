import { motion } from "framer-motion";
import {cn} from "@/lib/utils.ts";

type ChevronCascadeProps = {
  overlap?: number;
  travel?: number;
  className?: string;
  color?: string;
  size?: number;
};

export const ChevronCascade = ({
  overlap = 0,
  travel = 3,
  className,
  color="text-gray-400 dark:text-gray-500",
  size = 16,
}: ChevronCascadeProps) => (
  <div className={cn("flex flex-col items-center leading-none", className)}>
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className={cn("leading-none", color)}
        style={{
          fontSize: size,
          marginTop: i === 0 ? 0 : -overlap,
        }}
        animate={{
          opacity: [0.25, 1, 0.25],
          y: [0, travel, 0],
        }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          delay: i * 0.15,
          ease: "easeInOut",
        }}
      >
        ⌄
      </motion.span>
    ))}
  </div>
);

type ScrollHintProps = {
  label: string;
};

export const ScrollHint = ({ label }: ScrollHintProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.6 }}
    className="flex flex-col items-center gap-2 pointer-events-none z-[1000]"
  >
    <p className="text-[clamp(7px,1svmin,15px)] uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {label}
    </p>

    <div className="relative -mt-1 h-[3svh] w-px overflow-hidden">
      <motion.div
        className="absolute left-0 w-px bg-gray-400 dark:bg-gray-500"
        initial={{ top: "-100%", opacity: 0 }}
        animate={{ top: "100%", opacity: [0, 1, 0] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ height: "100%" }}
      />
    </div>
  </motion.div>
);
