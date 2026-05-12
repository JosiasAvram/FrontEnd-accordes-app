import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, ListState } from '../services/notifications.api';

/**
 * Lee el estado global de la lista del backend (lastListChange / lastNotificationAction)
 * con refetch automatico cada 30 segundos para mantener actualizada la decision
 * de si mostrar el boton "Notificar".
 */
export function useListState() {
  return useQuery<ListState>({
    queryKey: ['list-state'],
    queryFn: () => notificationsApi.getListState(),
    refetchInterval: 30_000, // poll cada 30s
    refetchOnWindowFocus: true,
  });
}

/**
 * Indica si el boton "Notificar" deberia estar visible.
 * Visible si: lastListChange > lastNotificationAction
 */
export function shouldShowNotifyButton(state: ListState | undefined): boolean {
  if (!state) return false;
  return new Date(state.lastListChange) > new Date(state.lastNotificationAction);
}

/**
 * Mutation para descartar el boton sin enviar push.
 */
export function useDismissNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.dismiss(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-state'] });
    },
  });
}

/**
 * Mutation para enviar la notificacion con el mensaje custom.
 */
export function useSendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => notificationsApi.send(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-state'] });
    },
  });
}
