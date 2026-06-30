import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastStore {
  toasts: ToastItem[]
  toast: (message: string, type?: ToastType) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  toast: (message, type = 'success') => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = (message: string, type?: ToastType) =>
  useToastStore.getState().toast(message, type)
