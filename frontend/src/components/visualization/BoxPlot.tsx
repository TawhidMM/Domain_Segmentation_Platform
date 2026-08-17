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
        return { type: 'box' as const, name: exp.toolName, q, stats };
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
              color: '#facc15',
              borderColor: UNIFIED_CHART_COLORS[idx % UNIFIED_CHART_COLORS.length],
              borderWidth: 2,
            },
          }
        : []
    );

    // Median indicator per category (box categories only)
    const medianData = prepared.flatMap((d, idx) =>
      d.type === 'box'
        ? {
            value: [idx, d.q.median],
            name: d.name,
            itemStyle: {
              color: '#ef4444',
              borderColor: '#ffffff',
              borderWidth: 1.5,
            },
          }
        : []
    );

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

    // All values for axis range
    const allValues = validData.flatMap((exp) => exp.values);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    let range = maxValue - minValue;
    
   
    if (range < 0.1) {
      range = 0.1;
    }
    
    const padding = Math.max(range * 0.15, range * 0.15); // 15% padding + minimum buffer

    const titleOption = showTitle
      ? {
          text: `${metricLabel} Distribution ${direction === 'higher' ? '↑' : '↓'}`,
          left: 'center',
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
              Median: ${fmt(s?.median)} ─<br/>
              Mean: ${fmt(s?.mean)} ═<br/>
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
        top: 80,
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
        nameGap: 15,
        nameTextStyle: {
          color: '#0f172a',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        min: minValue - padding,
        max: maxValue + padding,
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // Mean indicators
        {
          name: 'Mean',
          type: 'scatter',
          data: meanData,
          symbol: 'rect',
          symbolSize: [18, 3],
          z: 6,
          tooltip: {
            formatter: (params: { name: string; value: number[] }) => {
              return `<strong>${params.name}</strong><br/>Mean: ${params.value[1].toFixed(4)}`;
            },
          },
        },
        // Median indicators
        {
          name: 'Median',
          type: 'scatter',
          data: medianData,
          symbol: 'rect',
          symbolSize: [12, 3],
          z: 7,
          tooltip: {
            formatter: (params: { name: string; value: number[] }) => {
              return `<strong>${params.name}</strong><br/>Median: ${params.value[1].toFixed(4)}`;
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
        data: ['Distribution', 'Mean', 'Median', ...(hasSingleRun ? ['Single Run'] : [])],
        top: 40,
        orient: 'horizontal',
        textStyle: {
          color: '#475569',
          fontSize: 12,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        itemGap: 20,
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
