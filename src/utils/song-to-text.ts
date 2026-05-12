import { Song } from '../types/song';

/**
 * Convierte una canción (estructura sections/lines/chords) a formato texto
 * editable. Es el mismo formato que entiende el script `import-songs` y
 * el chord-parser del backend, así el round-trip es lossless.
 *
 * Ejemplo de salida:
 *
 *   Title: Mi canción
 *   Artist: Mi artista
 *   Key: C
 *   Difficulty: intermedio
 *
 *   [Verso 1]
 *   C            G
 *   Letra de la línea
 *
 *   [Estribillo]
 *   F        C
 *   Otra letra
 */
export function songToText(song: Song): string {
  const parts: string[] = [];
  parts.push(`Title: ${song.title}`);
  parts.push(`Artist: ${song.artist}`);
  parts.push(`Key: ${song.originalKey}`);
  if (song.capo > 0) {
    parts.push(`Capo: ${song.capo}`);
  }
  parts.push(`Difficulty: ${song.difficulty}`);
  if (song.genre) {
    parts.push(`Genre: ${song.genre}`);
  }
  parts.push('');

  for (const section of song.sections) {
    const label = section.label ?? capitalize(section.type);
    parts.push(`[${label}]`);

    for (const line of section.lines) {
      // Linea inline (acordes mezclados con anotaciones): usamos el texto original
      // que ya contiene los acordes en su posicion exacta.
      if (line.inlineSegments && line.inlineSegments.length > 0) {
        parts.push(line.text || rebuildFromSegments(line.inlineSegments));
        continue;
      }
      // Línea de acordes (si hay): construir string con acordes en sus
      // posiciones exactas (rellenando con espacios).
      if (line.chords && line.chords.length > 0) {
        parts.push(buildChordLine(line.chords));
      }
      // Línea de letra (puede estar vacía si era solo acordes)
      parts.push(line.text);
    }
    // Separador entre secciones
    parts.push('');
  }

  return parts.join('\n').replace(/\n+$/, '\n');
}

/**
 * Reconstruye el texto de una linea a partir de sus segmentos inline.
 * Util por si line.text quedo desactualizado tras una transposicion.
 */
function rebuildFromSegments(segments: Array<{ type: string; content: string }>): string {
  return segments.map((s) => s.content).join('');
}

function buildChordLine(chords: Array<{ chord: string; position: number }>): string {
  // Ordenar por posición ascendente
  const sorted = [...chords].sort((a, b) => a.position - b.position);
  let result = '';
  for (const c of sorted) {
    // Pad con espacios hasta llegar a la posición deseada
    while (result.length < c.position) {
      result += ' ';
    }
    // Si ya pasamos la posición (acordes muy juntos), agregamos un espacio mínimo
    if (result.length > c.position) {
      result += ' ';
    }
    result += c.chord;
  }
  return result;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
