import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../theme/ThemeProvider';
import { songsApi } from '../services/songs.api';
import { useToggleList } from '../hooks/useSongList';
import {
  useListState,
  shouldShowNotifyButton,
  useDismissNotification,
  useSendNotification,
} from '../hooks/useListState';
import { useAuth } from '../store/auth';
import { NewBadge } from '../components/NewBadge';
import { Toast } from '../components/Toast';
import { SongsStackParamList } from '../navigation/RootNavigator';
import { SongSummary, SearchResponse } from '../types/song';

// Duracion del toast de "Eliminada · Deshacer" antes de que el delete se
// confirme contra el backend.
const UNDO_WINDOW_MS = 5000;
const TICK_MS = 100;

type Props = NativeStackScreenProps<SongsStackParamList, 'Home'>;

type SortOption = 'title' | 'artist' | 'list';

interface ArtistGroup {
  artist: string;
  count: number;
}

/**
 * Hook simple de debounce — espera N ms desde el último cambio del valor
 * antes de devolver el valor "estable". Sirve para no spamear al backend
 * con cada tecla que escribe el usuario.
 */
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function HomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const isAdmin = useAuth((s) => s.isAuthenticated && s.user?.role === 'admin');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('title');
  // Cuando estamos en modo "artist" y el usuario elige un artista,
  // pasamos a mostrar solo sus canciones. Null = lista de artistas.
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Cambiar de modo o buscar resetea el artista seleccionado
  useEffect(() => {
    setSelectedArtist(null);
  }, [sort, debouncedQuery]);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['songs-list', debouncedQuery, sort],
    queryFn: async () => {
      // Si hay query, usa el endpoint de búsqueda; si no, lista todas
      if (debouncedQuery.trim()) {
        return songsApi.search({ q: debouncedQuery, limit: 200 });
      }
      return songsApi.list({ limit: 200 });
    },
    retry: 2,
  });

  // Ordenamiento + filtrado client-side
  const sortedSongs = useMemo(() => {
    if (!data?.data) return [];
    let arr = [...data.data];

    if (sort === 'list') {
      arr = arr.filter((s) => s.inList);
      arr.sort((a, b) =>
        a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }),
      );
    } else if (sort === 'artist' && selectedArtist) {
      // Mostrar solo las canciones del artista seleccionado, ordenadas A-Z
      arr = arr.filter((s) => s.artist === selectedArtist);
      arr.sort((a, b) =>
        a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }),
      );
    } else if (sort === 'title') {
      arr.sort((a, b) =>
        a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }),
      );
    }
    return arr;
  }, [data, sort, selectedArtist]);

  // Lista de artistas con su contador de canciones (solo se computa en modo artist sin artista seleccionado)
  const artistGroups = useMemo<ArtistGroup[]>(() => {
    if (!data?.data || sort !== 'artist' || selectedArtist) return [];
    const counts = new Map<string, number>();
    for (const song of data.data) {
      counts.set(song.artist, (counts.get(song.artist) ?? 0) + 1);
    }
    const groups: ArtistGroup[] = Array.from(counts.entries()).map(
      ([artist, count]) => ({ artist, count }),
    );
    groups.sort((a, b) =>
      a.artist.localeCompare(b.artist, 'es', { sensitivity: 'base' }),
    );
    return groups;
  }, [data, sort, selectedArtist]);

  const sortOptions: Array<{ key: SortOption; label: string }> = [
    { key: 'title', label: 'A-Z' },
    { key: 'artist', label: 'Artista' },
    { key: 'list', label: '★ Lista' },
  ];

  // Decidir si mostramos lista de artistas o de canciones
  const showArtistList = sort === 'artist' && !selectedArtist;

  // ── Notificaciones (solo en modo Lista) ───────────────
  const { data: listState } = useListState();
  const dismissMutation = useDismissNotification();
  const sendMutation = useSendNotification();
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');

  // Cantidad real de canciones en la lista (independiente del filtro actual)
  const inListCount = useMemo(
    () => (data?.data ?? []).filter((s) => s.inList).length,
    [data],
  );

  const notifyButtonVisible =
    sort === 'list' &&
    inListCount > 0 &&
    shouldShowNotifyButton(listState);

  const handleNotifyPress = () => {
    Alert.alert(
      'Notificar a todos',
      '¿Estás seguro? Esto va a mandar una notificación push a todos los dispositivos con la app.',
      [
        {
          text: 'No',
          style: 'destructive',
          onPress: () => dismissMutation.mutate(),
        },
        {
          text: 'Sí',
          onPress: () => {
            setMessageText('');
            setShowMessageModal(true);
          },
        },
      ],
    );
  };

  const handleSendMessage = () => {
    const trimmed = messageText.trim();
    if (!trimmed) {
      Alert.alert('Falta el mensaje', 'Escribí un texto para la notificación.');
      return;
    }
    sendMutation.mutate(trimmed, {
      onSuccess: () => {
        setShowMessageModal(false);
        setMessageText('');
        Alert.alert('✓ Enviado', 'Notificación enviada a todos los dispositivos.');
      },
      onError: () => {
        Alert.alert('Error', 'No se pudo enviar la notificación. Intentá de nuevo.');
      },
    });
  };

  // ── Borrado con undo (toast) ──────────────────────────
  // Cuando el admin confirma "eliminar", removemos la cancion del cache
  // optimisticamente, mostramos un toast, y esperamos UNDO_WINDOW_MS antes de
  // mandar el DELETE real al backend. Si toca "Deshacer" en ese rango, lo cancelamos.
  interface PendingDelete {
    song: SongSummary;
    snapshot: Array<[unknown, SearchResponse | undefined]>;
    remainingMs: number;
  }
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const pendingDeleteRef = useRef<PendingDelete | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mantenemos la ref sincronizada con el state para acceder al ultimo valor desde callbacks
  useEffect(() => {
    pendingDeleteRef.current = pendingDelete;
  }, [pendingDelete]);

  const finalizeDelete = (id: string) => {
    // Llamada real al backend (DELETE /songs/:id)
    songsApi.remove(id).catch((err) => {
      console.warn('[delete] error al eliminar en backend:', err);
      // Si falla, refrescamos para que vuelva a aparecer
      queryClient.invalidateQueries({ queryKey: ['songs-list'] });
    });
    // Limpiar todo el estado pendiente
    clearTicker();
    setPendingDelete(null);
  };

  const clearTicker = () => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  };

  const undoDelete = () => {
    const current = pendingDeleteRef.current;
    if (!current) return;
    // Restaurar el snapshot del cache → la cancion vuelve a aparecer
    current.snapshot.forEach(([key, dataSnap]) => {
      queryClient.setQueryData(key as unknown as readonly unknown[], dataSnap);
    });
    clearTicker();
    setPendingDelete(null);
  };

  const requestDelete = (song: SongSummary) => {
    // Si hay otro delete pendiente, lo finalizamos ya mismo (el usuario eligio
    // empezar otro). Asi no nos quedamos con timers cruzados.
    if (pendingDeleteRef.current) {
      finalizeDelete(pendingDeleteRef.current.song._id);
    }

    // Snapshot del cache actual para poder restaurar si toca "Deshacer"
    const snapshot = queryClient.getQueriesData<SearchResponse>({
      queryKey: ['songs-list'],
    }) as Array<[unknown, SearchResponse | undefined]>;

    // Optimistic remove: sacar la cancion del cache
    queryClient.setQueriesData<SearchResponse>(
      { queryKey: ['songs-list'] },
      (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((s) => s._id !== song._id),
          total: Math.max(0, (old.total ?? 0) - 1),
        };
      },
    );

    setPendingDelete({ song, snapshot, remainingMs: UNDO_WINDOW_MS });

    // Tick del countdown — cada 100ms decrementa remainingMs
    clearTicker();
    tickIntervalRef.current = setInterval(() => {
      const current = pendingDeleteRef.current;
      if (!current) {
        clearTicker();
        return;
      }
      const next = current.remainingMs - TICK_MS;
      if (next <= 0) {
        // Tiempo agotado → finalizar (DELETE al backend)
        finalizeDelete(current.song._id);
      } else {
        setPendingDelete({ ...current, remainingMs: next });
      }
    }, TICK_MS);
  };

  // Limpieza al desmontar
  useEffect(() => {
    return () => clearTicker();
  }, []);

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Letras y Acordes
        </Text>

        {/* Búsqueda live (con debounce de 300ms) */}
        <View style={[styles.searchWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.searchIcon, { color: theme.colors.textMuted }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Buscar artista o canción..."
            placeholderTextColor={theme.colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Text style={[styles.searchClear, { color: theme.colors.textMuted }]}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Botones de orden + contador */}
        <View style={styles.sortRow}>
          {sortOptions.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => setSort(s.key)}
              style={[
                styles.sortChip,
                {
                  backgroundColor:
                    sort === s.key ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: sort === s.key ? '#000' : theme.colors.textPrimary,
                  fontWeight: '600',
                  fontSize: 13,
                }}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
          <View style={{ flex: 1 }} />
          <Text style={[styles.count, { color: theme.colors.textMuted }]}>
            {showArtistList
              ? `${artistGroups.length} ${artistGroups.length === 1 ? 'artista' : 'artistas'}`
              : `${sortedSongs.length} ${sortedSongs.length === 1 ? 'canción' : 'canciones'}`}
          </Text>
        </View>

        {/* Breadcrumb cuando estás viendo las canciones de un artista */}
        {sort === 'artist' && selectedArtist && (
          <Pressable
            onPress={() => setSelectedArtist(null)}
            style={[styles.backRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Text style={[styles.backArrow, { color: theme.colors.primary }]}>‹</Text>
            <Text style={[styles.backText, { color: theme.colors.textPrimary }]}>
              Volver a artistas
            </Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.backArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {selectedArtist}
            </Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            Cargando... (la primera vez puede tardar 30-60s)
          </Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={[styles.errorTitle, { color: theme.colors.danger }]}>
            ⚠️ No se pudo conectar
          </Text>
          <Text style={[styles.errorMsg, { color: theme.colors.textSecondary }]}>
            {(error as Error)?.message ?? 'Error desconocido'}
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={{ color: '#000', fontWeight: '600' }}>Reintentar</Text>
          </Pressable>
        </View>
      ) : showArtistList ? (
        // Modo "Artista" sin artista seleccionado → lista de artistas
        <FlatList
          data={artistGroups}
          keyExtractor={(g) => g.artist}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
                No hay artistas cargados todavía.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedArtist(item.artist)}
              style={[styles.row, { borderBottomColor: theme.colors.border }]}
            >
              <View style={styles.rowInfo}>
                <Text style={[styles.songTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {item.artist}
                </Text>
                <Text style={[styles.songArtist, { color: theme.colors.textSecondary }]}>
                  {item.count} {item.count === 1 ? 'canción' : 'canciones'}
                </Text>
              </View>
              <Text style={[styles.chevron, { color: theme.colors.textMuted }]}>›</Text>
            </Pressable>
          )}
        />
      ) : (
        // Lista de canciones (modo A-Z, Lista o Artista con artista seleccionado)
        <FlatList
          data={sortedSongs}
          keyExtractor={(s) => s._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
                {sort === 'list'
                  ? 'Aún no agregaste canciones a tu lista.\nTocá la ★ en cualquier canción para agregarla.'
                  : debouncedQuery
                  ? `No se encontraron resultados para "${debouncedQuery}"`
                  : 'No hay canciones cargadas todavía.'}
              </Text>
            </View>
          }
          ListHeaderComponent={
            isFetching && !isLoading ? (
              <View style={styles.fetchingBar}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <SongRow
              song={item}
              canDelete={isAdmin}
              onRequestDelete={requestDelete}
              onPress={() =>
                navigation.navigate('SongDetail', {
                  songId: item._id,
                  title: item.title,
                })
              }
            />
          )}
        />
      )}

      {/* Boton "Notificar" — fijo abajo, solo en modo Lista con cambios pendientes */}
      {notifyButtonVisible && (
        <View style={styles.notifyBar}>
          <Pressable
            onPress={handleNotifyPress}
            disabled={dismissMutation.isPending || sendMutation.isPending}
            style={[
              styles.notifyBtn,
              {
                backgroundColor: theme.colors.primary,
                opacity:
                  dismissMutation.isPending || sendMutation.isPending ? 0.5 : 1,
              },
            ]}
          >
            <Text style={styles.notifyBtnText}>🔔 Notificar a todos</Text>
          </Pressable>
        </View>
      )}

      {/* Modal con TextInput para el mensaje de la notificacion */}
      <Modal
        visible={showMessageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMessageModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              Mensaje de la notificación
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Título: "Lista actualizada"
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Ej: Repertorio del domingo cargado"
              placeholderTextColor={theme.colors.textMuted}
              maxLength={50}
              multiline
              autoFocus
            />
            <Text style={[styles.modalCounter, { color: theme.colors.textMuted }]}>
              {messageText.length} / 50
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setShowMessageModal(false);
                  setMessageText('');
                }}
                style={[styles.modalBtn, { backgroundColor: theme.colors.surfaceAlt }]}
              >
                <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSendMessage}
                disabled={sendMutation.isPending || !messageText.trim()}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: messageText.trim()
                      ? theme.colors.primary
                      : theme.colors.surfaceAlt,
                    opacity: sendMutation.isPending ? 0.5 : 1,
                  },
                ]}
              >
                {sendMutation.isPending ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text
                    style={{
                      color: messageText.trim() ? '#000' : theme.colors.textMuted,
                      fontWeight: '600',
                    }}
                  >
                    Enviar
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Toast de "Eliminada · Deshacer" */}
      <Toast
        visible={!!pendingDelete}
        message={
          pendingDelete
            ? `🗑 "${pendingDelete.song.title}" eliminada`
            : ''
        }
        actionLabel="Deshacer"
        onAction={undoDelete}
        remainingMs={pendingDelete?.remainingMs}
      />
    </SafeAreaView>
  );
}

