import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { EChartsOption } from 'echarts';
import { calculateStats } from '@/utils/metricsUtils';
import { UNIFIED_CHART_COLORS } from '@/config/metricsConfig';

interface BoxPlotProps {
  metricKey: string;
  metricLabel: string;
  direction: 'higher' | 'lower';
  experimentData: Array<{
    experimentId: string;
    toolName: string;
    values: number[];
  }>;
  height?: number;
  width?: string | number;
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
  metricKey,
  metricLabel,
  direction,
  experimentData,
  height = 420,
  width = '100%',
}) => {
  const option: EChartsOption = useMemo(() => {
    // Filter valid data and calculate statistics
    const validData = experimentData.filter((exp) => exp.values && exp.values.length > 0);

    if (validData.length === 0) {
      return { title: { text: 'No data available' } };
    }

    // Prepare data for box plot
    const boxPlotData = validData.map((exp) => {
      const q = computeBoxStats(exp.values);
      const stats = calculateStats(exp.values);

      return {
        name: exp.toolName,
        value: [q.lowerWhisker, q.q1, q.median, q.q3, q.upperWhisker],
        stats: {
          mean: stats.mean,
          median: q.median,
          whiskerMin: q.lowerWhisker,
          whiskerMax: q.upperWhisker,
          min: q.min,
          max: q.max,
          q1: q.q1,
          q3: q.q3,
          stdDev: stats.stdDev,
        },
      };
    });

    // All values for axis range
    const allValues = validData.flatMap((exp) => exp.values);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    let range = maxValue - minValue;
    
   
    if (range < 0.1) {
      range = 0.1;
    }
    
    const padding = Math.max(range * 0.15, range * 0.15); // 15% padding + minimum buffer

    return {
      title: {
        text: `${metricLabel} Distribution ${direction === 'higher' ? '↑' : '↓'}`,
        left: 'center',
        textStyle: {
          fontSize: 14,
          fontWeight: 700,
          color: '#0f172a',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
      },
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
        formatter: (params: any) => {
          if (params.componentSubType === 'boxplot') {
            const stats = params.data?.stats;
            const [whiskerMin, q1, median, q3, whiskerMax] = params.value;
            const mean = stats?.mean;
            const min = stats?.min;
            const max = stats?.max;

            const meanText = typeof mean === 'number' ? mean.toFixed(4) : 'N/A';
            return `<strong>${params.name}</strong><br/>
              Whisker Min: ${whiskerMin.toFixed(4)}<br/>
              Q1: ${q1.toFixed(4)}<br/>
              Median: ${median.toFixed(4)} ─<br/>
              Mean: ${meanText} ═<br/>
              Q3: ${q3.toFixed(4)}<br/>
              Whisker Max: ${whiskerMax.toFixed(4)}<br/>
              Min/Max: ${typeof min === 'number' ? min.toFixed(4) : 'N/A'} / ${typeof max === 'number' ? max.toFixed(4) : 'N/A'}`;
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
        data: boxPlotData.map((d) => d.name),
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
        name: metricLabel,
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
          data: boxPlotData.map((d, idx) => ({
            value: d.value,
            stats: d.stats,
            itemStyle: {
              color: UNIFIED_CHART_COLORS[idx % UNIFIED_CHART_COLORS.length],
              borderColor: '#0f172a',
              borderWidth: 2,
              opacity: 0.75,
            },
          })),
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
          data: boxPlotData.map((d, idx) => {
            const xIndex = idx;
            return {
              value: [xIndex, d.stats.mean],
              itemStyle: {
                color: '#facc15',
                borderColor: UNIFIED_CHART_COLORS[idx % UNIFIED_CHART_COLORS.length],
                borderWidth: 2,
              },
            };
          }),
          symbol: 'rect',
          symbolSize: [18, 3],
          z: 6,
          tooltip: {
            formatter: (params: any) => {
              return `<strong>${params.name}</strong><br/>Mean: ${params.value[1].toFixed(4)}`;
            },
          },
        },
        // Median indicators
        {
          name: 'Median',
          type: 'scatter',
          data: boxPlotData.map((d, idx) => ({
            value: [idx, d.stats.median],
            itemStyle: {
              color: '#ef4444',
              borderColor: '#ffffff',
              borderWidth: 1.5,
            },
          })),
          symbol: 'rect',
          symbolSize: [12, 3],
          z: 7,
          tooltip: {
            formatter: (params: any) => {
              return `<strong>${params.name}</strong><br/>Median: ${params.value[1].toFixed(4)}`;
            },
          },
        },
      ],
      legend: {
        data: ['Distribution', 'Mean', 'Median'],
        top: 40,
        orient: 'horizontal',
        textStyle: {
          color: '#475569',
          fontSize: 12,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        itemGap: 20,
      },
    } as EChartsOption;
  }, [experimentData, metricLabel, direction]);

  if (!experimentData || experimentData.length === 0) {
    return (
      <Box
        sx={{
          width,
          height,
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
        height,
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
