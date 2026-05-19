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
 * Scope de busqueda:
 *  - 'title' → solo busca en el titulo de la cancion
 *  - 'artist' → solo busca en el nombre del artista
 *  - 'both' → busca en ambos (default historico)
 */
export type SearchScope = 'title' | 'artist' | 'both';

/**
 * Aplica la logica de matching de "1 palabra → busca contenido con typos" vs
 * "2+ palabras → prefijo estricto" sobre un texto target (titulo o artista).
 */
function matchesText(
  tokens: string[],
  text: string,
): number | null {
  const textNorm = normalize(text);

  if (tokens.length === 1) {
    // 1 palabra: matchea en cualquier parte del texto (tolerancia a typos)
    return singleTokenMatch(tokens[0], textNorm);
  }

  // 2+ palabras: el texto debe EMPEZAR con la secuencia
  const textTokens = textNorm.split(/\s+/);
  let totalScore = 0;
  for (let i = 0; i < tokens.length; i++) {
    const queryToken = tokens[i];
    const textToken = textTokens[i];
    if (!textToken) return null;
    const score = wordPrefixMatch(queryToken, textToken);
    if (score === null) return null;
    totalScore += score;
  }
  return totalScore;
}

/**
 * Filtra y ordena las canciones segun el query del usuario y el scope.
 * - Si no hay query → devuelve todas (sin cambios)
 * - scope='title' → busca solo en title
 * - scope='artist' → busca solo en artist
 * - scope='both' → busca en ambos, con title como prioridad
 *
 * Reglas de matching:
 *  - 1 palabra → buscar en el campo target con tolerancia a typos
 *  - 2+ palabras → el campo target debe EMPEZAR con esa secuencia
 */
export function filterSongs<T extends SearchableSong>(
  songs: T[],
  query: string,
  scope: SearchScope = 'both',
): T[] {
  const q = normalize(query);
  if (!q) return songs;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return songs;

  const scored: Array<Scored<T>> = [];

  for (const song of songs) {
    let score: number | null = null;

    if (scope === 'title') {
      score = matchesText(tokens, song.title);
    } else if (scope === 'artist') {
      score = matchesText(tokens, song.artist);
    } else {
      // 'both' → toma el mejor entre title y artist (title tiene prioridad)
      const titleScore = matchesText(tokens, song.title);
      const artistScore = matchesText(tokens, song.artist);
      if (titleScore !== null && artistScore !== null) {
        score = Math.min(titleScore, artistScore + 10);
      } else if (titleScore !== null) {
        score = titleScore;
      } else if (artistScore !== null) {
        score = artistScore + 10;
      }
    }

    if (score !== null) scored.push({ song, score });
  }

  scored.sort((a, b) => a.score - b.score);
  return scored.map((s) => s.song);
}
