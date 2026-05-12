import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Devuelve true si la cancion se creo dentro de los ultimos 7 dias.
 */
export function isRecentlyCreated(createdAt?: string | null): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created < SEVEN_DAYS_MS;
}

interface Props {
  createdAt?: string | null;
  size?: 'small' | 'medium';
}

/**
 * Badge "Nueva" que se muestra durante 7 dias despues de crear una cancion.
 */
export function NewBadge({ createdAt, size = 'small' }: Props) {
  const theme = useTheme();
  if (!isRecentlyCreated(createdAt)) return null;

  return (
    <View
      style={[
        styles.badge,
        size === 'medium' ? styles.badgeMedium : styles.badgeSmall,
        { backgroundColor: theme.colors.primary },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          size === 'medium' ? styles.badgeTextMedium : styles.badgeTextSmall,
        ]}
      >
        Nueva
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeMedium: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#000',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  badgeTextSmall: { fontSize: 10 },
  badgeTextMedium: { fontSize: 12 },
});
