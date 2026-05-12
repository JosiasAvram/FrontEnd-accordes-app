import { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chord } from '../types/chord';
import { ChordDiagram } from './ChordDiagram';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  chord: Chord;
  diagramWidth?: number;
}

/**
 * Visor de acorde con multiples voicings (posiciones).
 * Muestra el diagrama de la voicing actual y permite navegar entre las
 * variaciones con flechas ← y →. Indica "Posicion N / M" abajo.
 */
export function ChordViewer({ chord, diagramWidth = 200 }: Props) {
  const theme = useTheme();
  const voicings = chord.voicings ?? [];
  const total = voicings.length;
  const [index, setIndex] = useState(0);

  // Si cambia el acorde, volver al primer voicing
  useEffect(() => {
    setIndex(0);
  }, [chord._id]);

  if (total === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: theme.colors.textMuted }}>
          Sin posiciones cargadas para este acorde.
        </Text>
      </View>
    );
  }

  const current = voicings[index];
  const hasPrev = index > 0;
  const hasNext = index < total - 1;

  return (
    <View style={styles.container}>
      {/* Fila con flecha izquierda, diagrama, flecha derecha */}
      <View style={styles.row}>
        <Pressable
          onPress={() => hasPrev && setIndex(index - 1)}
          disabled={!hasPrev}
          hitSlop={10}
          style={[
            styles.arrowBtn,
            { backgroundColor: theme.colors.surfaceAlt, opacity: hasPrev ? 1 : 0.3 },
          ]}
        >
          <Text style={[styles.arrow, { color: theme.colors.textPrimary }]}>‹</Text>
        </Pressable>

        <ChordDiagram voicing={current} width={diagramWidth} />

        <Pressable
          onPress={() => hasNext && setIndex(index + 1)}
          disabled={!hasNext}
          hitSlop={10}
          style={[
            styles.arrowBtn,
            { backgroundColor: theme.colors.surfaceAlt, opacity: hasNext ? 1 : 0.3 },
          ]}
        >
          <Text style={[styles.arrow, { color: theme.colors.textPrimary }]}>›</Text>
        </Pressable>
      </View>

      {/* Etiqueta + contador de posicion */}
      <View style={styles.footer}>
        {current.label && (
          <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
            {current.label}
          </Text>
        )}
        {total > 1 && (
          <Text style={[styles.counter, { color: theme.colors.textMuted }]}>
            Posición {index + 1} de {total}
          </Text>
        )}
        <Text style={[styles.difficulty, { color: theme.colors.textSecondary }]}>
          Dificultad: {current.difficulty}
        </Text>
      </View>

      {/* Dots indicador (si hay más de 1 voicing) */}
      {total > 1 && (
        <View style={styles.dots}>
          {voicings.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === index ? theme.colors.primary : theme.colors.surfaceAlt,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: { fontSize: 26, fontWeight: '600', lineHeight: 30 },
  footer: { alignItems: 'center', marginTop: 12, gap: 2 },
  label: { fontSize: 14, fontWeight: '600' },
  counter: { fontSize: 12 },
  difficulty: { fontSize: 12, marginTop: 4 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { padding: 20 },
});
