import * as React from "react";

import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

// default auto-dismiss (ms) to preserve observed behavior
const DEFAULT_AUTO_DISMISS = 5000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  // optional duration in ms — undefined => use DEFAULT_AUTO_DISMISS,
  // 0 or null => disable auto-dismiss
  duration?: number | null;
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST"
} as const;

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: ToasterToast["id"];
    };

interface State {
  toasts: ToasterToast[];
}

// use correct setTimeout return type for portability
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const autoDismissTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

// helpers for auto-dismiss timers
const clearAutoDismiss = (toastId: string) => {
  const t = autoDismissTimeouts.get(toastId);
  if (t) {
    clearTimeout(t);
    autoDismissTimeouts.delete(toastId);
  }
};

const scheduleAutoDismiss = (toastId: string, duration?: number) => {
  // duration undefined => default; 0 or null => disabled
  const resolved =
    duration === undefined
      ? DEFAULT_AUTO_DISMISS
      : Math.max(0, Math.floor(duration));
  // disable if explicitly 0
  if (resolved <= 0) return;

  // clear existing if any
  clearAutoDismiss(toastId);

  const timeout = setTimeout(() => {
    dispatch({ type: "DISMISS_TOAST", toastId });
    autoDismissTimeouts.delete(toastId);
  }, resolved);

  autoDismissTimeouts.set(toastId, timeout);
};

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT)
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          // action.toast.id might be undefined in theory, but we always set it
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        )
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      // clear auto-dismiss timers for the dismissed toast(s)
      if (toastId) {
        clearAutoDismiss(toastId);
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          clearAutoDismiss(toast.id);
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false
              }
            : t
        )
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        // clear any remaining autoDismiss timers just to be safe
        autoDismissTimeouts.forEach((timeout) => clearTimeout(timeout));
        autoDismissTimeouts.clear();

        // also clear removal timeouts
        toastTimeouts.forEach((timeout) => clearTimeout(timeout));
        toastTimeouts.clear();

        return {
          ...state,
          toasts: []
        };
      }

      // clear timers for this toast
      clearAutoDismiss(action.toastId);
      const rem = toastTimeouts.get(action.toastId);
      if (rem) {
        clearTimeout(rem);
        toastTimeouts.delete(action.toastId);
      }

      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId)
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

type Toast = Omit<ToasterToast, "id">;

/**
 * Helper: normalize description so multiline string descriptions become React nodes
 * - If description is a string containing newline(s), split on \r?\n and join with <br/> wrapped in <span> chunks
 * - If description is non-string ReactNode, leave it alone
 */
function normalizeDescription(
  description?: React.ReactNode
): React.ReactNode | undefined {
  if (typeof description === "string" && description.includes("\n")) {
    const lines = description.split(/\r?\n/);
    return (
      <>
        {lines.map((line, idx) => (
          <span key={idx}>
            {line}
            {idx < lines.length - 1 && <br />}
          </span>
        ))}
      </>
    );
  }
  return description;
}

/**
 * Helper: normalize a toast object (convert description if necessary)
 */
function normalizeToast<T extends Partial<ToasterToast>>(toast: T): T {
  const normalized = { ...toast };
  if ("description" in normalized) {
    normalized.description = normalizeDescription(normalized.description);
  }
  return normalized;
}

function toast({ ...props }: Toast) {
  const id = genId();

  // ensure we can read duration from props (may be undefined)
  const durationFromProps = (props as Partial<ToasterToast>).duration;

  const update = (propsToUpdate: Partial<ToasterToast>) => {
    // If the update contains a duration, adjust timers accordingly.
    // We schedule/clear auto-dismiss here so the update is immediately effective.
    const normalized = normalizeToast({ ...propsToUpdate, id });

    // if duration present in update (could be undefined), handle timers:
    if ("duration" in propsToUpdate) {
      // clear current timer unconditionally
      clearAutoDismiss(id);
      // schedule new one as appropriate
      scheduleAutoDismiss(
        id,
        (propsToUpdate as Partial<ToasterToast>).duration
      );
    }

    dispatch({
      type: "UPDATE_TOAST",
      toast: normalized
    });
  };

  const dismiss = () => {
    clearAutoDismiss(id);
    dispatch({ type: "DISMISS_TOAST", toastId: id });
  };

  // add the toast
  const normalizedToast = normalizeToast({
    ...props,
    id,
    open: true,
    // preserve any provided onOpenChange but also ensure dismissal hook runs
    onOpenChange: (open: boolean) => {
      if (!open) dismiss();
      // if the caller provided an onOpenChange, call it too
      try {
        const maybeHandler = props.onOpenChange;
        if (typeof maybeHandler === "function") maybeHandler(open);
      } catch {
        // swallow errors
      }
    }
  }) as ToasterToast;

  dispatch({
    type: "ADD_TOAST",
    toast: normalizedToast
  });

  // schedule auto-dismiss for this toast according to its duration prop (or default)
  scheduleAutoDismiss(
    id,
    (normalizedToast as ToasterToast).duration ?? durationFromProps
  );

  return {
    id: id,
    dismiss,
    update
  };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
    // intentionally not depending on state setter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => {
      // clear any timers for explicit dismiss
      if (toastId) clearAutoDismiss(toastId);
      else {
        autoDismissTimeouts.forEach((_t, id) => {
          clearAutoDismiss(id);
        });
      }
      dispatch({ type: "DISMISS_TOAST", toastId });
    }
  };
}

export { useToast, toast };
