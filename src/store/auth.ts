import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, LoginInput } from '../services/auth.api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;

  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

const TOKEN_KEY = '@auth_token';
const USER_KEY = '@auth_user';

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,

  login: async (input) => {
    set({ loading: true });
    try {
      const { access_token, user } = await authApi.login(input);
      await AsyncStorage.setItem(TOKEN_KEY, access_token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      set({
        token: access_token,
        user,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },

  hydrate: async () => {
    try {
      const [token, userRaw] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      if (token && userRaw) {
        set({
          token,
          user: JSON.parse(userRaw) as User,
          isAuthenticated: true,
        });
      }
    } catch (err) {
      console.warn('Error hidratando auth:', err);
    }
  },
}));
