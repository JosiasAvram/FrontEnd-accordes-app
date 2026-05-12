import { Text, View } from 'react-native';

/**
 * Iconos simples basados en emojis musicales. Reemplazables después
 * por @expo/vector-icons cuando definamos el branding visual.
 */
export function TabBarIcon({
  name,
  color,
  size,
}: {
  name: string;
  color: string;
  size: number;
}) {
  const emoji =
    name === 'Canciones' ? '🎵' :
    name === 'Acordes' ? '🎸' :
    name === 'Crear' ? '➕' :
    name === 'Ajustes' ? '⚙️' : '•';

  return (
    <View>
      <Text style={{ fontSize: size, color }}>{emoji}</Text>
    </View>
  );
}
