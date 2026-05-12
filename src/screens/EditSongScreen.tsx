import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../theme/ThemeProvider';
import { songsApi } from '../services/songs.api';
import { ChordProEditor } from '../components/ChordProEditor';
import { chordProToSong, songToChordPro } from '../utils/chordpro';
import { SongsStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<SongsStackParamList, 'EditSong'>;

export function EditSongScreen({ route, navigation }: Props) {
  const { songId } = route.params;
  const theme = useTheme();
  const queryClient = useQueryClient();

  const { data: song, isLoading } = useQuery({
    queryKey: ['song', songId],
    queryFn: () => songsApi.findById(songId),
  });

  const [text, setText] = useState('');
  const [dirty, setDirty] = useState(false);

  // Cuando carga la canción, inicializar el editor con su contenido en formato ChordPro
  useEffect(() => {
    if (song) {
      setText(songToChordPro(song));
      setDirty(false);
    }
  }, [song]);

  const initialText = useMemo(() => (song ? songToChordPro(song) : ''), [song]);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = chordProToSong(text);
      return songsApi.update(songId, {
        title: parsed.title,
        artist: parsed.artist,
        originalKey: parsed.originalKey,
        capo: parsed.capo,
        difficulty: parsed.difficulty,
        genre: parsed.genre,
        sections: parsed.sections,
      });
    },
    onSuccess: (updated) => {
      // Actualizar la cache de react-query con la nueva versión
      queryClient.setQueryData(['song', songId], updated);
      queryClient.invalidateQueries({ queryKey: ['songs-list'] });
      Alert.alert('Guardado', 'Los cambios se guardaron correctamente.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
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
    if (!dirty) {
      Alert.alert('Sin cambios', 'No hay cambios para guardar.');
      return;
    }
    try {
      const parsed = chordProToSong(text);
      if (!parsed.title.trim() || !parsed.artist.trim()) {
        Alert.alert(
          'Faltan datos',
          'Completá los campos Title y Artist arriba del texto.',
        );
        return;
      }
    } catch (err) {
      Alert.alert(
        'Formato inválido',
        (err as Error).message + '\n\nRevisá los campos Title: y Artist: arriba del texto.',
      );
      return;
    }
    mutation.mutate();
  };

  const handleCancel = () => {
    if (!dirty) {
      navigation.goBack();
      return;
    }
    Alert.alert('Descartar cambios', '¿Estás seguro? Vas a perder lo modificado.', [
      { text: 'Volver a editar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  const handleReset = () => {
    Alert.alert(
      'Resetear cambios',
      '¿Volver al contenido original (descartar tus modificaciones locales)?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetear',
          style: 'destructive',
          onPress: () => {
            setText(initialText);
            setDirty(false);
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!song) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.danger }}>No se pudo cargar la canción.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {/* Header con botones */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Pressable onPress={handleCancel} hitSlop={12}>
            <Text style={[styles.headerBtn, { color: theme.colors.textSecondary }]}>
              Cancelar
            </Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              Editar canción
            </Text>
            {dirty && (
              <Pressable onPress={handleReset} hitSlop={6}>
                <Text style={[styles.resetBtn, { color: theme.colors.danger }]}>
                  Resetear
                </Text>
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={handleSave}
            disabled={mutation.isPending}
            hitSlop={12}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text
                style={[
                  styles.headerBtn,
                  {
                    color: dirty ? theme.colors.primary : theme.colors.textMuted,
                    fontWeight: 'bold',
                  },
                ]}
              >
                Guardar
              </Text>
            )}
          </Pressable>
        </View>

        {/* Editor ChordPro (toolbar + textarea con validación) */}
        <ChordProEditor
          value={text}
          onChangeText={(t) => {
            setText(t);
            setDirty(t !== initialText);
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { fontSize: 16 },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  resetBtn: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
