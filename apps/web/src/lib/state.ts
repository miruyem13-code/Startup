import { create } from 'zustand';
export const useUi = create<{
  theme: string;
  toggleTheme: () => void;
  toast: string;
  notify: (value: string) => void;
}>((set) => ({
  theme: localStorage.getItem('velocity-theme') || 'light',
  toggleTheme: () =>
    set((state) => {
      const theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('velocity-theme', theme);
      return { theme };
    }),
  toast: '',
  notify: (toast) => {
    set({ toast });
    setTimeout(() => set({ toast: '' }), 5000);
  },
}));
