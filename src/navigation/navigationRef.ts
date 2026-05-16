import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './RootNavigator';

/**
 * Referencia global al navigator. Sirve para navegar desde lugares fuera de
 * componentes React (ej: listeners de notificaciones push, callbacks nativos).
 *
 * Uso:
 *   if (navigationRef.isReady()) {
 *     navigationRef.navigate(...);
 *   }
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navega a la pestaña "Canciones" → Home (raiz del stack de Canciones).
 * Util cuando una notificacion debe llevar al usuario a la lista.
 */
export function navigateToCanciones() {
  if (!navigationRef.isReady()) return;
  // Estructura: RootStack → MainTabs → Tab(Canciones) → Stack → Home
  // Usamos `as never` por como React Navigation tipa los nested navigators.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (navigationRef.navigate as any)('MainTabs', {
    screen: 'Canciones',
    params: {
      screen: 'Home',
    },
  });
}
