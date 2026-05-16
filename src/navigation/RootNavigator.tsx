import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';

import { navigationRef } from './navigationRef';

import { HomeScreen } from '../screens/HomeScreen';
import { SearchResultsScreen } from '../screens/SearchResultsScreen';
import { SongDetailScreen } from '../screens/SongDetailScreen';
import { EditSongScreen } from '../screens/EditSongScreen';
import { ChordsScreen } from '../screens/ChordsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { CreateSongScreen } from '../screens/CreateSongScreen';
import { useTheme } from '../theme/ThemeProvider';
import { usePreferences } from '../store/preferences';
import { useAuth } from '../store/auth';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { TabBarIcon } from '../components/TabBarIcon';

// Stack interno de canciones
export type SongsStackParamList = {
  Home: undefined;
  SearchResults: { query: string };
  SongDetail: { songId: string; title?: string };
  EditSong: { songId: string };
};

export type ChordsStackParamList = {
  ChordsList: undefined;
};

// Stack root que envuelve todo (para que Login se pueda navegar desde cualquier lado)
export type RootStackParamList = {
  MainTabs: undefined;
  Login: undefined;
};

const SongsStack = createNativeStackNavigator<SongsStackParamList>();
const ChordsStack = createNativeStackNavigator<ChordsStackParamList>();
const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function SongsStackNavigator() {
  const theme = useTheme();
  return (
    <SongsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.textPrimary,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <SongsStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Letras y Acordes', headerShown: false }}
      />
      <SongsStack.Screen
        name="SearchResults"
        component={SearchResultsScreen}
        options={{ title: 'Resultados' }}
      />
      <SongsStack.Screen
        name="SongDetail"
        component={SongDetailScreen}
        options={({ route }) => ({ title: route.params.title ?? 'Canción' })}
      />
      <SongsStack.Screen
        name="EditSong"
        component={EditSongScreen}
        options={{ title: 'Editar', headerShown: false }}
      />
    </SongsStack.Navigator>
  );
}

function ChordsStackNavigator() {
  const theme = useTheme();
  return (
    <ChordsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.textPrimary,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <ChordsStack.Screen
        name="ChordsList"
        component={ChordsScreen}
        options={{ title: 'Acordes', headerShown: false }}
      />
    </ChordsStack.Navigator>
  );
}

function MainTabs() {
  const theme = useTheme();
  // Solo mostrar la pestaña "Crear" si el usuario es admin
  const isAdmin = useAuth((s) => s.isAuthenticated && s.user?.role === 'admin');

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarIcon: ({ color, size }) => (
          <TabBarIcon name={route.name} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Canciones" component={SongsStackNavigator} />
      <Tab.Screen name="Acordes" component={ChordsStackNavigator} />
      {isAdmin && (
        <Tab.Screen name="Crear" component={CreateSongScreen} />
      )}
      <Tab.Screen name="Ajustes" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const theme = useTheme();
  const hydratePrefs = usePreferences((s) => s.hydrate);
  const hydrateAuth = useAuth((s) => s.hydrate);

  // Setup de push notifications (registra el token, suscribe listeners)
  usePushNotifications();

  useEffect(() => {
    hydratePrefs();
    hydrateAuth();
  }, [hydratePrefs, hydrateAuth]);

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.textPrimary,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <RootStack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            title: 'Iniciar sesión',
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
