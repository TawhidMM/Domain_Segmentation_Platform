import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { EChartsOption } from 'echarts';
import { calculateStats, calculateQuartiles } from '@/utils/metricsUtils';

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

const CHART_COLORS = ['#2563EB', '#0EA5E9', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

const BoxPlot: React.FC<BoxPlotProps> = ({
  metricKey,
  metricLabel,
  direction,
  experimentData,
  height = 380,
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
      const q = calculateQuartiles(exp.values);
      const stats = calculateStats(exp.values);

      return {
        name: exp.toolName,
        value: [q.min, q.q1, stats.mean, q.median, q.q3, q.max],
        stats: {
          mean: stats.mean,
          median: q.median,
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
    const range = maxValue - minValue;
    const padding = range * 0.1;

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
            const [min, q1, mean, median, q3, max] = params.value;
            return `<strong>${params.name}</strong><br/>
Min: ${min.toFixed(4)}<br/>
Q1: ${q1.toFixed(4)}<br/>
Mean: ${mean.toFixed(4)} ●<br/>
Median: ${median.toFixed(4)} —<br/>
Q3: ${q3.toFixed(4)}<br/>
Max: ${max.toFixed(4)}`;
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
          name: 'Box Plot',
          type: 'boxplot',
          data: boxPlotData.map((d, idx) => ({
            value: d.value,
            itemStyle: {
              color: CHART_COLORS[idx % CHART_COLORS.length],
              borderColor: CHART_COLORS[idx % CHART_COLORS.length],
            },
          })),
          itemStyle: {
            color: '#2563EB',
            borderColor: '#1e40af',
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
        // Mean indicators (scatter plot)
        {
          name: 'Mean',
          type: 'scatter',
          data: boxPlotData.map((d, idx) => {
            // Position on x-axis (category index), y-axis (mean value)
            const xIndex = idx;
            // ECharts scatter uses [x_value, y_value] where x_value can be category index
            return {
              value: [xIndex, d.stats.mean],
              itemStyle: {
                color: '#facc15',
                borderColor: CHART_COLORS[idx % CHART_COLORS.length],
                borderWidth: 2,
              },
            };
          }),
          symbolSize: 8,
          tooltip: {
            formatter: (params: any) => {
              return `${params.name}: ${params.value[1].toFixed(4)}`;
            },
          },
        },
      ],
      legend: {
        data: ['Box Plot', 'Mean'],
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
