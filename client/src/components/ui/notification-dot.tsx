import React from "react"
import { cn } from "@/lib/utils"

interface NotificationDotProps {
  count?: number
  className?: string
  max?: number
}

export const NotificationDot: React.FC<NotificationDotProps> = ({
  count = 0,
  className,
  max = 9
}) => {
  console.log("Count:", count);
  if (!count || count <= 0) return null

  const display = count > max ? `${max}+` : count

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        "w-[12px] h-[12px]",
        "text-[9px] font-semibold leading-none tracking-tight",
        "rounded-full select-none",
        "animate-pulse-soft",
        className
      )}
    >
      {display}
    </div>
  )
}
