import { useMutation, useQueryClient } from '@tanstack/react-query';
import { songsApi } from '../services/songs.api';
import { SearchResponse, Song } from '../types/song';

/**
 * Hook para agregar/quitar canciones de la "Lista" compartida.
 *
 * La lista vive en el backend (no en AsyncStorage). Cualquier dispositivo
 * que toque la estrella dispara una request → el backend actualiza el
 * campo `inList` de la cancion → la proxima vez que cualquier otro
 * dispositivo refresque ve el cambio.
 *
 * Usamos optimistic updates para que la UI cambie INSTANTANEAMENTE al
 * tocar la estrella, sin esperar la respuesta del server. Si la request
 * falla, hacemos rollback.
 */
export function useToggleList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => songsApi.toggleList(id),

    // Optimistic: actualizar todas las caches con el toggle ANTES de la respuesta
    onMutate: async (id: string) => {
      // Cancelar refetches en vuelo para que no pisen nuestra actualizacion
      await queryClient.cancelQueries({ queryKey: ['songs-list'] });
      await queryClient.cancelQueries({ queryKey: ['song', id] });

      // Snapshot del estado actual para rollback en caso de error
      const prevListQueries = queryClient.getQueriesData<SearchResponse>({
        queryKey: ['songs-list'],
      });
      const prevSong = queryClient.getQueryData<Song>(['song', id]);

      // Optimistically flip inList en TODAS las queries de listado
      queryClient.setQueriesData<SearchResponse>(
        { queryKey: ['songs-list'] },
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((s) =>
              s._id === id ? { ...s, inList: !s.inList } : s,
            ),
          };
        },
      );

      // Optimistically flip inList en la query del detalle
      queryClient.setQueryData<Song>(['song', id], (old) =>
        old ? { ...old, inList: !old.inList } : old,
      );

      return { prevListQueries, prevSong };
    },

    onError: (_err, id, context) => {
      // Rollback de las listas
      context?.prevListQueries?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      // Rollback del detalle
      if (context?.prevSong) {
        queryClient.setQueryData(['song', id], context.prevSong);
      }
    },

    onSettled: (_data, _err, id) => {
      // Forzar refetch para asegurar consistencia con el server
      queryClient.invalidateQueries({ queryKey: ['songs-list'] });
      queryClient.invalidateQueries({ queryKey: ['song', id] });
    },
  });
}
