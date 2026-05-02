/**
 * Paleta de colores. Inspirada en sitios de letras+acordes:
 * fondo oscuro para leer cómodamente en escenario / poca luz, y
 * acordes destacados en color cálido para que sean fáciles de seguir.
 */
export const colors = {
  // Fondo
  background: '#0F172A',         // slate-900
  surface: '#1E293B',            // slate-800
  surfaceAlt: '#334155',         // slate-700

  // Texto
  textPrimary: '#F1F5F9',        // slate-100
  textSecondary: '#94A3B8',      // slate-400
  textMuted: '#64748B',          // slate-500

  // Acentos
  primary: '#F59E0B',            // amber-500 (acordes)
  primaryDark: '#D97706',
  accent: '#22D3EE',             // cyan-400 (links)
  success: '#10B981',
  danger: '#EF4444',

  // Bordes
  border: '#334155',
  borderLight: '#475569',
} as const;

export type ColorKey = keyof typeof colors;
