export interface MetricStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  values: number[];
}

export interface ChartDataItem {
  jobId: string;
  toolName: string;
  value: number | null;
}

export function calculateStats(values: number[]): MetricStats {
  if (values.length === 0) {
    return { mean: 0, stdDev: 0, min: 0, max: 0, values: [] };
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

  const stdDev = Math.sqrt(variance);

  return {
    mean,
    stdDev,
    min: Math.min(...values),
    max: Math.max(...values),
    values,
  };
}

export function formatMetricWithStd(mean: number, stdDev: number, decimals: number = 2): string {
  return `${mean.toFixed(decimals)} ± ${stdDev.toFixed(decimals)}`;
}

export function calculateQuartiles(values: number[]): { min: number; q1: number; median: number; q3: number; max: number } {
  if (values.length === 0) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const min = sorted[0];
  const max = sorted[n - 1];

  const q1Index = Math.floor(n * 0.25);
  const medianIndex = Math.floor(n * 0.5);
  const q3Index = Math.floor(n * 0.75);

  return {
    min,
    q1: sorted[q1Index],
    median: sorted[medianIndex],
    q3: sorted[q3Index],
    max,
  };
}


export function findBestJobIds(
  data: ChartDataItem[],
  direction: 'higher' | 'lower'
): string[] {
  const validData = data.filter((item) => item.value !== null);
  
  if (validData.length === 0) {
    return [];
  }

  const values = validData.map((item) => item.value as number);
  const bestValue = direction === 'higher' ? Math.max(...values) : Math.min(...values);

  return validData.filter((item) => item.value === bestValue).map((item) => item.jobId);
}

