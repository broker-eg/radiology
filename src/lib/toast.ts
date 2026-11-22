import { useSyncExternalStore } from 'react';

// A one-slot toast store (the legacy suite showed one message at a time, bottom-right).
type ToastState = { id: number; message: string; tone: 'info' | 'error' } | null;

let state: ToastState = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit(next: ToastState) {
  state = next;
  listeners.forEach((l) => l());
}

function show(message: string, tone: 'info' | 'error') {
  clearTimeout(timer);
  emit({ id: Date.now(), message, tone });
  timer = setTimeout(() => emit(null), tone === 'error' ? 4500 : 2400);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'Something went wrong';
}

export const toast = {
  info: (message: string) => show(message, 'info'),
  error: (error: unknown) => show(errorMessage(error), 'error'),
};

export function useToast(): ToastState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}
