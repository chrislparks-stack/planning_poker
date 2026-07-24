import type { ComponentPropsWithoutRef } from "react";

import { DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type OptionDialogContentProps = ComponentPropsWithoutRef<typeof DialogContent>;

export function OptionDialogContent({
  className,
  ...props
}: OptionDialogContentProps) {
  return (
    <DialogContent
      className={cn(
        "top-[calc(50%+1.75rem)] flex max-h-[calc(100dvh-4.5rem)] w-[94vw] flex-col gap-0 overflow-hidden rounded-2xl border border-border/55 bg-background/90 p-0 shadow-[0_24px_80px_rgb(0_0_0_/_0.5)] backdrop-blur-xl",
        className
      )}
      {...props}
    />
  );
}
