import { api } from './api';
import { Chord } from '../types/chord';

export const chordsApi = {
  list: async (instrument: string = 'guitar') => {
    const { data } = await api.get<Chord[]>('/chords', {
      params: { instrument },
    });
    return data;
  },

  findByName: async (name: string, instrument: string = 'guitar') => {
    const { data } = await api.get<Chord>(`/chords/${encodeURIComponent(name)}`, {
      params: { instrument },
    });
    return data;
  },

  groupedByCategory: async (instrument: string = 'guitar') => {
    const { data } = await api.get<Array<{ category: string; chords: Chord[] }>>(
      '/chords/categories',
      { params: { instrument } },
    );
    return data;
  },
};

export type { Chord };
