import { ref } from "vue";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

// Global state
const toasts = ref<ToastMessage[]>([]);

export function useToast() {
  const addToast = (toast: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id, duration: toast.duration || 3000 };

    toasts.value.push(newToast);

    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  };

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index > -1) {
      toasts.value.splice(index, 1);
    }
  };

  const success = (title: string, message?: string, duration?: number) => {
    addToast({ title, message, type: "success", duration });
  };

  const error = (title: string, message?: string, duration?: number) => {
    addToast({ title, message, type: "error", duration });
  };

  const warning = (title: string, message?: string, duration?: number) => {
    addToast({ title, message, type: "warning", duration });
  };

  const info = (title: string, message?: string, duration?: number) => {
    addToast({ title, message, type: "info", duration });
  };

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}
