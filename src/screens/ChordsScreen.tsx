import { useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { useTheme } from '../theme/ThemeProvider';
import { chordsApi } from '../services/chords.api';
import { ChordViewer } from '../components/ChordViewer';
import { Chord } from '../types/chord';

const CATEGORY_LABELS: Record<string, string> = {
  mayor: 'Mayores',
  menor: 'Menores',
  septima: 'Séptimas',
  sus: 'Suspendidos',
  dim: 'Disminuidos',
  aug: 'Aumentados',
  otro: 'Otros',
};

export function ChordsScreen() {
  const theme = useTheme();
  const [selected, setSelected] = useState<Chord | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['chords-by-category'],
    queryFn: () => chordsApi.groupedByCategory('guitar'),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Acordes de guitarra</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Tocá un acorde para ver su diagrama.
        </Text>

        {data?.map((group) => (
          <View key={group.category} style={styles.group}>
            <Text style={[styles.groupTitle, { color: theme.colors.accent }]}>
              {CATEGORY_LABELS[group.category] ?? group.category}
            </Text>
            <View style={styles.gridWrap}>
              {group.chords.map((chord) => (
                <Pressable
                  key={chord._id}
                  onPress={() => setSelected(chord)}
                  style={[styles.chordChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                >
                  <Text style={[styles.chordText, { color: theme.colors.primary }]}>
                    {chord.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal de acorde seleccionado */}
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
          {selected && (
            <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
                {selected.name}
              </Text>
              <ChordViewer chord={selected} />
              <Pressable
                onPress={() => setSelected(null)}
                style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceAlt }]}
              >
                <Text style={{ color: theme.colors.textPrimary }}>Cerrar</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  group: { marginBottom: 24 },
  groupTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chordChip: {
    minWidth: 56,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
  },
  chordText: { fontSize: 16, fontWeight: 'bold' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    width: 320,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  difficulty: { fontSize: 13, marginTop: 12 },
  closeBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
