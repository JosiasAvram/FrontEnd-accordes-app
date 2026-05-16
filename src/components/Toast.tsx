import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  // Tiempo (ms) restante hasta que el toast desaparezca automaticamente.
  // Si null/undefined, el toast no se cierra solo.
  remainingMs?: number;
}

/**
 * Toast simple que aparece abajo de la pantalla con un mensaje y un boton de
 * accion (ej: "Deshacer"). Se anima con fade + slide arriba.
 *
 * Lo controla el padre via `visible` boolean. El padre tambien maneja el
 * temporizador y la accion.
 */
export function Toast({ visible, message, actionLabel, onAction, remainingMs }: Props) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 20,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  if (!visible && opacity._value === 0) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.row}>
        <Text style={[styles.message, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {message}
        </Text>
        {actionLabel && onAction && (
          <Pressable onPress={onAction} hitSlop={8} style={styles.actionBtn}>
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>
              {actionLabel}
            </Text>
          </Pressable>
        )}
      </View>
      {typeof remainingMs === 'number' && remainingMs > 0 && (
        <View style={[styles.progressBg, { backgroundColor: theme.colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.colors.primary,
                width: `${Math.max(0, Math.min(100, (remainingMs / 5000) * 100))}%`,
              },
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 24,
    borderRadius: 12,
    borderWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  message: { flex: 1, fontSize: 14, fontWeight: '500' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  actionText: { fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },
  progressBg: {
    height: 2,
    borderRadius: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: { height: '100%' },
});
