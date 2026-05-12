import { api } from './api';

export interface ListState {
  lastListChange: string;
  lastNotificationAction: string;
}

export const notificationsApi = {
  register: async (input: { token: string; platform: string; deviceId?: string }) => {
    const { data } = await api.post<{ _id: string; token: string }>(
      '/notifications/register',
      input,
    );
    return data;
  },

  unregister: async (token: string) => {
    const { data } = await api.delete<{ ok: boolean }>(
      '/notifications/register',
      { data: { token } },
    );
    return data;
  },

  getListState: async (): Promise<ListState> => {
    const { data } = await api.get<ListState>('/notifications/list-state');
    return data;
  },

  send: async (message: string) => {
    const { data } = await api.post<{ sent: number; invalid?: number }>(
      '/notifications/send',
      { message },
    );
    return data;
  },

  dismiss: async () => {
    const { data } = await api.post<{ ok: boolean }>(
      '/notifications/dismiss',
      {},
    );
    return data;
  },
};
