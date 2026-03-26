import { DEFAULT_DOMAIN_COLORS } from '@/lib/colorMaps';

const FALLBACK_SPOT_COLOR: [number, number, number] = [148, 163, 184];

function hexToRgbTuple(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '').trim();
  const hasValidLength = normalized.length === 6;

  if (!hasValidLength) {
    return FALLBACK_SPOT_COLOR;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return FALLBACK_SPOT_COLOR;
  }

  return [r, g, b];
}

export function getLabelColorFromPalette(labelId: number): [number, number, number] {
  const paletteEntries = Object.values(DEFAULT_DOMAIN_COLORS);
  if (paletteEntries.length === 0) {
    return FALLBACK_SPOT_COLOR;
  }

  // Label IDs start from 1. Wrap around the palette for arbitrarily many labels.
  const paletteIndex = Math.max(0, (labelId - 1) % paletteEntries.length);
  const colorHex = paletteEntries[paletteIndex] ?? '#94A3B8';
  return hexToRgbTuple(colorHex);
}

export function buildDefaultLabelColors(): Record<number, [number, number, number]> {
  return {
    0: [200, 200, 200],
    1: getLabelColorFromPalette(1),
    2: getLabelColorFromPalette(2),
    3: getLabelColorFromPalette(3),
    4: getLabelColorFromPalette(4),
  };
}

export function getFallbackSpotColor(): [number, number, number] {
  return FALLBACK_SPOT_COLOR;
}
