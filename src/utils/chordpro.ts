/**
 * Conversion entre el formato ChordPro (acordes inline con corchetes) y la
 * estructura interna de la app (sections/lines/chords).
 *
 * Formato ChordPro de entrada/salida:
 *
 *   Title: Mi cancion
 *   Artist: Mi artista
 *   Key: C
 *   Difficulty: intermedio
 *
 *   [Verso 1]
 *   [C]Letra que va [G]aqui [Am]debajo
 *   [F]Otra linea
 *
 *   [Estribillo]
 *   [C]Estribillo aca
 *
 * Reglas del parser:
 *  - Lineas tipo "Header: valor" al principio = metadata
 *  - Linea vacia separa metadata de cuerpo
 *  - [X] solo donde X es un acorde valido → es un acorde
 *  - [X] donde X NO es acorde valido → es un marcador de seccion
 *  - El resto es letra
 */

import { Song, SongLine, SongSection, ChordPosition, InlineSegment } from '../types/song';

// Regex de acorde valido en cifrado americano.
// Acepta: C, Cm, Cm7, Cmaj7, C#m7, Bb, Csus4, Cadd9, C/G, F#m7b5, etc.
export const CHORD_REGEX = /^[A-G][#b]?(?:m|maj|min|aug|dim|sus)?[0-9]*(?:add[0-9]+)?(?:b[0-9]+)?(?:\/[A-G][#b]?)?$/;

export function isValidChord(token: string): boolean {
  return CHORD_REGEX.test(token.trim());
}

export interface ParsedSong {
  title: string;
  artist: string;
  originalKey: string;
  capo?: number;
  difficulty?: 'principiante' | 'intermedio' | 'avanzado';
  genre?: string;
  sections: SongSection[];
}

const SECTION_TYPE_MAP: Record<string, SongSection['type']> = {
  intro: 'intro',
  verso: 'verso',
  estrofa: 'verso',
  verse: 'verso',
  estribillo: 'estribillo',
  coro: 'estribillo',
  chorus: 'estribillo',
  puente: 'puente',
  bridge: 'puente',
  solo: 'solo',
  outro: 'outro',
  final: 'outro',
};

function inferSectionType(label: string): SongSection['type'] {
  const lower = label.toLowerCase().trim();
  for (const [key, value] of Object.entries(SECTION_TYPE_MAP)) {
    if (lower.startsWith(key)) return value;
  }
  return 'otro';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ──────────────────────────────────────────────────────────────
// PARSE: ChordPro text → ParsedSong
// ──────────────────────────────────────────────────────────────

/**
 * Convierte una linea ChordPro (con [acordes] inline) a una SongLine estructurada.
 */
function parseChordProLine(line: string): SongLine {
  let cleanText = '';
  const chords: ChordPosition[] = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] === '[') {
      const closeIdx = line.indexOf(']', i);
      if (closeIdx !== -1) {
        const content = line.substring(i + 1, closeIdx);
        if (isValidChord(content)) {
          chords.push({ chord: content, position: cleanText.length });
          i = closeIdx + 1;
          continue;
        }
      }
    }
    cleanText += line[i];
    i++;
  }

  // Si la linea es solo acordes (no hay letra), guardamos tambien los
  // inlineSegments para preservar texto/anotaciones entre acordes.
  if (cleanText.trim() === '' && chords.length > 0) {
    const inlineSegments = buildInlineSegments(line);
    return { text: line, chords, inlineSegments };
  }

  return { text: cleanText, chords };
}

function buildInlineSegments(line: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let buffer = '';
  let i = 0;

  while (i < line.length) {
    if (line[i] === '[') {
      const closeIdx = line.indexOf(']', i);
      if (closeIdx !== -1) {
        const content = line.substring(i + 1, closeIdx);
        if (isValidChord(content)) {
          if (buffer) {
            segments.push({ type: 'text', content: buffer });
            buffer = '';
          }
          segments.push({ type: 'chord', content });
          i = closeIdx + 1;
          continue;
        }
      }
    }
    buffer += line[i];
    i++;
  }
  if (buffer) segments.push({ type: 'text', content: buffer });
  return segments;
}

const HEADER_REGEX = /^(Title|Artist|Key|Capo|Difficulty|Genre)\s*:\s*(.+)$/i;
const SECTION_REGEX = /^\s*\[([^\]]+)\]\s*$/;

/**
 * Parser principal: ChordPro text → ParsedSong.
 * Tira Error si faltan campos obligatorios (Title, Artist).
 */
