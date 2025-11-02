import React, {
  createContext,
  useContext,
  useCallback,
  RefObject,
} from "react";

type CardPosition = { x: number; y: number; width: number; height: number } | null;

interface CardPositionContextValue {
  registerCardRef: (userId: string, ref: React.RefObject<HTMLDivElement | null>) => void;
  getCardRect: (userId: string) => CardPosition;
}

// default no-op context
const CardPositionContext = createContext<CardPositionContextValue>({
  registerCardRef: () => {},
  getCardRect: () => null,
});

export const useCardPosition = () => useContext(CardPositionContext);

export const CardPositionProvider: React.FC<{
  children: React.ReactNode;
  cardRefs: React.MutableRefObject<Record<string, React.RefObject<HTMLDivElement>>>;
}> = ({ children, cardRefs }) => {
  const registerCardRef = useCallback((userId: string, ref: RefObject<HTMLDivElement>) => {
    cardRefs.current[userId] = ref;
  }, []);

  const getCardRect = useCallback((userId: string): CardPosition => {
    const ref = cardRefs.current[userId];
    const rect = ref?.current?.getBoundingClientRect();
    if (!rect) return null;

    return {
      x: rect.left / window.innerWidth,
      y: rect.top / window.innerHeight,
      width: rect.width / window.innerWidth,
      height: rect.height / window.innerHeight,
    };
  }, []);

  return (
    <CardPositionContext.Provider
      value={{
        registerCardRef: registerCardRef as CardPositionContextValue["registerCardRef"],
        getCardRect,
      }}
    >
      {children}
    </CardPositionContext.Provider>
  );
};
