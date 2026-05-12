import { Platform, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Song, SongLine, SongSection } from '../types/song';

interface Props {
  song: Song;
  fontSize?: number;
  onChordPress?: (chord: string) => void;
}

// Fuente monoespaciada — usar "Courier" en iOS y "monospace" en Android.
// Esto garantiza que cada caracter tenga el MISMO ancho, igual que en el editor,
// para que la línea de acordes quede alineada perfectamente con la letra de abajo.
const MONO_FONT = Platform.OS === 'ios' ? 'Courier' : 'monospace';

/**
 * SongRenderer — renderiza una canción con acordes alineados sobre la letra.
 *
 * La estrategia es: usar la MISMA fuente monoespaciada en la línea de acordes
 * y en la línea de letra, y posicionar los acordes con espacios literales.
 * De esta forma, la columna N de la línea de acordes coincide EXACTAMENTE con
 * la columna N de la línea de letra (mismo ancho de caracter).
 *
 * Cada acorde es tappeable: dispara onChordPress(chord) para abrir el modal.
 */
export function SongRenderer({ song, fontSize = 14, onChordPress }: Props) {
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

  // Línea totalmente vacía → espaciado en blanco
  const hasInline = line.inlineSegments && line.inlineSegments.length > 0;
  if (
    !hasInline &&
    line.text === '' &&
    (!line.chords || line.chords.length === 0)
  ) {
    return <View style={{ height: lineHeight }} />;
  }

  // CASO 1 — Linea con segmentos inline (acordes mezclados con texto/anotaciones).
  // Ej: "A -> segunda vuelta A/C#"
  // Renderizamos un solo Text con cada segmento: text plano + acordes tappeables.
  if (hasInline) {
    return (
      <View>
        <Text
          style={{
            fontFamily: MONO_FONT,
            fontSize,
            lineHeight,
            color: theme.colors.textPrimary,
          }}
        >
          {line.inlineSegments!.map((seg, idx) =>
            seg.type === 'chord' ? (
              <Text
                key={`is-${idx}-${seg.content}`}
                onPress={onChordPress ? () => onChordPress(seg.content) : undefined}
                style={{ color: theme.colors.primary, fontWeight: 'bold' }}
              >
                {seg.content}
              </Text>
            ) : (
              <Text key={`is-${idx}`}>{seg.content}</Text>
            ),
          )}
        </Text>
      </View>
    );
  }

  // CASO 2 — Linea estandar: acordes posicionados ARRIBA + letra debajo.
  const sortedChords = [...(line.chords ?? [])].sort((a, b) => a.position - b.position);

  type Segment = { type: 'space' | 'chord'; text: string; key: string };
  const segments: Segment[] = [];
  let cursor = 0;
  for (let i = 0; i < sortedChords.length; i++) {
    const c = sortedChords[i];
    let padding = c.position - cursor;
    if (padding < 1 && cursor > 0) padding = 1;
    if (padding > 0) {
      segments.push({ type: 'space', text: ' '.repeat(padding), key: `s-${i}` });
    }
    segments.push({ type: 'chord', text: c.chord, key: `c-${i}-${c.chord}` });
    cursor = cursor + (padding > 0 ? padding : 0) + c.chord.length;
  }

  return (
    <View>
      {sortedChords.length > 0 && (
        <Text
          style={{
            fontFamily: MONO_FONT,
            fontSize,
            lineHeight,
            fontWeight: 'bold',
            color: theme.colors.primary,
          }}
        >
          {segments.map((seg) =>
            seg.type === 'chord' ? (
              <Text
                key={seg.key}
                onPress={onChordPress ? () => onChordPress(seg.text) : undefined}
                style={{ color: theme.colors.primary }}
              >
                {seg.text}
              </Text>
            ) : (
              <Text key={seg.key}>{seg.text}</Text>
            ),
          )}
        </Text>
      )}

      {line.text !== '' && (
        <Text
          style={{
            fontFamily: MONO_FONT,
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

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
});