export function chordProToSong(input: string): ParsedSong {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const header: Record<string, string> = {};
  const sections: SongSection[] = [];
  let currentSection: SongSection = { type: 'verso', label: 'Verso', lines: [] };
  let bodyStart = 0;

  // Parse header: lineas "Header: valor" hasta que se acaba o hay una linea vacia
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(HEADER_REGEX);
    if (headerMatch) {
      header[headerMatch[1].toLowerCase()] = headerMatch[2].trim();
      bodyStart = i + 1;
      continue;
    }
    if (line.match(SECTION_REGEX)) {
      // Si la primera "no-header" es una seccion, el body empieza aca
      bodyStart = i;
      break;
    }
    if (line.trim() === '' && Object.keys(header).length > 0) {
      bodyStart = i + 1;
      break;
    }
    if (line.trim() !== '' && !headerMatch) {
      // Linea no vacia que no es header: empieza el body
      bodyStart = i;
      break;
    }
  }

  // Parse body
  const bodyLines = lines.slice(bodyStart);
  for (const line of bodyLines) {
    // Linea vacia: separador dentro de seccion
    if (line.trim() === '') {
      if (currentSection.lines.length > 0) {
        currentSection.lines.push({ text: '', chords: [] });
      }
      continue;
    }

    // Marcador de seccion: [Algo] donde Algo NO es un acorde valido
    const sectionMatch = line.match(SECTION_REGEX);
    if (sectionMatch && !isValidChord(sectionMatch[1])) {
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        type: inferSectionType(sectionMatch[1]),
        label: sectionMatch[1].trim(),
        lines: [],
      };
      continue;
    }

    // Linea normal con posibles acordes inline
    currentSection.lines.push(parseChordProLine(line));
  }

  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  // Validar campos obligatorios
  if (!header['title']) {
    throw new Error('Falta el campo "Title:" en el texto');
  }
  if (!header['artist']) {
    throw new Error('Falta el campo "Artist:" en el texto');
  }

  return {
    title: header['title'],
    artist: header['artist'],
    originalKey: header['key'] ?? 'C',
    capo: header['capo'] ? parseInt(header['capo'], 10) : 0,
    difficulty: (header['difficulty'] as ParsedSong['difficulty']) ?? 'intermedio',
    genre: header['genre'] || undefined,
    sections,
  };
}

// ──────────────────────────────────────────────────────────────
// SERIALIZE: Song → ChordPro text
// ──────────────────────────────────────────────────────────────

/**
 * Convierte una SongLine a string ChordPro insertando los [acordes] en sus
 * posiciones exactas dentro del texto.
 */
function serializeLine(line: SongLine): string {
  // Si tiene inlineSegments (lineas chord-only con anotaciones), las usamos
  // tal cual para preservar texto intermedio.
  if (line.inlineSegments && line.inlineSegments.length > 0) {
    return line.inlineSegments
      .map((seg) => (seg.type === 'chord' ? `[${seg.content}]` : seg.content))
      .join('');
  }

  // Sin acordes: solo la letra
  if (!line.chords || line.chords.length === 0) {
    return line.text;
  }

  // Insertar [chord] markers en sus posiciones.
  // Estrategia: ordenar por posicion DESCENDENTE y insertar de derecha a izquierda
  // para que las posiciones siguientes no se corran al modificar el string.
  const sorted = [...line.chords].sort((a, b) => b.position - a.position);
  let result = line.text;
  for (const c of sorted) {
    const pos = Math.min(Math.max(0, c.position), result.length);
    result = result.substring(0, pos) + `[${c.chord}]` + result.substring(pos);
  }
  return result;
}

/**
 * Serializa una cancion completa al formato ChordPro.
 */
export function songToChordPro(song: Song): string {
  const parts: string[] = [];
  parts.push(`Title: ${song.title}`);
  parts.push(`Artist: ${song.artist}`);
  parts.push(`Key: ${song.originalKey}`);
  if (song.capo && song.capo > 0) parts.push(`Capo: ${song.capo}`);
  parts.push(`Difficulty: ${song.difficulty}`);
  if (song.genre) parts.push(`Genre: ${song.genre}`);
  parts.push('');

  for (const section of song.sections) {
    const label = section.label ?? capitalize(section.type);
    parts.push(`[${label}]`);

    for (const line of section.lines) {
      parts.push(serializeLine(line));
    }
    parts.push('');
  }

  return parts.join('\n').replace(/\n+$/, '\n');
}

// ──────────────────────────────────────────────────────────────
// Helpers para el editor (ChordProEditor)
// ──────────────────────────────────────────────────────────────

/**
 * Encuentra todos los rangos [chord] en un texto.
 * Util para el editor: highlighting en vivo, validacion, etc.
 */
export interface BracketRange {
  start: number; // indice del '['
  end: number; // indice del ']' (inclusive)
  content: string;
  isChord: boolean;
  isSection: boolean;
}

export function findBrackets(text: string): BracketRange[] {
  const ranges: BracketRange[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === '[') {
      const closeIdx = text.indexOf(']', i);
      if (closeIdx !== -1) {
        const content = text.substring(i + 1, closeIdx);
        const isChord = isValidChord(content);
        ranges.push({
          start: i,
          end: closeIdx,
          content,
          isChord,
          isSection: !isChord && content.length > 0,
        });
        i = closeIdx + 1;
        continue;
      }
    }
    i++;
  }
  return ranges;
}

/**
 * Inserta un placeholder [] en la posicion del cursor.
 * Devuelve el nuevo texto + la nueva posicion del cursor (dentro del []).
 */
export function insertChordAtCursor(text: string, cursorPos: number): { text: string; cursor: number } {
  const before = text.substring(0, cursorPos);
  const after = text.substring(cursorPos);
  return {
    text: before + '[]' + after,
    cursor: cursorPos + 1, // dentro del []
  };
}

export function insertSectionAtCursor(
  text: string,
  cursorPos: number,
  sectionLabel: string,
): { text: string; cursor: number } {
  const before = text.substring(0, cursorPos);
  const after = text.substring(cursorPos);
  const insertion = `\n[${sectionLabel}]\n`;
  return {
    text: before + insertion + after,
    cursor: cursorPos + insertion.length,
  };
}
