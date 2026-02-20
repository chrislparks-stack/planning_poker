import {ChevronCascade} from "@/components/ui/spinners.tsx";
import { motion } from "framer-motion";

interface ThemeHintProps {
  onDismiss: () => void;
}

export function ThemeHint({ onDismiss }: ThemeHintProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: 0,
        transition: { duration: 0 }
      }}
      transition={{
        duration: 3,
        ease: "easeOut",
      }}
      className="absolute top-[65px] right-3 z-50"
    >
      <div className="relative group">
        <div
          className="absolute inset-0 rounded-2xl blur-md"
          style={{
            boxShadow: `0 0 22px 7px hsl(var(--accent) / 0.32)`,
            background: `
              radial-gradient(
                circle at 85% -10%,
                hsl(var(--accent) / 0.45),
                transparent 100%
              )
            `,
          }}
        />

        {/* Glass Panel */}
        <div
          className="
            relative max-w-xs rounded-2xl
            backdrop-blur-[6px]
            border border-background/30
            p-4
            shadow-[inset_0_0_20px_rgba(0,0,0,0.45)]
            text-sm
          "
        >
          {/* Arrow Indicator */}
          <ChevronCascade
            className="
              absolute top-7 right-3
              w-4 h-4
              rotate-180
              drop-shadow-[0_0_4px_rgba(255,255,255,0.35)]
            "
            overlap={8}
            travel={2}
            color="text-white"
          />
          <div className="space-y-2 pr-6">
            <div className="font-semibold text-foreground">
              <span>Not feeling very</span>{" "}
              <span className="text-accent">purple</span>{" "}
              <span>today?</span>
            </div>

            <p className="leading-relaxed text-foreground">
              You can change it in appearance settings.
            </p>
          </div>

          <button
            onClick={onDismiss}
            className="
              mt-3 text-xs
              text-foreground/60
              hover:text-accent
              transition-colors duration-300
            "
          >
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
}
