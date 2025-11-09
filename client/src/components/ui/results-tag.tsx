import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ResultsTagProps {
  active?: boolean;
}

export const ResultsTag: React.FC<ResultsTagProps> = ({ active }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "flex items-center justify-center rounded-full py-3 select-none mr-2",
        "text-[8px] font-semibold uppercase tracking-[0.2em]",
        "text-[hsl(var(--accent))]",
        "border border-[hsl(var(--accent)/0.3)]",
        "bg-[hsl(var(--accent)/0.08)] backdrop-blur-[2px]",
        "transition-all duration-300",
        active ? "shadow-[0_0_8px_rgba(var(--accent-rgb),0.25)]" : "shadow-none"
      )}
      style={{
        writingMode: "vertical-rl",
        textOrientation: "upright",
        letterSpacing: "0.1em",
      }}
    >
      VOTE RESULTS
    </motion.div>
  );
};
