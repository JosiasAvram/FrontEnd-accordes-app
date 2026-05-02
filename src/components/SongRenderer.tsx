import { Text, View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Song, SongLine, SongSection } from '../types/song';

interface Props {
  song: Song;
  fontSize?: number;
  onChordPress?: (chord: string) => void;
}

/**
 * SongRenderer — el corazón visual de la app.
 *
 * Renderiza letra+acordes con tipografía monoespaciada para mantener la
 * alineación EXACTA. Por cada línea: primero una sub-línea con los acordes
 * en sus posiciones, después la sub-línea con la letra. El truco es que
 * tanto la letra como los acordes usan el mismo ancho de caracter (mono),
 * así "abrir" un espacio del tamaño correcto antes de cada acorde alinea
 * todo perfectamente.
 *
 * Cada acorde es tappeable: dispara onChordPress(chord) para abrir el modal
 * con el diagrama.
 */
export function SongRenderer({ song, fontSize = 14, onChordPress }: Props) {
  const theme = useTheme();
  const lineHeight = fontSize * 1.5;

  return (
    <View style={styles.container}>
      {song.sections.map((section, sIdx) => (
        <SectionView
          key={sIdx}
          section={section}
          fontSize={fontSize}
          lineHeight={lineHeight}
          onChordPress={onChordPress}
        />
      ))}
    </View>
  );
}

function SectionView({
  section,
  fontSize,
  lineHeight,
  onChordPress,
}: {
  section: SongSection;
  fontSize: number;
  lineHeight: number;
  onChordPress?: (chord: string) => void;
}) {
  const theme = useTheme();

  const label = section.label ?? capitalize(section.type);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.colors.accent }]}>
        [{label}]
      </Text>
      {section.lines.map((line, lIdx) => (
        <LineView
          key={lIdx}
          line={line}
          fontSize={fontSize}
          lineHeight={lineHeight}
          onChordPress={onChordPress}
        />
      ))}
    </View>
  );
}

function LineView({
  line,
  fontSize,
  lineHeight,
  onChordPress,
}: {
  line: SongLine;
  fontSize: number;
  lineHeight: number;
  onChordPress?: (chord: string) => void;
}) {
  const theme = useTheme();

  // Si la línea está vacía, espacio en blanco
  if (line.text === '' && line.chords.length === 0) {
    return <View style={{ height: lineHeight }} />;
  }

  // Construir la línea de acordes con espacios para alinear posiciones
  // Estrategia: recorrer los acordes ordenados por posición, llenar con
  // espacios hasta llegar a la columna correcta y luego escribir el acorde.
  const sortedChords = [...line.chords].sort((a, b) => a.position - b.position);

  return (
    <View style={{ minHeight: line.chords.length > 0 ? lineHeight * 2 : lineHeight }}>
      {/* Línea de acordes (solo si hay acordes en esta línea) */}
      {sortedChords.length > 0 && (
        <View style={{ flexDirection: 'row', height: lineHeight }}>
          {renderChordLine(sortedChords, fontSize, theme.colors.primary, onChordPress)}
        </View>
      )}

      {/* Línea de letra */}
      {line.text !== '' && (
        <Text
          style={{
            fontFamily: 'Courier',
            fontSize,
            lineHeight,
            color: theme.colors.textPrimary,
          }}
        >
          {line.text}
        </Text>
      )}
    </View>
  );
}

/**
 * Construye los segmentos de la línea de acordes con padding-left
 * proporcional al ancho de caracter monoespaciado.
 */
function renderChordLine(
  chords: Array<{ chord: string; position: number }>,
  fontSize: number,
  color: string,
  onPress?: (chord: string) => void,
) {
  // Ancho aproximado de un caracter en Courier a `fontSize`.
  // Empíricamente, Courier es ~0.6 * fontSize de ancho.
  const charWidth = fontSize * 0.6;
  let cursor = 0;

  return chords.map((c, idx) => {
    const leftPad = (c.position - cursor) * charWidth;
    cursor = c.position + c.chord.length;
    return (
      <Pressable
        key={`${idx}-${c.chord}`}
        onPress={() => onPress?.(c.chord)}
        style={{ marginLeft: Math.max(0, leftPad) }}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      >
        <Text
          style={{
            fontFamily: 'Courier',
            fontSize,
            fontWeight: 'bold',
            color,
          }}
        >
          {c.chord}
        </Text>
      </Pressable>
    );
  });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
});
