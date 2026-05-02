import { api } from './api';
import { Song, SongSummary, SearchResponse } from '../types/song';

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
};

export type { Song, SongSummary, SearchResponse };