function SongRow({
  song,
  onPress,
  onRequestDelete,
  canDelete,
}: {
  song: SongSummary;
  onPress: () => void;
  onRequestDelete?: (song: SongSummary) => void;
  canDelete: boolean;
}) {
  const theme = useTheme();
  const toggleList = useToggleList();
  const inList = !!song.inList;
  const swipeableRef = useRef<Swipeable>(null);

  const askToDelete = () => {
    Alert.alert(
      'Eliminar canción',
      `¿Estás seguro de eliminar "${song.title}" de "${song.artist}"? Vas a tener 5 segundos para deshacerlo.`,
      [
        {
          text: 'No',
          style: 'cancel',
          onPress: () => swipeableRef.current?.close(),
        },
        {
          text: 'Sí, eliminar',
          style: 'destructive',
          onPress: () => {
            swipeableRef.current?.close();
            onRequestDelete?.(song);
          },
        },
      ],
    );
  };

  const renderRightActions = () => (
    <Pressable
      onPress={askToDelete}
      style={[styles.deleteAction, { backgroundColor: theme.colors.danger }]}
    >
      <Text style={styles.deleteText}>🗑 Eliminar</Text>
    </Pressable>
  );

  const rowContent = (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <View style={styles.rowInfo}>
        <View style={styles.titleRow}>
          <Text style={[styles.songTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {song.title}
          </Text>
          <NewBadge createdAt={song.createdAt} />
        </View>
        <Text style={[styles.songArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {song.artist}
        </Text>
      </View>

      {/* Estrella tappeable para agregar/quitar de la lista (sin abrir el detalle) */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          toggleList.mutate(song._id);
        }}
        hitSlop={10}
        style={styles.starBtn}
      >
        <Text
          style={[
            styles.starIcon,
            { color: inList ? theme.colors.primary : theme.colors.textMuted },
          ]}
        >
          {inList ? '★' : '☆'}
        </Text>
      </Pressable>

      <View style={[styles.keyBadge, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Text style={[styles.keyText, { color: theme.colors.primary }]}>
          {song.originalKey}
        </Text>
      </View>
    </Pressable>
  );

  // Sin admin → sin swipe; render directo
  if (!canDelete) return rowContent;

  // Admin → Swipeable con accion "Eliminar" a la derecha
  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      rightThreshold={40}
    >
      {rowContent}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 12 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16 },
  searchClear: { fontSize: 16, padding: 4 },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  count: { fontSize: 12 },
  listContent: { paddingBottom: 32 },
  fetchingBar: { paddingVertical: 8, alignItems: 'center' },
  center: { padding: 24, alignItems: 'center' },
  empty: { fontSize: 14, fontStyle: 'italic', textAlign: 'center' },
  loadingText: { fontSize: 13, marginTop: 12, textAlign: 'center' },
  errorTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  errorMsg: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  rowInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  songTitle: { fontSize: 16, fontWeight: '500', flexShrink: 1 },
  songArtist: { fontSize: 14, marginTop: 2 },
  starBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  starIcon: { fontSize: 22 },
  keyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 4 },
  keyText: { fontSize: 13, fontWeight: 'bold' },
  chevron: { fontSize: 24, fontWeight: '300', marginLeft: 8 },
  // Accion "Eliminar" que aparece al deslizar a la izquierda
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
  },
  deleteText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  backArrow: { fontSize: 22, fontWeight: '600', marginRight: 4, lineHeight: 24 },
  backText: { fontSize: 14, fontWeight: '600' },
  backArtist: { fontSize: 13, maxWidth: 180 },
  // Boton "Notificar a todos" fijo abajo del listado
  notifyBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  notifyBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  notifyBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  // Modal del mensaje
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle: { fontSize: 12, marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  modalCounter: { fontSize: 11, textAlign: 'right', marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
