export const MAX_DOMAINS = 32;
export const MAX_SLICES = 16;

const DEFAULT_DOMAIN_COLOR: [number, number, number] = [0.9, 0.9, 0.9];

function clampDomainId(domainId: number): number {
  if (!Number.isFinite(domainId)) {
    return -1;
  }

  if (domainId < 0) {
    return -1;
  }

  return Math.min(Math.trunc(domainId), MAX_DOMAINS - 1);
}

function hexToRgbNormalized(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '').trim();

  if (normalized.length !== 6) {
    return DEFAULT_DOMAIN_COLOR;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  if (Number.isNaN(red) || Number.isNaN(green) || Number.isNaN(blue)) {
    return DEFAULT_DOMAIN_COLOR;
  }

  return [red / 255, green / 255, blue / 255];
}

export function normalizeSpotDomains<T extends { domainsInOrder: number[] }>(spots: T[]): Array<T & { sliceCount: number }> {
  return spots.map((spot) => {
    const safeDomains = spot.domainsInOrder
      .slice(0, MAX_SLICES)
      .map((domainId) => clampDomainId(domainId));

    return {
      ...spot,
      domainsInOrder: safeDomains,
      sliceCount: safeDomains.length,
    };
  });
}

export function packDomains(domains: number[]): {
  instanceDomains0: [number, number, number, number];
  instanceDomains1: [number, number, number, number];
  instanceDomains2: [number, number, number, number];
  instanceDomains3: [number, number, number, number];
} {
  const padded = domains.slice(0, MAX_SLICES);

  while (padded.length < MAX_SLICES) {
    padded.push(-1);
  }

  return {
    instanceDomains0: [padded[0], padded[1], padded[2], padded[3]],
    instanceDomains1: [padded[4], padded[5], padded[6], padded[7]],
    instanceDomains2: [padded[8], padded[9], padded[10], padded[11]],
    instanceDomains3: [padded[12], padded[13], padded[14], padded[15]],
  };
}

export function buildPalette(domainColorMap: Record<number, string>): Float32Array {
  const palette = new Float32Array(MAX_DOMAINS * 3);

  for (let i = 0; i < palette.length; i += 1) {
    palette[i] = DEFAULT_DOMAIN_COLOR[i % 3];
  }

  for (const [id, hex] of Object.entries(domainColorMap)) {
    const domainId = Number(id);

    if (!Number.isInteger(domainId) || domainId < 0 || domainId >= MAX_DOMAINS) {
      continue;
    }

    const [red, green, blue] = hexToRgbNormalized(hex);
    const baseIndex = domainId * 3;
    palette[baseIndex + 0] = red;
    palette[baseIndex + 1] = green;
    palette[baseIndex + 2] = blue;
  }

  return palette;
}
