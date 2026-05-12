import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';

import { registerPushTokenDiagnostic, PushRegistrationResult } from '../hooks/usePushNotifications';

import { useTheme } from '../theme/ThemeProvider';
import { usePreferences } from '../store/preferences';
import { useAuth } from '../store/auth';
import { RootStackParamList } from '../navigation/RootNavigator';

export function SettingsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const fontSize = usePreferences((s) => s.fontSize);
  const setFontSize = usePreferences((s) => s.setFontSize);

  const user = useAuth((s) => s.user);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const logout = useAuth((s) => s.logout);

  // ── Diagnostico de notificaciones ─────────────────
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<PushRegistrationResult | null>(null);

  const handleDiagnose = async () => {
    setDiagLoading(true);
    try {
      const result = await registerPushTokenDiagnostic();
      setDiagResult(result);
      if (result.ok) {
        Alert.alert('✓ Notificaciones OK', result.message);
      } else {
        Alert.alert(`✕ Fallo en "${result.step}"`, result.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDiagResult({ ok: false, step: 'crash', message: msg });
      Alert.alert('Error inesperado', msg);
    } finally {
      setDiagLoading(false);
    }
  };

  const sizes: Array<{ key: 'sm' | 'md' | 'lg'; label: string }> = [
    { key: 'sm', label: 'Chico' },
    { key: 'md', label: 'Mediano' },
    { key: 'lg', label: 'Grande' },
  ];

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => {
          logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Ajustes</Text>

        {/* Sesión */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Sesión</Text>
          {isAuthenticated && user ? (
            <View>
              <View style={[styles.userCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.userName, { color: theme.colors.textPrimary }]}>
                  {user.name}
                </Text>
                <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
                  {user.email}
                </Text>
                <View style={[styles.roleBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
                </View>
              </View>
              <Pressable
                onPress={handleLogout}
                style={[styles.button, { backgroundColor: theme.colors.surfaceAlt }]}
              >
                <Text style={{ color: theme.colors.danger, fontWeight: '600' }}>
                  Cerrar sesión
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => navigation.navigate('Login')}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={{ color: '#000', fontWeight: '600' }}>Iniciar sesión</Text>
            </Pressable>
          )}
        </View>

        {/* Tamaño de letra */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Tamaño de letra
          </Text>
          <View style={styles.row}>
            {sizes.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => setFontSize(s.key)}
                style={[
                  styles.option,
                  {
                    backgroundColor: fontSize === s.key ? theme.colors.primary : theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: fontSize === s.key ? '#000' : theme.colors.textPrimary,
                    fontWeight: '600',
                  }}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Diagnostico de notificaciones */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Notificaciones</Text>
          <Pressable
            onPress={handleDiagnose}
            disabled={diagLoading}
            style={[styles.button, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
          >
            {diagLoading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
                Probar registro de notificaciones
              </Text>
            )}
          </Pressable>
          {diagResult && (
            <View style={[styles.diagBox, { borderColor: diagResult.ok ? theme.colors.success : theme.colors.danger }]}>
              <Text style={[styles.diagStep, { color: diagResult.ok ? theme.colors.success : theme.colors.danger }]}>
                {diagResult.ok ? '✓ OK' : `✕ Fallo en: ${diagResult.step}`}
              </Text>
              <Text style={[styles.diagMsg, { color: theme.colors.textSecondary }]}>
                {diagResult.message}
              </Text>
              {diagResult.token && (
                <Text style={[styles.diagToken, { color: theme.colors.textMuted }]} numberOfLines={1}>
                  Token: {diagResult.token.slice(0, 40)}...
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Acerca de */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Acerca de</Text>
          <Text style={[styles.about, { color: theme.colors.textMuted }]}>
            Letras y Acordes — versión {Constants.expoConfig?.version ?? '?'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 8, marginBottom: 24 },
  section: { marginBottom: 24 },
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  about: { fontSize: 14 },
  userCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  userName: { fontSize: 16, fontWeight: '600' },
  userEmail: { fontSize: 14, marginTop: 2 },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: { fontSize: 11, fontWeight: 'bold', color: '#000', letterSpacing: 1 },
  button: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  diagStep: { fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  diagMsg: { fontSize: 13, lineHeight: 18 },
  diagToken: { fontSize: 11, marginTop: 8, fontFamily: 'monospace' },
});
