import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';

import { HomeScreen } from '../screens/HomeScreen';
import { SearchResultsScreen } from '../screens/SearchResultsScreen';
import { SongDetailScreen } from '../screens/SongDetailScreen';
import { ChordsScreen } from '../screens/ChordsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useTheme } from '../theme/ThemeProvider';
import { usePreferences } from '../store/preferences';
import { TabBarIcon } from '../components/TabBarIcon';

export type SongsStackParamList = {
  Home: undefined;
  SearchResults: { query: string };
  SongDetail: { songId: string; title?: string };
};

export type ChordsStackParamList = {
  ChordsList: undefined;
};

const SongsStack = createNativeStackNavigator<SongsStackParamList>();
const ChordsStack = createNativeStackNavigator<ChordsStackParamList>();
const Tab = createBottomTabNavigator();

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
        options={{ title: 'Letras y Acordes' }}
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
        options={{ title: 'Acordes' }}
      />
    </ChordsStack.Navigator>
  );
}

export function RootNavigator() {
  const theme = useTheme();
  const hydrate = usePreferences((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <NavigationContainer>
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
        <Tab.Screen
          name="Canciones"
          component={SongsStackNavigator}
        />
        <Tab.Screen
          name="Acordes"
          component={ChordsStackNavigator}
        />
        <Tab.Screen
          name="Ajustes"
          component={SettingsScreen}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
