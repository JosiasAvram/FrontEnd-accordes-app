export interface ChordVoicing {
  label?: string;
  // 6 cuerdas (Mi6 → Mi1). -1 = silenciada, 0 = al aire, 1+ = traste
  frets: number[];
  fingers: number[];
  baseFret: number;
  isBarre: boolean;
  difficulty: 'principiante' | 'intermedio' | 'avanzado';
}

export interface Chord {
  _id: string;
  name: string;
  instrument: 'guitar' | 'ukulele' | 'piano';
  voicings: ChordVoicing[];
  category: 'mayor' | 'menor' | 'septima' | 'sus' | 'dim' | 'aug' | 'otro';
}
