import { Check } from "lucide-react";
import { useState } from "react";

import pickedGif from "@/assets/picked.gif";

export function CardPickedIcon() {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src={pickedGif}
        alt="Card picked"
        className="max-h-none max-w-none"
        style={{ width: 90, height: 70 }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label="Card picked"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4ac3a0] text-white shadow-[0_0_12px_rgba(74,195,160,0.35)]"
    >
      <Check aria-hidden="true" className="h-6 w-6" strokeWidth={3} />
    </div>
  );
}
