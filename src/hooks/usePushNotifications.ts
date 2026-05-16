import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient, QueryClient } from '@tanstack/react-query';

import { notificationsApi } from '../services/notifications.api';
import { useNotificationActions } from '../store/notificationActions';
import { navigateToCanciones } from '../navigation/navigationRef';

// Comportamiento del foreground: cuando llega una notificacion estando
// la app abierta, mostrarla igualmente como banner + sonido + badge.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface PushRegistrationResult {
  ok: boolean;
  step: string;
  message: string;
  token?: string;
}

/**
 * Funcion publica para registrar el dispositivo. Devuelve detalles paso a paso
 * para que se pueda mostrar en una pantalla de diagnostico (Ajustes).
 */
export async function registerPushTokenDiagnostic(): Promise<PushRegistrationResult> {
  // 1. Validar que sea dispositivo fisico
  if (!Device.isDevice) {
    return {
      ok: false,
      step: 'device-check',
      message: 'Estas en un emulador. Las notificaciones push requieren un dispositivo fisico.',
    };
  }

  // 2. Validar permisos
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') {
    return {
      ok: false,
      step: 'permissions',
      message:
        'No se otorgaron permisos de notificaciones. Anda a Configuracion del sistema → Apps → "Letras y Acordes" → Notificaciones → activar.',
    };
  }

  // 3. Configurar canal Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F59E0B',
    });
  }

  // 4. Obtener el Expo push token
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId;

  if (!projectId) {
    return {
      ok: false,
      step: 'project-id',
      message:
        'No se pudo leer el Expo project ID. Verifica que app.json tenga "extra.eas.projectId".',
    };
  }

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    token = result.data;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      step: 'get-token',
      message:
        `No se pudo obtener el push token. Mensaje: ${errMsg}\n\nCausa mas comun: falta configurar Firebase Cloud Messaging (FCM) en EAS. Ver docs.`,
    };
  }

  if (!token) {
    return {
      ok: false,
      step: 'get-token',
      message: 'getExpoPushTokenAsync devolvio vacio. Es probable que FCM no este configurado.',
    };
  }

  // 5. Identificador de dispositivo
  const deviceId =
    (Platform.OS === 'android'
      ? Application.getAndroidId()
      : await Application.getIosIdForVendorAsync()) ?? undefined;

  // 6. Registrar contra el backend
  try {
    await notificationsApi.register({
      token,
      platform: Platform.OS,
      deviceId,
    });
    await AsyncStorage.setItem('@push_token', token);
  } catch (err) {
    const errMsg =
      (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message ??
      (err as { message?: string }).message ??
      'Error desconocido';
    return {
      ok: false,
      step: 'register',
      message: `Token obtenido pero el backend rechazo el registro. Mensaje: ${errMsg}`,
      token,
    };
  }

  return {
    ok: true,
    step: 'done',
    message: 'Registrado correctamente. Vas a recibir notificaciones.',
    token,
  };
}

/**
 * Hook que se ejecuta una sola vez al iniciar la app y registra el dispositivo.
 * Tambien suscribe el listener: cuando llega una notif, invalida las queries.
 */
export function usePushNotifications() {
  const queryClient = useQueryClient();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    registerPushTokenDiagnostic()
      .then((result) => {
        if (result.ok) {
          console.log('[push] OK:', result.token?.slice(0, 30) + '...');
        } else {
          console.warn(`[push] fallo en ${result.step}:`, result.message);
        }
      })
      .catch((err) => {
        console.warn('[push] error inesperado:', err);
      });

    setupNotificationListener(queryClient);
  }, [queryClient]);
}

/**
 * Maneja una notificacion tocada por el usuario: setea la accion pendiente
 * "abrir Lista" y navega a la pestaña Canciones. El HomeScreen detecta la
 * accion y aplica el filtro de Lista.
 */
function handleNotificationResponse(
  response: Notifications.NotificationResponse,
) {
  const data = response.notification.request.content.data as
    | { type?: string }
    | undefined;
  if (data?.type === 'list-updated') {
    // Marcar que hay que abrir el modo Lista. El HomeScreen lo consume al montarse.
    useNotificationActions.getState().setPendingAction('open-list');
    // Navegar a la pestaña Canciones (sale de cualquier tab donde este el user).
    // Hay un delay porque navigationRef puede no estar ready inmediatamente.
    setTimeout(() => {
      navigateToCanciones();
    }, 100);
  }
}

function setupNotificationListener(queryClient: QueryClient) {
  // 1) Notification received (app en foreground): refrescar las queries
  Notifications.addNotificationReceivedListener(() => {
    queryClient.invalidateQueries({ queryKey: ['songs-list'] });
    queryClient.invalidateQueries({ queryKey: ['list-state'] });
  });

  // 2) Notification tapped (app en background o foreground): redirigir a Lista
  Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationResponse(response);
  });

  // 3) Cold start: si la app se ABRIO desde una notificacion (estaba cerrada),
  // chequeamos la "ultima notification response" y la procesamos.
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (response) handleNotificationResponse(response);
    })
    .catch((err) => console.warn('[push] getLastNotificationResponse error:', err));
}
