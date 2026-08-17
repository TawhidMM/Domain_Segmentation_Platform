import type { SeriesOption } from 'echarts';
import {
  BOX_BORDER_COLOR,
  BOX_BORDER_WIDTH,
  BOX_FILL_COLOR,
  BOX_FILL_OPACITY,
  BOX_WIDTH_RATIO,
  DATA_POINT_JITTER,
  EMPHASIS_SHADOW_COLOR,
  MEAN_COLOR,
  MEAN_FILL_COLOR,
  MEAN_LINE_DASH,
  POINT_BORDER,
  POINT_BORDER_WIDTH,
  POINT_COLOR,
} from './BoxPlot.constants';
import type { PreparedBoxPlotDatum } from './BoxPlot.types';

export function buildBoxSeries(prepared: PreparedBoxPlotDatum[], colors: string[]): SeriesOption {
  const boxPlotData = prepared.flatMap((d, idx) => {
    if (d.type !== 'box') return [];

    const itemColor = d.color ?? colors[idx % colors.length];
    return [
      {
        name: d.name,
        value: [d.name, d.q.lowerWhisker, d.q.q1, d.q.median, d.q.q3, d.q.upperWhisker],
        stats: {
          mean: d.stats.mean,
          median: d.q.median,
          whiskerMin: d.q.lowerWhisker,
          whiskerMax: d.q.upperWhisker,
          min: d.q.min,
          max: d.q.max,
          q1: d.q.q1,
          q3: d.q.q3,
          stdDev: d.stats.stdDev,
        },
        itemStyle: {
          color: itemColor,
          borderColor: BOX_BORDER_COLOR,
          borderWidth: BOX_BORDER_WIDTH,
          opacity: BOX_FILL_OPACITY,
        },
      },
    ];
  });

  return {
    name: 'Distribution',
    type: 'boxplot',
    encode: { x: 0 },
    data: boxPlotData as any,
    itemStyle: {
      color: BOX_FILL_COLOR,
      borderColor: BOX_BORDER_COLOR,
      borderWidth: BOX_BORDER_WIDTH,
    },
    boxWidth: ['40%', '50%'],
    emphasis: {
      itemStyle: {
        opacity: 1,
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        shadowColor: EMPHASIS_SHADOW_COLOR,
      },
    },
  } as SeriesOption;
}

export function buildMedianSeries(): SeriesOption {
  return {
    name: 'Median',
    type: 'line',
    data: [],
    showSymbol: false,
    symbol: 'none',
    lineStyle: { type: 'solid', color: BOX_BORDER_COLOR, width: 2 },
    silent: true,
    legendHoverLink: false,
    tooltip: { show: false },
  } as SeriesOption;
}

export function buildDataPointsSeries(prepared: PreparedBoxPlotDatum[]): SeriesOption {
  const dataPointData = prepared.flatMap((d, idx) => {
    if (d.type !== 'box') return [];
    return d.values.map((v) => ({
      value: [idx + (Math.random() * 2 - 1) * DATA_POINT_JITTER, v],
      name: d.name,
    }));
  });

  return {
    name: 'Data Points',
    type: 'scatter',
    data: dataPointData,
    symbolSize: 4,
    itemStyle: {
      color: POINT_COLOR,
      borderColor: POINT_BORDER,
      borderWidth: POINT_BORDER_WIDTH,
    },
    large: true,
    z: 5,
    tooltip: {
      formatter: (params: { name: string; value: number[] }) => {
        return `<strong>${params.name}</strong><br/>Run value: ${params.value[1].toFixed(4)}`;
      },
    },
  } as SeriesOption;
}

export function buildMeanSeries(prepared: PreparedBoxPlotDatum[]): SeriesOption {
  const meanData = prepared.flatMap((d, idx) =>
    d.type === 'box'
      ? {
          value: [idx, d.stats.mean],
          name: d.name,
          itemStyle: {
            color: MEAN_FILL_COLOR,
            borderColor: d.color,
            borderWidth: BOX_BORDER_WIDTH,
          },
        }
      : []
  );

  return {
    name: 'Mean',
    type: 'custom',
    renderItem: (params: any, api: any) => {
      const idx = api.value(0);
      const mean = api.value(1);
      const [x0, y0] = api.coord([idx, mean]);
      let half = 8;
      const right = api.coord([idx + 1, mean]);
      const left = api.coord([idx - 1, mean]);
      if (right && isFinite(right[0])) {
        half = Math.abs(right[0] - x0) * (BOX_WIDTH_RATIO / 2);
      } else if (left && isFinite(left[0])) {
        half = Math.abs(x0 - left[0]) * (BOX_WIDTH_RATIO / 2);
      }
      const y = Math.round(y0);
      return {
        type: 'group',
        children: [
          {
            type: 'line',
            shape: { x1: x0 - half, y1: y, x2: x0 + half, y2: y },
            style: {
              stroke: MEAN_COLOR,
              lineWidth: 2,
              lineDash: MEAN_LINE_DASH,
              strokeNoScale: true,
            },
          },
        ],
      };
    },
    data: meanData as any,
    z: 6,
    tooltip: {
      formatter: (params: { name: string; value: number[] }) => {
        return `<strong>${params.name}</strong><br/>Mean: ${params.value[1].toFixed(4)}`;
      },
    },
  } as SeriesOption;
}

export function buildSingleRunSeries(prepared: PreparedBoxPlotDatum[], colors: string[]): SeriesOption {
  const singleRunData = prepared.flatMap((d, idx) =>
    d.type === 'point'
      ? {
          value: [idx, d.value],
          name: d.name,
          itemStyle: {
            color: d.color ?? colors[idx % colors.length],
            borderColor: BOX_BORDER_COLOR,
            borderWidth: BOX_BORDER_WIDTH,
          },
        }
      : []
  );

  return {
    name: 'Single Run',
    type: 'scatter',
    data: singleRunData,
    symbol: 'diamond',
    symbolSize: 14,
    z: 8,
    tooltip: {
      formatter: (params: { name: string; value: number[] }) => {
        return `<strong>${params.name}</strong><br/>Value: ${params.value[1].toFixed(4)}`;
      },
    },
  } as SeriesOption;
}
