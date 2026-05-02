import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { usePreferences } from '../store/preferences';

export function SettingsScreen() {
  const theme = useTheme();
  const fontSize = usePreferences((s) => s.fontSize);
  const setFontSize = usePreferences((s) => s.setFontSize);

  const sizes: Array<{ key: 'sm' | 'md' | 'lg'; label: string }> = [
    { key: 'sm', label: 'Chico' },
    { key: 'md', label: 'Mediano' },
    { key: 'lg', label: 'Grande' },
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Ajustes</Text>

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

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Acerca de</Text>
          <Text style={[styles.about, { color: theme.colors.textMuted }]}>
            App de letras y acordes — versión 0.1.0
          </Text>
        </View>
      </View>
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
});
