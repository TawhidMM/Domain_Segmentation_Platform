export interface BoxPlotProps {
  metricLabel: string;
  direction: 'higher' | 'lower';
  experimentData: Array<{
    experimentId: string;
    experimentName: string;
    values: number[];
  }>;
  width?: string | number;
  showTitle?: boolean;
  scroll?: boolean;
}

export interface BoxStatSummary {
  lowerWhisker: number;
  q1: number;
  median: number;
  q3: number;
  upperWhisker: number;
  min: number;
  max: number;
}

export interface PreparedBoxDatum {
  type: 'box';
  name: string;
  color: string;
  q: BoxStatSummary;
  stats: {
    mean: number;
    stdDev: number;
  };
  values: number[];
}

export interface PreparedPointDatum {
  type: 'point';
  name: string;
  color: string;
  value: number;
}

export type PreparedBoxPlotDatum = PreparedBoxDatum | PreparedPointDatum;
