import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) ??
  'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  // 60s — Render free tier puede tardar hasta 60s en despertar
  // tras 15 min sin trafico. Para requests posteriores baja a milisegundos.
  timeout: 60000,
});

// Log basico para debug (se ve en consola de Expo Go o logcat)
if (__DEV__) {
  console.log('[API] baseURL:', API_URL);
}

// Interceptor: inyectar el JWT cuando esta disponible (admin)
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('@auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn('[API] Error leyendo token:', err);
  }
  return config;
});

// Manejo centralizado de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Logueamos el error para debug
    const url = error.config?.url ?? 'unknown';
    const status = error.response?.status ?? 'no-status';
    const message = error.response?.data?.message ?? error.message ?? 'unknown';
    console.warn(`[API] ${status} ${url}: ${message}`);

    // Si es 401, limpiamos el token (sesion expirada)
    if (error.response?.status === 401) {
      AsyncStorage.removeItem('@auth_token').catch(() => undefined);
      AsyncStorage.removeItem('@auth_user').catch(() => undefined);
    }
    return Promise.reject(error);
  },
);
