import Svg, { Line, Circle, Rect, Text as SvgText, G } from 'react-native-svg';
import { ChordVoicing } from '../types/chord';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  voicing: ChordVoicing;
  width?: number;
}

/**
 * Diagrama de UNA posicion (voicing) de un acorde, en SVG.
 *
 * Layout:
 *  - 6 lineas verticales (cuerdas) Mi6 (grave) → Mi1 (aguda)
 *  - 5 lineas horizontales (trastes)
 *  - Circulos rellenos donde van los dedos (con numero de dedo opcional)
 *  - "X" arriba de cuerdas silenciadas
 *  - "O" arriba de cuerdas al aire
 *  - Si baseFret > 1, se indica al costado
 *  - Si isBarre, se dibuja una barra horizontal cruzando todas las cuerdas
 */
export function ChordDiagram({ voicing, width = 180 }: Props) {
  const theme = useTheme();

  const NUM_STRINGS = 6;
  const NUM_FRETS = 5;

  const padding = 24;
  const headerHeight = 24;
  const labelWidth = 16;
  const innerWidth = width - padding * 2 - labelWidth;
  const stringSpacing = innerWidth / (NUM_STRINGS - 1);
  const fretSpacing = stringSpacing;
  const innerHeight = fretSpacing * NUM_FRETS;
  const totalHeight = padding * 2 + headerHeight + innerHeight;

  const startX = padding + labelWidth;
  const startY = padding + headerHeight;

  // Trastes mostrados son relativos a baseFret. Si baseFret=3, los 5 trastes
  // visibles son del 3 al 7. Convertimos los frets absolutos a relativos.
  const baseFret = voicing.baseFret ?? 1;
  const relativeFrets = voicing.frets.map((f) => (f > 0 ? f - baseFret + 1 : f));

  // Cuerdas verticales
  const strings = Array.from({ length: NUM_STRINGS }, (_, i) => {
    const x = startX + i * stringSpacing;
    return (
      <Line
        key={`s-${i}`}
        x1={x}
        y1={startY}
        x2={x}
        y2={startY + innerHeight}
        stroke={theme.colors.textPrimary}
        strokeWidth={1}
      />
    );
  });

  // Trastes horizontales (si baseFret === 1, la primera línea es la cejuela y va más gruesa)
  const frets = Array.from({ length: NUM_FRETS + 1 }, (_, i) => {
    const y = startY + i * fretSpacing;
    const isNut = baseFret === 1 && i === 0;
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

  // Notas: X (silenciada), O (al aire) o circulo para dedos
  const dots = voicing.frets.map((fret, i) => {
    const x = startX + i * stringSpacing;
    if (fret === -1) {
      return (
        <SvgText
          key={`x-${i}`}
          x={x}
          y={startY - 6}
          fill={theme.colors.textPrimary}
          fontSize={14}
          textAnchor="middle"
        >
          ×
        </SvgText>
      );
    }
    if (fret === 0) {
      return (
        <Circle
          key={`o-${i}`}
          cx={x}
          cy={startY - 10}
          r={5}
          stroke={theme.colors.textPrimary}
          strokeWidth={1}
          fill="none"
        />
      );
    }
    // fret > 0 — dibujamos en posicion relativa
    const relFret = relativeFrets[i];
    const y = startY + (relFret - 0.5) * fretSpacing;
    const finger = voicing.fingers?.[i];
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

  // Etiqueta de cejilla base (ej: "3fr") si baseFret > 1
  const baseFretLabel =
    baseFret > 1 ? (
      <SvgText
        x={startX - 10}
        y={startY + fretSpacing / 2 + 4}
        fill={theme.colors.textSecondary}
        fontSize={11}
        textAnchor="end"
      >
        {baseFret}fr
      </SvgText>
    ) : null;

  // Cejilla visual (si isBarre): rectangulo redondeado cruzando las cuerdas
  // donde estan los dedos del traste mas bajo.
  const barre = voicing.isBarre
    ? (() => {
        const positiveFrets = voicing.frets.filter((f) => f > 0);
        if (positiveFrets.length === 0) return null;
        const minFret = Math.min(...positiveFrets);
        const indices = voicing.frets
          .map((f, i) => ({ f, i }))
          .filter((x) => x.f === minFret);
        if (indices.length < 2) return null;
        const minI = Math.min(...indices.map((x) => x.i));
        const maxI = Math.max(...indices.map((x) => x.i));
        const relFret = minFret - baseFret + 1;
        const y = startY + (relFret - 0.5) * fretSpacing;
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
