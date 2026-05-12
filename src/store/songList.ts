import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Store de la "Lista" del usuario — un set de IDs de canciones que el usuario
 * marcó como favoritas / agregadas a su lista personal.
 *
 * Persiste en AsyncStorage para que no se pierda al cerrar la app.
 * Es por dispositivo (no se sincroniza entre celulares).
 */
interface SongListState {
  ids: string[];
  loading: boolean;

  add: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  toggle: (id: string) => Promise<void>;
  has: (id: string) => boolean;
  clear: () => Promise<void>;
  hydrate: () => Promise<void>;
}

const STORAGE_KEY = '@song_list';

export const useSongList = create<SongListState>((set, get) => ({
  ids: [],
  loading: false,

  add: async (id) => {
    if (get().ids.includes(id)) return;
    const next = [...get().ids, id];
    set({ ids: next });
    persist(next);
  },

  remove: async (id) => {
    const next = get().ids.filter((x) => x !== id);
    set({ ids: next });
    persist(next);
  },

  toggle: async (id) => {
    if (get().ids.includes(id)) {
      await get().remove(id);
    } else {
      await get().add(id);
    }
  },

  has: (id) => get().ids.includes(id),

  clear: async () => {
    set({ ids: [] });
    persist([]);
  },

  hydrate: async () => {
    set({ loading: true });
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) {
          set({ ids: parsed });
        }
      }
    } catch (err) {
      console.warn('Error hidratando lista:', err);
    } finally {
      set({ loading: false });
    }
  },
}));

async function persist(ids: string[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch (err) {
    console.warn('Error persistiendo lista:', err);
  }
}
