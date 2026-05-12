import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../store/auth';
import { ChordProEditor } from '../components/ChordProEditor';
import { chordProToSong } from '../utils/chordpro';
import { songsApi } from '../services/songs.api';

// Plantilla inicial para una cancion nueva
const STARTER_TEMPLATE = `Title:
Artist:
Key: C
Difficulty: intermedio

[Intro]
[C] [G] [Am] [F]

[Verso 1]
[C]Acá va la primera [G]línea de la canción
[Am]Acá va la segunda [F]línea

[Estribillo]
[F]Acá el estribillo [C]con sus acordes
[G]En la línea de [Am]abajo continúa
`;

export function CreateSongScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const user = useAuth((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [text, setText] = useState(STARTER_TEMPLATE);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = chordProToSong(text);
      return songsApi.create({
        title: parsed.title,
        artist: parsed.artist,
        originalKey: parsed.originalKey,
        capo: parsed.capo,
        difficulty: parsed.difficulty ?? 'intermedio',
        genre: parsed.genre,
        sections: parsed.sections,
        status: 'published',
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['songs-list'] });
      Alert.alert(
        '✓ Canción creada',
        `"${created.title}" — ${created.artist}`,
        [
          {
            text: 'Crear otra',
            onPress: () => setText(STARTER_TEMPLATE),
          },
          {
            text: 'Volver',
            onPress: () => {
              setText(STARTER_TEMPLATE);
              navigation.goBack();
            },
          },
        ],
      );
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ??
        (err as { message?: string }).message ??
        'No se pudo guardar.';
      Alert.alert('Error al guardar', String(msg));
    },
  });

  const handleSave = () => {
    try {
      const parsed = chordProToSong(text);
      if (!parsed.title.trim() || !parsed.artist.trim()) {
        Alert.alert(
          'Faltan datos',
          'Completá el Título y el Artista arriba del texto.',
        );
        return;
      }
    } catch (err) {
      Alert.alert('Formato inválido', (err as Error).message);
      return;
    }
    mutation.mutate();
  };

  // Bloqueo si no es admin
  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <View style={styles.lockedContainer}>
          <Text style={[styles.lockedTitle, { color: theme.colors.textPrimary }]}>
            🔒 Solo para admin
          </Text>
          <Text style={[styles.lockedMsg, { color: theme.colors.textSecondary }]}>
            Para crear canciones nuevas, iniciá sesión como administrador desde la pestaña Ajustes.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Nueva canción
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={mutation.isPending}
            hitSlop={12}
            style={[
              styles.saveBtn,
              {
                backgroundColor: mutation.isPending
                  ? theme.colors.surfaceAlt
                  : theme.colors.primary,
              },
            ]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={theme.colors.textPrimary} />
            ) : (
              <Text style={styles.saveBtnText}>Guardar</Text>
            )}
          </Pressable>
        </View>

        <ChordProEditor
          value={text}
          onChangeText={setText}
          placeholder="Escribí Title, Artist y el contenido..."
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: 'bold' },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  lockedTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  lockedMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
