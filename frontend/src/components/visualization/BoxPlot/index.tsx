import React, { useMemo, useRef } from 'react';
import { Box } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { calculateStats, computeBoxStats } from '@/utils/metricsUtils';
import { UNIFIED_CHART_COLORS } from '@/config/metricsConfig';
import type { EChartsOption } from 'echarts';
import type { BoxPlotProps, PreparedBoxPlotDatum } from './BoxPlot.types';
import { buildBoxPlotOption } from './boxPlotOption';
import { EMPTY_STATE_BG_COLOR, EMPTY_STATE_BORDER_COLOR, PANEL_SHADOW } from './BoxPlot.constants';

const BoxPlot: React.FC<BoxPlotProps> = ({
  metricLabel,
  direction,
  experimentData,
  width = '100%',
  showTitle = true,
  scroll = false,
}) => {

  const option: EChartsOption = useMemo(() => {
    const validData = experimentData.filter((exp) => exp.values && exp.values.length > 0);

    if (validData.length === 0) {
      return { title: { text: 'No data available' } };
    }

    const prepared: PreparedBoxPlotDatum[] = validData.map((exp, idx) => {
      if (exp.values.length > 1) {
        const q = computeBoxStats(exp.values);
        const stats = calculateStats(exp.values);
        return {
          type: 'box',
          name: exp.toolName,
          color: UNIFIED_CHART_COLORS[idx % UNIFIED_CHART_COLORS.length],
          q,
          stats,
          values: exp.values,
        };
      }

      return {
        type: 'point',
        name: exp.toolName,
        color: UNIFIED_CHART_COLORS[idx % UNIFIED_CHART_COLORS.length],
        value: exp.values[0],
      };
    });

    return buildBoxPlotOption({
      prepared,
      categories: prepared.map((d) => d.name),
      metricLabel,
      direction,
      showTitle,
      scroll,
    });
  }, [direction, experimentData, metricLabel, scroll, showTitle]);

  if (!experimentData || experimentData.length === 0) {
    return (
      <Box
        sx={{
          width,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: EMPTY_STATE_BG_COLOR,
          borderRadius: 1,
          border: `1px solid ${EMPTY_STATE_BORDER_COLOR}`,
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
        border: `1px solid ${EMPTY_STATE_BORDER_COLOR}`,
        boxShadow: PANEL_SHADOW,
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
