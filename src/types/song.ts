export interface ChordPosition {
  chord: string;
  position: number;
}

export interface InlineSegment {
  type: 'text' | 'chord';
  content: string;
}

export interface SongLine {
  text: string;
  chords: ChordPosition[];
  /**
   * Si esta presente, la linea es de solo acordes con anotaciones intercaladas
   * (ej: "A -> segunda vuelta A/C#"). Cada segmento alterna texto y acordes.
   * Si esta ausente, la linea es chord+letra estandar.
   */
  inlineSegments?: InlineSegment[];
}

export interface SongSection {
  type: 'intro' | 'verso' | 'estribillo' | 'puente' | 'solo' | 'outro' | 'otro';
  label?: string;
  lines: SongLine[];
}

export interface Song {
  _id: string;
  title: string;
  artist: string;
  artistSlug: string;
  titleSlug: string;
  genre?: string;
  originalKey: string;
  capo: number;
  difficulty: 'principiante' | 'intermedio' | 'avanzado';
  sections: SongSection[];
  views: number;
  status: 'draft' | 'published';
  inList?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Versión liviana para listados (sin secciones)
export type SongSummary = Omit<Song, 'sections'>;

export interface SearchResponse {
  data: SongSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
