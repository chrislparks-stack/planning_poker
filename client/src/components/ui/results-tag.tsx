import { motion } from "framer-motion";
import { Vote } from "lucide-react";

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
      data-active={active}
      className={cn(
        "vote-distribution-rail mr-3 flex w-5 self-stretch items-center justify-start gap-1.5 rounded-lg border py-2 select-none",
        "text-[6px] font-semibold uppercase tracking-[0.12em]",
        "backdrop-blur-[2px] transition-all duration-300"
      )}
      style={{
        writingMode: "vertical-rl",
        textOrientation: "upright",
        letterSpacing: "0.1em"
      }}
    >
      <Vote
        className="mb-0.5 size-3.5 shrink-0"
        style={{ writingMode: "horizontal-tb" }}
        aria-hidden="true"
      />
      <span>VOTE DISTRIBUTION</span>
    </motion.div>
  );
};
