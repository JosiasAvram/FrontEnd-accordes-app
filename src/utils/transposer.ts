/**
 * Transposición client-side: mismo algoritmo que el backend, así no
 * hace round-trip al server cada vez que el usuario toca +/-.
 *
 * Si querés, también podés llamar al endpoint del backend pidiendo la
 * canción ya transpuesta (útil para compartir links con tonalidad fija).
 */
import { Song } from '../types/song';

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES =  ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_TO_INDEX: Record<string, number> = {
  C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3,
  E: 4, Fb: 4, F: 5, 'E#': 5, 'F#': 6, Gb: 6, G: 7,
  'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11,
};

const FLAT_KEY_INDICES = new Set([5, 10, 3, 8, 1, 6]); // F, Bb, Eb, Ab, Db, Gb

function parseChord(chord: string): { root: string; suffix: string } | null {
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return null;
  return { root: match[1], suffix: match[2] };
}

function transposeNoteWithSuffix(input: string, semitones: number, useFlats: boolean): string {
  const parsed = parseChord(input);
  if (!parsed) return input;
  const idx = NOTE_TO_INDEX[parsed.root];
  if (idx === undefined) return input;
  const newIdx = (((idx + semitones) % 12) + 12) % 12;
  const newRoot = useFlats ? FLAT_NOTES[newIdx] : SHARP_NOTES[newIdx];
  return newRoot + parsed.suffix;
}

export function transposeChord(chord: string, semitones: number, useFlats = false): string {
  if (!chord || semitones === 0) return chord;
  const [main, bass] = chord.split('/');
  const newMain = transposeNoteWithSuffix(main, semitones, useFlats);
  if (bass) {
    const newBass = transposeNoteWithSuffix(bass, semitones, useFlats);
    return `${newMain}/${newBass}`;
  }
  return newMain;
}

function shouldUseFlats(originalKey: string | undefined, semitones: number): boolean {
  if (!originalKey) return false;
  const parsed = parseChord(originalKey);
  if (!parsed) return false;
  const newIdx = (((NOTE_TO_INDEX[parsed.root] + semitones) % 12) + 12) % 12;
  return FLAT_KEY_INDICES.has(newIdx);
}

/**
 * Transpone toda una canción manteniendo la estructura inmutable.
 */
export function transposeSong(song: Song, semitones: number): Song {
  if (semitones === 0) return song;
  const useFlats = shouldUseFlats(song.originalKey, semitones);

  return {
    ...song,
    originalKey: transposeChord(song.originalKey, semitones, useFlats),
    sections: song.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({
        ...line,
        chords: line.chords.map((c) => ({
          ...c,
          chord: transposeChord(c.chord, semitones, useFlats),
        })),
        inlineSegments: line.inlineSegments
          ? line.inlineSegments.map((seg) =>
              seg.type === 'chord'
                ? { ...seg, content: transposeChord(seg.content, semitones, useFlats) }
                : seg,
            )
          : line.inlineSegments,
      })),
    })),
  };
}

/**
 * Devuelve la nota actual de la canción según semitonos transpuestos.
 * Útil para mostrar "Tonalidad: D" en pantalla.
 */
export function currentKey(originalKey: string, semitones: number): string {
  return transposeChord(originalKey, semitones, shouldUseFlats(originalKey, semitones));
}
