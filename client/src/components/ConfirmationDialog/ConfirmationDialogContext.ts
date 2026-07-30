import { createContext } from "react";

import { ModalOptions } from "./types";

export interface ConfirmationDialogContextValue {
  open: (id: string, options?: ModalOptions) => Promise<void>;
  update: (id: string, options?: ModalOptions) => void;
  clear: (id: string) => void;
  close: (id: string) => void;
}

export const ConfirmationDialogContext =
  createContext<ConfirmationDialogContextValue | null>(null);
