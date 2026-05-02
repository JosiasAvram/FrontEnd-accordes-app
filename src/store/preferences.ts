import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PreferencesState {
  fontSize: 'sm' | 'md' | 'lg';
  setFontSize: (size: 'sm' | 'md' | 'lg') => void;

  // Semitonos transpuestos por canción (clave: songId, valor: semitones)
  transpositions: Record<string, number>;
  setTransposition: (songId: string, semitones: number) => void;
  resetTransposition: (songId: string) => void;

  hydrate: () => Promise<void>;
}

const STORAGE_KEY = '@preferences';

export const usePreferences = create<PreferencesState>((set, get) => ({
  fontSize: 'md',
  transpositions: {},

  setFontSize: (size) => {
    set({ fontSize: size });
    persist(get());
  },

  setTransposition: (songId, semitones) => {
    set((state) => ({
      transpositions: { ...state.transpositions, [songId]: semitones },
    }));
    persist(get());
  },

  resetTransposition: (songId) => {
    set((state) => {
      const { [songId]: _, ...rest } = state.transpositions;
      return { transpositions: rest };
    });
    persist(get());
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          fontSize: data.fontSize ?? 'md',
          transpositions: data.transpositions ?? {},
        });
      }
    } catch (err) {
      console.warn('Error hidratando preferencias:', err);
    }
  },
}));

async function persist(state: PreferencesState) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        fontSize: state.fontSize,
        transpositions: state.transpositions,
      }),
    );
  } catch (err) {
    console.warn('Error persistiendo preferencias:', err);
  }
}
