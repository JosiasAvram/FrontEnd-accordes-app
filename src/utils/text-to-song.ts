import { SongSection, SongLine, ChordPosition, InlineSegment } from '../types/song';

/**
 * Parser inverso a song-to-text: convierte texto editable de vuelta a la
 * estructura de secciones/líneas/acordes que espera el backend.
 *
 * Espera el formato:
 *   Title: ...
 *   Artist: ...
 *   Key: ...
 *   Difficulty: ...
 *   Capo: ... (opcional)
 *   Genre: ... (opcional)
 *
 *   [Sección]
 *   C            G
 *   Letra
 *
 * Es la versión TS del chord-parser.service.ts del backend.
 */

export interface ParsedSongInput {
  title: string;
  artist: string;
  originalKey: string;
  capo?: number;
  difficulty?: 'principiante' | 'intermedio' | 'avanzado';
  genre?: string;
  sections: SongSection[];
}

const SECTION_RE = /^\s*\[(.+?)\]\s*$/;
const HEADER_RE = /^(Title|Artist|Key|Capo|Difficulty|Genre)\s*:\s*(.+)$/i;
// Acorde: nota A-G opcional con #/b, sufijos comunes y bajo opcional (/G)
const CHORD_TOKEN_RE = /^[(\[]?[A-G][#b]?[a-zA-Z0-9/#b+]*[)\]]?$/;
// Separadores aceptados entre acordes en lineas de progresion
const SEPARATOR_RE = /^[-–—→>(){}\[\]:|.,;/]+$/;
// Anotaciones tipicas en lineas de acordes
const ANNOTATION_RE =
  /^[(\[]?(?:[0-9]+x|x[0-9]+|N\.?C\.?|intro|verso|verse|chorus|coro|estribillo|puente|bridge|solo|outro|final|fin|riff|slide|hammer|bis|loop|tag|ad-?lib|repeat|repetir|vuelta|segunda|primera|tercera|cuarta|fade|tacet)[)\]]?$/i;

const SECTION_TYPE_MAP: Record<string, SongSection['type']> = {
  intro: 'intro',
  verso: 'verso',
  estrofa: 'verso',
  estribillo: 'estribillo',
  coro: 'estribillo',
  chorus: 'estribillo',
  puente: 'puente',
  bridge: 'puente',
  solo: 'solo',
  outro: 'outro',
  final: 'outro',
};

function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  let chordCount = 0;
  let unknownCount = 0;
  for (const t of tokens) {
    if (CHORD_TOKEN_RE.test(t)) {
      chordCount++;
    } else if (SEPARATOR_RE.test(t) || ANNOTATION_RE.test(t)) {
      // OK, no penaliza
    } else {
      unknownCount++;
    }
  }
  if (chordCount === 0) return false;
  return chordCount >= unknownCount;
}

function extractChords(line: string): ChordPosition[] {
  const result: ChordPosition[] = [];
  const tokens = line.split(/(\s+)/);
  let column = 0;
  for (const token of tokens) {
    if (token.trim() && CHORD_TOKEN_RE.test(token)) {
      result.push({ chord: token, position: column });
    }
    column += token.length;
  }
  return result;
}

/**
 * Divide una linea de acordes en segmentos alternados de tipo 'text' y 'chord'.
 * Sirve para renderizar lineas como "A -> segunda vuelta A/C#" preservando todo.
 */
function parseInlineSegments(line: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const tokens = line.split(/(\s+)/);
  let buffer = '';
  for (const token of tokens) {
    if (token.trim() && CHORD_TOKEN_RE.test(token)) {
      if (buffer) {
        segments.push({ type: 'text', content: buffer });
        buffer = '';
      }
      segments.push({ type: 'chord', content: token });
    } else {
      buffer += token;
    }
  }
  if (buffer) {
    segments.push({ type: 'text', content: buffer });
  }
  return segments;
}

function parseSectionLabel(raw: string): { type: SongSection['type']; label: string } {
  const lower = raw.toLowerCase().trim();
  let type: SongSection['type'] = 'otro';
  for (const [key, value] of Object.entries(SECTION_TYPE_MAP)) {
    if (lower.startsWith(key)) {
      type = value;
      break;
    }
  }
  return { type, label: raw.trim() };
}

export function textToSong(input: string): ParsedSongInput {
  const allLines = input.replace(/\r\n/g, '\n').split('\n');

  // Parse header (key:value lines until first [section] or empty after some headers)
  const header: Partial<Record<string, string>> = {};
  let bodyStart = 0;
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const match = line.match(HEADER_RE);
    if (match) {
      header[match[1].toLowerCase()] = match[2].trim();
      bodyStart = i + 1;
      continue;
    }
    if (line.match(SECTION_RE)) {
      bodyStart = i;
      break;
    }
    if (line.trim() === '' && Object.keys(header).length > 0) {
      bodyStart = i + 1;
      break;
    }
  }

  // Parse body: secciones con sus líneas
  const sections: SongSection[] = [];
  let currentSection: SongSection = { type: 'verso', label: 'Verso', lines: [] };

  const bodyLines = allLines.slice(bodyStart);
  let i = 0;
  while (i < bodyLines.length) {
    const line = bodyLines[i];

    // Marcador de sección
    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      const { type, label } = parseSectionLabel(sectionMatch[1]);
      currentSection = { type, label, lines: [] };
      i++;
      continue;
    }

    // Línea vacía: separador
    if (line.trim() === '') {
      if (currentSection.lines.length > 0) {
        currentSection.lines.push({ text: '', chords: [] });
      }
      i++;
      continue;
    }

    // Pareja "acordes / letra"
    if (
      isChordLine(line) &&
      i + 1 < bodyLines.length &&
      !isChordLine(bodyLines[i + 1]) &&
      bodyLines[i + 1].trim() !== ''
    ) {
      const chords = extractChords(line);
      currentSection.lines.push({ text: bodyLines[i + 1], chords });
      i += 2;
      continue;
    }

    // Solo acordes (intro, solo, anotaciones inline tipo "A -> 2da vuelta A/C#")
    if (isChordLine(line)) {
      currentSection.lines.push({
        text: line,
        chords: extractChords(line),
        inlineSegments: parseInlineSegments(line),
      });
      i++;
      continue;
    }

    // Solo letra
    currentSection.lines.push({ text: line, chords: [] });
    i++;
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

  const difficulty = (header['difficulty'] ?? 'intermedio') as
    | 'principiante'
    | 'intermedio'
    | 'avanzado';

  return {
    title: header['title']!,
    artist: header['artist']!,
    originalKey: header['key'] ?? 'C',
    capo: header['capo'] ? parseInt(header['capo'], 10) : 0,
    difficulty,
    genre: header['genre'] || undefined,
    sections,
  };
}
