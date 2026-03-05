/**
 * Color mapping utilities for consensus visualization
 */

/**
 * Viridis colormap - perceptually uniform
 * Maps 0-1 to color
 */
export const viridisColormap = (value: number): string => {
  // Clamp value between 0 and 1
  const clamped = Math.max(0, Math.min(1, value));

  // Viridis colormap sampled points (RGB)
  const colors = [
    { r: 68, g: 1, b: 84 },        // 0.0 - dark blue/purple
    { r: 62, g: 35, b: 109 },      // 0.2
    { r: 49, g: 104, b: 142 },     // 0.4 - blue
    { r: 38, g: 154, b: 147 },     // 0.6 - teal
    { r: 109, g: 205, b: 89 },     // 0.8 - yellow-green
    { r: 253, g: 231, b: 37 },     // 1.0 - bright yellow
  ];

  const index = clamped * (colors.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const t = index - lower;

  if (lower === upper) {
    const c = colors[lower];
    return `rgb(${c.r}, ${c.g}, ${c.b})`;
  }

  const c1 = colors[lower];
  const c2 = colors[upper];

  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Default domain color palette (categorical)
 * Darker, more saturated colors with better visual differentiation
 */
export const DEFAULT_DOMAIN_COLORS: Record<string, string> = {
  '0': '#E53935', // Strong Red
  '1': '#1E88E5', // Strong Blue
  '2': '#43A047', // Strong Green
  '3': '#FB8C00', // Strong Orange
  '4': '#8E24AA', // Strong Purple
  '5': '#00ACC1', // Strong Cyan
  '6': '#C0CA33', // Strong Lime
  '7': '#F4511E', // Deep Orange
  '8': '#6D4C41', // Brown
  '9': '#00897B', // Teal
  '10': '#D81B60', // Pink
  '11': '#5E35B1', // Deep Purple
  '12': '#3949AB', // Indigo
  '13': '#039BE5', // Light Blue
  '14': '#00897B', // Teal Green
};

/**
 * Get domain color by label
 */
export const getDomainColor = (label: string | number, customColors?: Record<string, string>): string => {
  const colors = customColors || DEFAULT_DOMAIN_COLORS;
  const key = String(label);
  return colors[key] || '#94A3B8'; // Fallback to gray
};

/**
 * Generate a confidence gradient for legend
 */
export const generateConfidenceGradient = (steps: number = 10): Array<{ value: number; color: string }> => {
  const gradient = [];
  for (let i = 0; i < steps; i++) {
    const value = i / (steps - 1);
    gradient.push({
      value,
      color: viridisColormap(value),
    });
  }
  return gradient;
};

/**
 * Clamp opacity to minimum value
 */
export const clampOpacity = (confidence: number, minOpacity: number = 0.25): number => {
  return Math.max(minOpacity, Math.min(1, confidence));
};
