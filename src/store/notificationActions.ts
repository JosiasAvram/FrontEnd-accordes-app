import { create } from 'zustand';

/**
 * Tipos de "accion pendiente" que pueden quedar despues de tocar una notificacion.
 * El HomeScreen lee este estado y reacciona en consecuencia.
 */
export type PendingAction = 'open-list' | null;

interface State {
  pendingAction: PendingAction;
  setPendingAction: (a: PendingAction) => void;
  /** Lee la accion pendiente y la limpia en el mismo paso */
  consume: () => PendingAction;
}

export const useNotificationActions = create<State>((set, get) => ({
  pendingAction: null,
  setPendingAction: (a) => set({ pendingAction: a }),
  consume: () => {
    const a = get().pendingAction;
    if (a !== null) set({ pendingAction: null });
    return a;
  },
}));
