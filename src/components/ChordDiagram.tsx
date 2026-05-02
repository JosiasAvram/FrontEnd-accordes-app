import Svg, { Line, Circle, Rect, Text as SvgText, G } from 'react-native-svg';
import { Chord } from '../types/chord';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  chord: Chord;
  width?: number;
}

/**
 * Diagrama de acorde de guitarra renderizado en SVG. Es vectorial, así
 * se ve perfecto en cualquier tamaño de pantalla y pesa nada.
 *
 * Layout:
 *  - 6 líneas verticales (cuerdas) Mi6 (grave) → Mi1 (aguda)
 *  - 5 líneas horizontales (trastes)
 *  - Círculos rellenos donde van los dedos (con número de dedo opcional)
 *  - "X" arriba de cuerdas silenciadas
 *  - "O" arriba de cuerdas al aire
 *  - Si baseFret > 1, se indica al costado
 *  - Si isBarre, se dibuja una barra horizontal cruzando todas las cuerdas
 */
export function ChordDiagram({ chord, width = 180 }: Props) {
  const theme = useTheme();

  const NUM_STRINGS = 6;
  const NUM_FRETS = 5;

  const padding = 24;
  const headerHeight = 24; // Espacio arriba para X/O
  const labelWidth = 12; // Espacio izquierdo para "5fr"
  const innerWidth = width - padding * 2 - labelWidth;
  const stringSpacing = innerWidth / (NUM_STRINGS - 1);
  const fretSpacing = stringSpacing; // Casi cuadrado
  const innerHeight = fretSpacing * NUM_FRETS;
  const totalHeight = padding * 2 + headerHeight + innerHeight;

  const startX = padding + labelWidth;
  const startY = padding + headerHeight;

  // Cuerdas verticales
  const strings = Array.from({ length: NUM_STRINGS }, (_, i) => {
    const x = startX + i * stringSpacing;
    return <Line key={`s-${i}`} x1={x} y1={startY} x2={x} y2={startY + innerHeight} stroke={theme.colors.textPrimary} strokeWidth={1} />;
  });

  // Trastes horizontales
  const frets = Array.from({ length: NUM_FRETS + 1 }, (_, i) => {
    const y = startY + i * fretSpacing;
    const isNut = chord.baseFret === 1 && i === 0;
    return (
      <Line
        key={`f-${i}`}
        x1={startX}
        y1={y}
        x2={startX + (NUM_STRINGS - 1) * stringSpacing}
        y2={y}
        stroke={theme.colors.textPrimary}
        strokeWidth={isNut ? 4 : 1}
      />
    );
  });

  // Notas: X (silenciada), O (al aire) y círculos para dedos en trastes
  const dots = chord.frets.map((fret, i) => {
    const x = startX + i * stringSpacing;
    if (fret === -1) {
      return <SvgText key={`x-${i}`} x={x} y={startY - 6} fill={theme.colors.textPrimary} fontSize={14} textAnchor="middle">×</SvgText>;
    }
    if (fret === 0) {
      return <Circle key={`o-${i}`} cx={x} cy={startY - 10} r={5} stroke={theme.colors.textPrimary} strokeWidth={1} fill="none" />;
    }
    // fret > 0
    const y = startY + (fret - 0.5) * fretSpacing;
    const finger = chord.fingers?.[i];
    return (
      <G key={`d-${i}`}>
        <Circle cx={x} cy={y} r={9} fill={theme.colors.primary} />
        {finger && finger > 0 && (
          <SvgText x={x} y={y + 4} fill="#000" fontSize={11} fontWeight="bold" textAnchor="middle">
            {finger}
          </SvgText>
        )}
      </G>
    );
  });

  // Etiqueta de cejilla base si baseFret > 1
  const baseFretLabel =
    chord.baseFret > 1 ? (
      <SvgText
        x={startX - 10}
        y={startY + fretSpacing / 2 + 4}
        fill={theme.colors.textSecondary}
        fontSize={11}
        textAnchor="end"
      >
        {chord.baseFret}fr
      </SvgText>
    ) : null;

  // Cejilla visual (si isBarre)
  const barre = chord.isBarre
    ? (() => {
        const indices = chord.frets
          .map((f, i) => ({ f, i }))
          .filter((x) => x.f === Math.min(...chord.frets.filter((f) => f > 0)));
        if (indices.length < 2) return null;
        const minI = Math.min(...indices.map((x) => x.i));
        const maxI = Math.max(...indices.map((x) => x.i));
        const fret = indices[0].f;
        const y = startY + (fret - 0.5) * fretSpacing;
        return (
          <Rect
            x={startX + minI * stringSpacing - 8}
            y={y - 7}
            width={(maxI - minI) * stringSpacing + 16}
            height={14}
            rx={7}
            fill={theme.colors.primary}
            opacity={0.3}
          />
        );
      })()
    : null;

  return (
    <Svg width={width} height={totalHeight}>
      {barre}
      {strings}
      {frets}
      {dots}
      {baseFretLabel}
    </Svg>
  );
}
