export interface Chord {
  _id: string;
  name: string;
  instrument: 'guitar' | 'ukulele' | 'piano';
  // 6 cuerdas (Mi6 → Mi1). -1 = silenciada, 0 = al aire, 1+ = traste
  frets: number[];
  fingers: number[];
  baseFret: number;
  isBarre: boolean;
  difficulty: 'principiante' | 'intermedio' | 'avanzado';
  category: 'mayor' | 'menor' | 'septima' | 'sus' | 'dim' | 'aug' | 'otro';
}
