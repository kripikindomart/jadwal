import { ref } from "vue";

type ConfirmStyle = "danger" | "warning" | "info";

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  style?: ConfirmStyle;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const defaultState: ConfirmState = {
  isOpen: false,
  title: "",
  message: "",
  confirmText: "Ya",
  cancelText: "Batal",
  style: "danger",
};

const state = ref<ConfirmState>({ ...defaultState });

export function useConfirm() {
  const requireConfirm = (options: Omit<ConfirmState, "isOpen">) => {
    state.value = {
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || "Ya",
      cancelText: options.cancelText || "Batal",
      style: options.style || "danger",
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
    };
  };

  const confirm = () => {
    if (state.value.onConfirm) {
      state.value.onConfirm();
    }
    close();
  };

  const cancel = () => {
    if (state.value.onCancel) {
      state.value.onCancel();
    }
    close();
  };

  const close = () => {
    state.value.isOpen = false;
    // reset after transition
    setTimeout(() => {
      state.value = { ...defaultState };
    }, 200);
  };

  return {
    state,
    requireConfirm,
    confirm,
    cancel,
  };
}
