import { useEffect, useState } from "react";

export function useTouchInput() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      window.matchMedia("(pointer: coarse)").matches
    );
  }, []);

  return isTouch;
}
