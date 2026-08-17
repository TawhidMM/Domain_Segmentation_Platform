import React, {useMemo} from 'react';
import {Box} from '@mui/material';
import ReactECharts from 'echarts-for-react';
import {EChartsOption} from 'echarts';
import {calculateStats} from '@/utils/metricsUtils';
import {UNIFIED_CHART_COLORS} from '@/config/metricsConfig';

interface BoxPlotProps {
  metricLabel: string;
  direction: 'higher' | 'lower';
  experimentData: Array<{
    experimentId: string;
    toolName: string;
    values: number[];
  }>;
  width?: string | number;
  showTitle?: boolean;
  scroll?: boolean;
}



function quantile(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) return 0;
  const position = (sortedValues.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  if (lower === upper) {
    return sortedValues[lower];
  }

  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function computeBoxStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);

  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);

  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  const inFence = sorted.filter((value) => value >= lowerFence && value <= upperFence);

  const lowerWhisker = inFence.length > 0 ? inFence[0] : sorted[0];
  const upperWhisker = inFence.length > 0 ? inFence[inFence.length - 1] : sorted[sorted.length - 1];

  return {
    lowerWhisker,
    q1,
    median,
    q3,
    upperWhisker,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

// Fraction (of a category's band width) that the box occupies — the midpoint of
// the boxplot series' boxWidth: ['40%', '50%']. Shared so the mean line width can't drift.
const BOX_WIDTH_RATIO = 0.45;

const BoxPlot: React.FC<BoxPlotProps> = ({
  metricLabel,
  direction,
  experimentData,
  width = '100%',
  showTitle = true,
  scroll = false,
}) => {
  const option: EChartsOption = useMemo(() => {
    // Filter valid data and calculate statistics
    const validData = experimentData.filter((exp) => exp.values && exp.values.length > 0);

    if (validData.length === 0) {
      return { title: { text: 'No data available' } };
    }

    // Prepare data: multi-run experiments -> box; single-run -> diamond point
    const categories = validData.map((exp) => exp.toolName);

    const prepared = validData.map((exp) => {
      if (exp.values.length > 1) {
        const q = computeBoxStats(exp.values);
        const stats = calculateStats(exp.values);
        return { type: 'box' as const, name: exp.toolName, q, stats, values: exp.values };
      }
      return { type: 'point' as const, name: exp.toolName, value: exp.values[0] };
    });

    // Box-plot data positioned by experiment name via encode:{x:0}.
    // Each box carries its category name as the first value so it lands on the
    // correct slot even when single-run experiments (diamonds) are interleaved.
    const boxPlotData = prepared.flatMap((d, idx) => {
      if (d.type === 'point') return [];
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
            color: UNIFIED_CHART_COLORS[idx % UNIFIED_CHART_COLORS.length],
            borderColor: '#0f172a',
            borderWidth: 2,
            opacity: 0.75,
          },
        },
      ];
    });

    // Mean indicator per category (box categories only)
    const meanData = prepared.flatMap((d, idx) =>
      d.type === 'box'
        ? {
            value: [idx, d.stats.mean],
            name: d.name,
            itemStyle: {
              color: '#ffffff',
              borderColor: UNIFIED_CHART_COLORS[idx % UNIFIED_CHART_COLORS.length],
              borderWidth: 2,
            },
          }
        : []
    );

    // Raw data points overlay (multi-run boxes only): one point per run value,
    // horizontally jittered within the category slot so overlapping values stay visible.
    const DATA_POINT_JITTER = 0.15;
    const POINT_COLOR = 'rgba(148, 163, 184, 0.45)';
    const POINT_BORDER = 'rgba(148, 163, 184, 0.75)';
    const dataPointData = prepared.flatMap((d, idx) => {
      if (d.type !== 'box') return [];
      return d.values.map((v) => ({
        value: [idx + (Math.random() * 2 - 1) * DATA_POINT_JITTER, v],
        name: d.name,
      }));
    });

    // Single-run diamond points (aligned to their category slot)
    const singleRunData = prepared.flatMap((d, idx) =>
      d.type === 'point'
        ? {
            value: [idx, d.value],
            name: d.name,
            itemStyle: {
              color: UNIFIED_CHART_COLORS[idx % UNIFIED_CHART_COLORS.length],
              borderColor: '#0f172a',
              borderWidth: 2,
            },
          }
        : []
    );

    const hasSingleRun = singleRunData.length > 0;

    const legendData: { name: string; icon?: string; itemStyle?: { color: string } }[] = [
      { name: 'Distribution', icon: 'rectangle', itemStyle: { color: '#93c5fd' } },
      { name: 'Data Points', icon: 'circle', itemStyle: { color: 'rgba(148, 163, 184, 0.75)' } },
      { name: 'Median', icon: 'path://M-10,-1 L10,-1 L10,1 L-10,1 Z', itemStyle: { color: '#000000' } },
      { name: 'Mean', icon: 'path://M-10,-1 L-3,-1 L-3,1 L-10,1 Z M3,-1 L10,-1 L10,1 L3,1 Z', itemStyle: { color: '#000000' } },
      ...(hasSingleRun
        ? [{ name: 'Single Run', icon: 'diamond', itemStyle: { color: '#0f172a' } }]
        : []),
    ];

    const titleOption = showTitle
      ? {
          text: `${metricLabel} Distribution ${direction === 'higher' ? '↑' : '↓'}`,
          left: 'center',
          top: 10,
          textStyle: {
            fontSize: 14,
            fontWeight: 700,
            color: '#0f172a',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
        }
      : {};

    return {
      ...(showTitle ? { title: titleOption } : {}),
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#d1d5db',
        borderWidth: 1,
        textStyle: {
          color: '#1f2937',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 12,
        },
        formatter: (params: {
          name: string;
          componentSubType?: string;
          value: number[];
          data?: {
            stats?: {
              mean?: number;
              median?: number;
              whiskerMin?: number;
              whiskerMax?: number;
              min?: number;
              max?: number;
              q1?: number;
              q3?: number;
            };
          };
        }) => {
          if (params.componentSubType === 'boxplot') {
            const s = params.data?.stats;
            const fmt = (v: number | undefined) => (typeof v === 'number' ? v.toFixed(4) : 'N/A');
            return `<strong>${params.name}</strong><br/>
              Whisker Min: ${fmt(s?.whiskerMin)}<br/>
              Q1: ${fmt(s?.q1)}<br/>
              Median: ${fmt(s?.median)} ─ <br/>
              Mean: ${fmt(s?.mean)} - - <br/>
              Q3: ${fmt(s?.q3)}<br/>
              Whisker Max: ${fmt(s?.whiskerMax)}<br/>
              Min/Max: ${fmt(s?.min)} / ${fmt(s?.max)}`;
          }
          return params.name;
        },
      },
      grid: {
        left: 70,
        right: 30,
        top: 90,
        bottom: 60,
        containLabel: false,
        backgroundColor: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(248, 250, 252, 0.3)' },
            { offset: 1, color: 'rgba(248, 250, 252, 0.1)' },
          ],
        },
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          fontSize: 12,
          color: '#475569',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 500,
        },
        axisLine: {
          lineStyle: {
            color: '#cbd5e1',
            width: 2,
          },
        },
        splitLine: {
          show: false,
        },
        axisTick: {
          lineStyle: {
            color: '#cbd5e1',
          },
        },
      },
      yAxis: {
        type: 'value',
        scale: true,
        boundaryGap: ['10%', '10%'],
        nameGap: 15,
        nameTextStyle: {
          color: '#0f172a',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        axisLabel: {
          fontSize: 11,
          color: '#64748b',
          fontFamily: 'monospace',
          formatter: (value: number) => value.toFixed(3),
        },
        axisLine: {
          lineStyle: {
            color: '#cbd5e1',
            width: 2,
          },
        },
        splitLine: {
          lineStyle: {
            color: '#e2e8f0',
            type: 'dashed',
            dashOffset: 5,
          },
        },
        axisTick: {
          lineStyle: {
            color: '#cbd5e1',
          },
        },
      },
      series: [
        {
          name: 'Distribution',
          type: 'boxplot',
          encode: { x: 0 },
          data: boxPlotData as any,
          itemStyle: {
            color: '#93c5fd',
            borderColor: '#0f172a',
            borderWidth: 2,
          },
          boxWidth: ['40%', '50%'],
          emphasis: {
            itemStyle: {
              opacity: 1,
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowOffsetY: 2,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
        },
        {
          name: 'Median',
          type: 'line',
          data: [],
          showSymbol: false,
          symbol: 'none',
          lineStyle: { type: 'solid', color: '#0f172a', width: 2 },
          silent: true,
          legendHoverLink: false,
          tooltip: { show: false },
        },
        // // Raw per-run data points (multi-run boxes only)
        {
          name: 'Data Points',
          type: 'scatter',
          data: dataPointData,
          symbolSize: 4,
          itemStyle: {
            color: POINT_COLOR,
            borderColor: POINT_BORDER,
            borderWidth: 0.5,
          },
          large: true,
          z: 5,
          tooltip: {
            formatter: (params: { name: string; value: number[] }) => {
              return `<strong>${params.name}</strong><br/>Run value: ${params.value[1].toFixed(4)}`;
            },
          },
        },
        // Mean indicator drawn as a dashed line matching the box width.
        // The box's own solid line is the median, so a separate median series is not needed.
        {
          name: 'Mean',
          type: 'custom',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          renderItem: (params: any, api: any) => {
            const idx = api.value(0);
            const mean = api.value(1);
            const [x0, y0] = api.coord([idx, mean]);
            // half the box's rendered width = (BOX_WIDTH_RATIO/2) * category band, matching boxWidth
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
                    stroke: '#000000',
                    lineWidth: 2,
                    lineDash: [6, 4],
                    strokeNoScale: true,
                  },
                },
              ],
            };
          },
          data: meanData,
          z: 6,
          tooltip: {
            formatter: (params: { name: string; value: number[] }) => {
              return `<strong>${params.name}</strong><br/>Mean: ${params.value[1].toFixed(4)}`;
            },
          },
        },
        // Single-run diamond points (experiments with exactly one run)
        {
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
        },
      ],
      legend: {
        data: legendData,
        top: 13,
        right: 12,
        orient: 'horizontal',
        textStyle: {
          color: '#475569',
          fontSize: 12,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        itemGap: 14,
        itemWidth: 22,
        itemHeight: 11,
        padding: [2, 6],
      },
      ...(scroll
        ? {
            dataZoom: [
              {
                type: 'slider' as const,
                xAxisIndex: 0,
                start: 0,
                end: 100,
                height: 12,
                bottom: 0,
                borderColor: '#e5e7eb',
                fillerColor: 'rgba(245,158,11,0.1)',
                handleStyle: { color: '#f59e0b' },
              },
              {
                type: 'inside' as const,
                xAxisIndex: 0,
                start: 0,
                end: 100,
              },
            ],
          }
        : {}),
    } as EChartsOption;
  }, [experimentData, metricLabel, direction, showTitle, scroll]);

  if (!experimentData || experimentData.length === 0) {
    return (
      <Box
        sx={{
          width,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f8fafc',
          borderRadius: 1,
          border: '1px solid #e2e8f0',
        }}
      >
        No data available
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width,
        height: '100%',
        bgcolor: 'white',
        borderRadius: 1,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        notMerge
        lazyUpdate
        opts={{ renderer: 'svg' }}
      />
    </Box>
  );
};

export default BoxPlot;
