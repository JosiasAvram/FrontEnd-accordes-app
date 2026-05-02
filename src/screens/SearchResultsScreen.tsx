import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { SearchBar } from '../components/SearchBar';
import { useTheme } from '../theme/ThemeProvider';
import { songsApi } from '../services/songs.api';
import { SongsStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<SongsStackParamList, 'SearchResults'>;

export function SearchResultsScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState(route.params.query);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['search', query],
    queryFn: () => songsApi.search({ q: query, limit: 50 }),
    enabled: query.length > 0,
  });

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <View style={styles.searchWrap}>
        <SearchBar initialValue={query} onSubmit={setQuery} autoFocus />
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: theme.colors.danger }]}>
            No se pudo conectar con el servidor.
          </Text>
        </View>
      )}

      {data && (
        <FlatList
          data={data.data}
          keyExtractor={(s) => s._id}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
                No se encontraron resultados para "{query}"
              </Text>
            </View>
          }
          ListHeaderComponent={
            <Text style={[styles.count, { color: theme.colors.textSecondary }]}>
              {data.total} resultado{data.total === 1 ? '' : 's'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, { borderBottomColor: theme.colors.border }]}
              onPress={() => navigation.navigate('SongDetail', { songId: item._id, title: item.title })}
            >
              <View style={styles.rowInfo}>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.artist, { color: theme.colors.textSecondary }]}>{item.artist}</Text>
                {item.genre && (
                  <Text style={[styles.genre, { color: theme.colors.textMuted }]}>{item.genre}</Text>
                )}
              </View>
              <View style={[styles.keyBadge, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Text style={[styles.keyText, { color: theme.colors.primary }]}>
                  {item.originalKey}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchWrap: { padding: 16 },
  center: { padding: 24, alignItems: 'center' },
  empty: { fontSize: 14, fontStyle: 'italic' },
  errorText: { fontSize: 14 },
  count: { paddingHorizontal: 16, paddingBottom: 8, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  rowInfo: { flex: 1 },
  title: { fontSize: 16, fontWeight: '500' },
  artist: { fontSize: 14, marginTop: 2 },
  genre: { fontSize: 12, marginTop: 2 },
  keyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  keyText: { fontSize: 13, fontWeight: 'bold' },
});
