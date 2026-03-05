/**
 * Configuration for metrics display and evaluation
 * Defines metric properties, display labels, and optimization direction
 */

export interface MetricDefinition {
  key: string;
  label: string;
  better: 'higher' | 'lower';
  description?: string;
  group: 'Cluster Quality' | 'Spatial Coherence';
}

export const METRIC_CONFIG: MetricDefinition[] = [
  {
    key: 'silhouette',
    label: 'Silhouette',
    better: 'higher',
    description: 'Measures cluster cohesion and separation',
    group: 'Cluster Quality',
  },
  {
    key: 'davies_bouldin',
    label: 'Davies–Bouldin',
    better: 'lower',
    description: 'Average similarity between clusters',
    group: 'Cluster Quality',
  },
  {
    key: 'calinski_harabasz',
    label: 'Calinski–Harabasz',
    better: 'higher',
    description: 'Ratio of between-cluster to within-cluster variance',
    group: 'Cluster Quality',
  },
  {
    key: 'morans_I',
    label: "Moran's I",
    better: 'higher',
    description: 'Spatial autocorrelation measure',
    group: 'Spatial Coherence',
  },
  {
    key: 'gearys_C',
    label: "Geary's C",
    better: 'lower',
    description: 'Spatial autocorrelation measure',
    group: 'Spatial Coherence',
  },
];

/**
 * Get unique metric groups in order
 */
export function getMetricGroups(): string[] {
  const groups: string[] = [];
  METRIC_CONFIG.forEach((metric) => {
    if (!groups.includes(metric.group)) {
      groups.push(metric.group);
    }
  });
  return groups;
}

/**
 * Get metric configuration by key
 */
export function getMetricConfig(key: string): MetricDefinition | undefined {
  return METRIC_CONFIG.find((m) => m.key === key);
}

/**
 * Get direction indicator for a metric
 */
export function getDirectionIndicator(better: 'higher' | 'lower'): string {
  return better === 'higher' ? '↑' : '↓';
}
