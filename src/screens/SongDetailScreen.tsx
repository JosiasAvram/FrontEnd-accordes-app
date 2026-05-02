import { useMemo, useState } from 'react';
import {
  ScrollView, StyleSheet, Text, View, Modal, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../theme/ThemeProvider';
import { songsApi } from '../services/songs.api';
import { chordsApi } from '../services/chords.api';
import { SongRenderer } from '../components/SongRenderer';
import { TransposeControls } from '../components/TransposeControls';
import { ChordDiagram } from '../components/ChordDiagram';
import { transposeSong, currentKey } from '../utils/transposer';
import { usePreferences } from '../store/preferences';
import { SongsStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<SongsStackParamList, 'SongDetail'>;

export function SongDetailScreen({ route }: Props) {
  const { songId } = route.params;
  const theme = useTheme();

  const { data: song, isLoading, isError } = useQuery({
    queryKey: ['song', songId],
    queryFn: () => songsApi.findById(songId),
  });

  const semitones = usePreferences((s) => s.transpositions[songId] ?? 0);
  const setTransposition = usePreferences((s) => s.setTransposition);
  const resetTransposition = usePreferences((s) => s.resetTransposition);
  const fontSizeKey = usePreferences((s) => s.fontSize);
  const fontSize = fontSizeKey === 'sm' ? 12 : fontSizeKey === 'lg' ? 18 : 14;

  // Aplicamos transposición localmente (instantánea)
  const transposed = useMemo(
    () => (song ? transposeSong(song, semitones) : null),
    [song, semitones],
  );

  // Modal de acorde
  const [selectedChord, setSelectedChord] = useState<string | null>(null);
  const { data: chordData } = useQuery({
    queryKey: ['chord', selectedChord],
    queryFn: () => chordsApi.findByName(selectedChord!),
    enabled: !!selectedChord,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (isError || !song || !transposed) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.error, { color: theme.colors.danger }]}>
          No se pudo cargar la canción.
        </Text>
      </SafeAreaView>
    );
  }

  const currentTone = currentKey(song.originalKey, semitones);

  const incrementSemitones = (delta: number) => {
    const next = Math.max(-11, Math.min(11, semitones + delta));
    setTransposition(songId, next);
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{song.title}</Text>
          <Text style={[styles.artist, { color: theme.colors.textSecondary }]}>{song.artist}</Text>

          <View style={styles.metaRow}>
            <MetaItem label="Tono original" value={song.originalKey} theme={theme} />
            {song.capo > 0 && <MetaItem label="Capo" value={`${song.capo}`} theme={theme} />}
            <MetaItem label="Dificultad" value={song.difficulty} theme={theme} />
          </View>
        </View>

        {/* Letra + acordes */}
        <SongRenderer
          song={transposed}
          fontSize={fontSize}
          onChordPress={(chord) => setSelectedChord(chord)}
        />
      </ScrollView>

      {/* Controles fijos abajo */}
      <TransposeControls
        semitones={semitones}
        currentKey={currentTone}
        onIncrement={() => incrementSemitones(1)}
        onDecrement={() => incrementSemitones(-1)}
        onReset={() => resetTransposition(songId)}
      />

      {/* Modal de acorde */}
      <Modal
        visible={!!selectedChord}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedChord(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSelectedChord(null)}>
          <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
              {selectedChord}
            </Text>
            {chordData ? (
              <ChordDiagram chord={chordData} />
            ) : (
              <View style={{ paddingVertical: 32 }}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            )}
            <Pressable
              onPress={() => setSelectedChord(null)}
              style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceAlt }]}
            >
              <Text style={{ color: theme.colors.textPrimary }}>Cerrar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function MetaItem({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.meta}>
      <Text style={[styles.metaLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: theme.colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 80 },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold' },
  artist: { fontSize: 16, marginTop: 4 },
  metaRow: { flexDirection: 'row', marginTop: 12, gap: 16 },
  meta: { flexDirection: 'column' },
  metaLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  metaValue: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    width: 240,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  closeBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  error: { fontSize: 14 },
});
