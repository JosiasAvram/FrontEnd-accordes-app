import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../store/auth';

export function LoginScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const login = useAuth((s) => s.login);
  const loading = useAuth((s) => s.loading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Faltan datos', 'Tenés que ingresar email y password.');
      return;
    }
    try {
      await login({ email, password });
      navigation.goBack();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'No se pudo iniciar sesión. Verificá email y password.';
      Alert.alert('Error', msg);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.container}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Iniciar sesión
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Solo administradores pueden editar canciones.
          </Text>

          <View style={styles.form}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              }]}
              value={email}
              onChangeText={setEmail}
              placeholder="admin@acordes-app.com"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Password</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={[styles.button, {
                backgroundColor: loading ? theme.colors.surfaceAlt : theme.colors.primary,
              }]}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.buttonText}>Entrar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 8, marginBottom: 32 },
  form: { gap: 12 },
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 16,
  },
  button: {
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
});
