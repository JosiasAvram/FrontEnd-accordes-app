import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { SearchBar } from '../components/SearchBar';
import { useTheme } from '../theme/ThemeProvider';
import { songsApi } from '../services/songs.api';
import { SongsStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<SongsStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const theme = useTheme();

  const { data: popular } = useQuery({
    queryKey: ['popular-songs'],
    queryFn: () => songsApi.list({ limit: 10 }),
  });

  const { data: genres } = useQuery({
    queryKey: ['genres'],
    queryFn: () => songsApi.genres(),
  });

  const goToSearch = (query: string) => {
    navigation.navigate('SearchResults', { query });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Letras y Acordes
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Buscá tu canción favorita
        </Text>

        <View style={styles.searchWrap}>
          <SearchBar onSubmit={goToSearch} />
        </View>

        {/* Géneros */}
        {!!genres?.length && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Géneros</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {genres.map((g) => (
                <Pressable
                  key={g.genre}
                  onPress={() => goToSearch(g.genre)}
                  style={[styles.chip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                >
                  <Text style={[styles.chipText, { color: theme.colors.textPrimary }]}>{g.genre}</Text>
                  <Text style={[styles.chipCount, { color: theme.colors.textMuted }]}>
                    {g.count}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Populares */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Populares</Text>
          {popular?.data.length ? (
            popular.data.map((song) => (
              <Pressable
                key={song._id}
                style={[styles.songRow, { borderBottomColor: theme.colors.border }]}
                onPress={() => navigation.navigate('SongDetail', { songId: song._id, title: song.title })}
              >
                <View style={styles.songInfo}>
                  <Text style={[styles.songTitle, { color: theme.colors.textPrimary }]}>
                    {song.title}
                  </Text>
                  <Text style={[styles.songArtist, { color: theme.colors.textSecondary }]}>
                    {song.artist}
                  </Text>
                </View>
                <View style={[styles.keyBadge, { backgroundColor: theme.colors.surfaceAlt }]}>
                  <Text style={[styles.keyText, { color: theme.colors.primary }]}>
                    {song.originalKey}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
              Todavía no hay canciones cargadas. Ingresá como admin para agregar.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 8 },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  searchWrap: { marginBottom: 24 },
  section: { marginTop: 8, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipText: { fontSize: 14, marginRight: 6 },
  chipCount: { fontSize: 12 },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 16, fontWeight: '500' },
  songArtist: { fontSize: 14, marginTop: 2 },
  keyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  keyText: { fontSize: 13, fontWeight: 'bold' },
  empty: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', paddingVertical: 24 },
});
