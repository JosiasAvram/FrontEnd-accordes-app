import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  semitones: number;
  currentKey: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onReset: () => void;
}

/**
 * Controles de transposición: −1 / Reset / +1.
 * Muestra la tonalidad actual en el centro.
 */
export function TransposeControls({
  semitones,
  currentKey,
  onIncrement,
  onDecrement,
  onReset,
}: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Pressable
        onPress={onDecrement}
        style={[styles.btn, { backgroundColor: theme.colors.surfaceAlt }]}
        hitSlop={8}
      >
        <Text style={[styles.btnText, { color: theme.colors.textPrimary }]}>−</Text>
      </Pressable>

      <Pressable onPress={onReset} style={styles.center} hitSlop={8}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Tono</Text>
        <Text style={[styles.key, { color: theme.colors.primary }]}>
          {currentKey}{semitones !== 0 && (
            <Text style={[styles.diff, { color: theme.colors.textMuted }]}>
              {' '}({semitones > 0 ? '+' : ''}{semitones})
            </Text>
          )}
        </Text>
      </Pressable>

      <Pressable
        onPress={onIncrement}
        style={[styles.btn, { backgroundColor: theme.colors.surfaceAlt }]}
        hitSlop={8}
      >
        <Text style={[styles.btnText, { color: theme.colors.textPrimary }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 28, fontWeight: '600' },
  center: { alignItems: 'center', flex: 1 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  key: { fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  diff: { fontSize: 14, fontWeight: '400' },
});
