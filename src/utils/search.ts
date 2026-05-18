/**
 * Busqueda de canciones en el cliente con dos modos:
 *  - 1 palabra → busca esa palabra dentro del titulo o artista, con tolerancia
 *    a typos (Levenshtein). Ej: "glorua" encuentra "gloria".
 *  - 2+ palabras → el titulo DEBE EMPEZAR con esa secuencia de palabras (prefijo).
 *    Cada palabra puede tener un typo chico. Ej: "a el" matchea "A Él la gloria"
 *    pero NO "Al que esta en el trono".
 *
 * Todo es accent-insensitive y case-insensitive.
 */

export interface SearchableSong {
  _id: string;
  title: string;
  artist: string;
}

// ── Helpers ────────────────────────────────────────────────

/**
 * Normaliza un string: minusculas + sin acentos.
 * Ej: "Él Cantó" → "el canto"
 */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Distancia de Levenshtein entre dos strings. Cuanto mas chica, mas parecidos.
 * Usado para tolerancia a typos.
 *
 * Implementacion 1D para usar O(n) memoria.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const dp: number[] = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      prev = temp;
    }
  }
  return dp[b.length];
}

/**
 * Tolerancia a typos segun el largo de la palabra:
 *  - <= 3 chars → 0 typos (debe matchear exacto al inicio)
 *  - 4-6 chars → 1 typo
 *  - 7+ chars → 2 typos
 */
function typoTolerance(query: string): number {
  if (query.length <= 3) return 0;
  if (query.length <= 6) return 1;
  return 2;
}

/**
 * ¿La query "matchea" la palabra del titulo, considerando typos?
 * Devuelve un score (menor = mejor match) o null si no matchea.
 *  - 0 → la palabra empieza con la query exacta
 *  - 1-2 → typos en la query, palabra empieza similar
 *  - null → no matchea
 */
function wordPrefixMatch(query: string, word: string): number | null {
  // Match exacto de prefijo (preferido)
  if (word.startsWith(query)) return 0;

  // Si la query es muy corta, no tolerar typos para evitar falsos positivos
  const tolerance = typoTolerance(query);
  if (tolerance === 0) return null;

  // Comparar la query con el prefijo de la palabra de igual largo
  const prefix = word.slice(0, query.length);
  const dist = levenshtein(query, prefix);
  if (dist <= tolerance) return dist;

  return null;
}

/**
 * ¿La query (1 palabra) aparece en alguna parte del texto, con tolerancia a typos?
 * Busca en cada palabra del texto (split por espacios) si matchea.
 */
function singleTokenMatch(query: string, text: string): number | null {
  const words = text.split(/\s+/);
  let bestScore: number | null = null;
  for (const word of words) {
    const score = wordPrefixMatch(query, word);
    if (score !== null && (bestScore === null || score < bestScore)) {
      bestScore = score;
    }
  }
  return bestScore;
}

// ── API principal ──────────────────────────────────────────

interface Scored<T> {
  song: T;
  score: number;
}

/**
 * Filtra y ordena las canciones segun el query del usuario.
 * - Si no hay query → devuelve todas (sin cambios)
 * - Si 1 token → busca en titulo/artista con typo tolerance
 * - Si 2+ tokens → el TITULO debe empezar con esa secuencia (prefijo estricto)
 */
export function filterSongs<T extends SearchableSong>(
  songs: T[],
  query: string,
): T[] {
  const q = normalize(query);
  if (!q) return songs;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return songs;

  const scored: Array<Scored<T>> = [];

  if (tokens.length === 1) {
    // ── 1 palabra: buscar en titulo o artista (cualquier parte) ──
    const queryToken = tokens[0];
    for (const song of songs) {
      const titleNorm = normalize(song.title);
      const artistNorm = normalize(song.artist);

      const titleScore = singleTokenMatch(queryToken, titleNorm);
      const artistScore = singleTokenMatch(queryToken, artistNorm);

      let score: number | null = null;
      if (titleScore !== null && artistScore !== null) {
        score = Math.min(titleScore, artistScore + 10);
      } else if (titleScore !== null) {
        score = titleScore;
      } else if (artistScore !== null) {
        score = artistScore + 10; // artista es secundario
      }

      if (score !== null) scored.push({ song, score });
    }
  } else {
    // ── 2+ palabras: el titulo debe EMPEZAR con la secuencia ──
    for (const song of songs) {
      const titleNorm = normalize(song.title);
      const titleTokens = titleNorm.split(/\s+/);

      let totalScore = 0;
      let allMatch = true;
      for (let i = 0; i < tokens.length; i++) {
        const queryToken = tokens[i];
        const titleToken = titleTokens[i];
        if (!titleToken) {
          allMatch = false;
          break;
        }
        const score = wordPrefixMatch(queryToken, titleToken);
        if (score === null) {
          allMatch = false;
          break;
        }
        totalScore += score;
      }

      if (allMatch) scored.push({ song, score: totalScore });
    }
  }

  // Ordenar por score ascendente (mejor match primero)
  scored.sort((a, b) => a.score - b.score);
  return scored.map((s) => s.song);
}
