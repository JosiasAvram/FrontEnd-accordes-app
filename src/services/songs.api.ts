import { api } from './api';
import { Song, SongSummary, SearchResponse, SongSection } from '../types/song';

export interface UpdateSongInput {
  title?: string;
  artist?: string;
  genre?: string;
  originalKey?: string;
  capo?: number;
  difficulty?: 'principiante' | 'intermedio' | 'avanzado';
  sections?: SongSection[];
  status?: 'draft' | 'published';
}

export const songsApi = {
  search: async (params: { q?: string; genre?: string; page?: number; limit?: number }) => {
    const { data } = await api.get<SearchResponse>('/songs/search', { params });
    return data;
  },

  list: async (params?: { genre?: string; page?: number; limit?: number }) => {
    const { data } = await api.get<SearchResponse>('/songs', { params });
    return data;
  },

  findById: async (id: string) => {
    const { data } = await api.get<Song>(`/songs/${id}`);
    return data;
  },

  transpose: async (id: string, semitones: number) => {
    const { data } = await api.get<Song>(`/songs/${id}/transpose`, {
      params: { semitones },
    });
    return data;
  },

  // Listado de géneros con conteo
  genres: async () => {
    const { data } = await api.get<Array<{ genre: string; count: number }>>(
      '/genres',
    );
    return data;
  },

  // Admin
  update: async (id: string, input: UpdateSongInput) => {
    const { data } = await api.put<Song>(`/songs/${id}`, input);
    return data;
  },

  remove: async (id: string) => {
    const { data } = await api.delete<{ deleted: boolean; id: string }>(
      `/songs/${id}`,
    );
    return data;
  },

  // Lista compartida (sin auth, cualquier dispositivo puede modificar)
  listIds: async (): Promise<string[]> => {
    const { data } = await api.get<string[]>('/songs/list/ids');
    return data;
  },

  toggleList: async (id: string, inList?: boolean) => {
    const { data } = await api.patch<{ _id: string; inList: boolean }>(
      `/songs/${id}/toggle-list`,
      typeof inList === 'boolean' ? { inList } : {},
    );
    return data;
  },
};

export type { Song, SongSummary, SearchResponse };
