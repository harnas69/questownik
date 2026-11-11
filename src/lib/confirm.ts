import { createContext, useContext } from 'react'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

// Domyślnie (bez dostawcy) odpowiedź to "nie", więc niczego nie usuniemy przez pomyłkę
export const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false))

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext)
}