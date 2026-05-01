/**
 * API minimalista de toasts. Usamos un CustomEvent del DOM para no
 * tener que pasar contextos por todo el árbol; el ToastContainer
 * (montado en layout.tsx) lo escucha y renderiza.
 */
export type ToastKind = 'success' | 'error' | 'info'

export interface ToastDetail {
  message: string
  kind?: ToastKind
  durationMs?: number
}

export function showToast(detail: ToastDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ToastDetail>('eq-toast', { detail }))
}

export const toast = {
  success: (message: string, durationMs = 2600) => showToast({ message, kind: 'success', durationMs }),
  error:   (message: string, durationMs = 3400) => showToast({ message, kind: 'error',   durationMs }),
  info:    (message: string, durationMs = 2400) => showToast({ message, kind: 'info',    durationMs }),
}
