import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string) => {
    sonnerToast.success(message);
  },
  error: (message: string) => {
    sonnerToast.error(message);
  },
  info: (message: string) => {
    sonnerToast.info(message);
  },
  warning: (message: string) => {
    sonnerToast.warning(message);
  },
  // Non-dismissable, persistent toast — stays until dismiss(id) is called.
  // Returns the toast id. Used for "connection lost" style banners.
  persist: (message: string): string | number =>
    sonnerToast.error(message, { duration: Infinity, dismissible: false }),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
};
