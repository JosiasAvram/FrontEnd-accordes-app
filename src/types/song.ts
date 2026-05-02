export interface ChordPosition {
  chord: string;
  position: number;
}

export interface SongLine {
  text: string;
  chords: ChordPosition[];
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
