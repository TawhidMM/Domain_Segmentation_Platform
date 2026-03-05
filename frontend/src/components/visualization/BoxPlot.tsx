import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Box } from '@mui/material';
import { Data, Layout, Config } from 'plotly.js';

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
  width?: number;
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
  const plotData: Data[] = useMemo(() => {
    return experimentData
      .filter((exp) => exp.values && exp.values.length > 0)
      .map((exp, index) => ({
        y: exp.values,
        name: exp.toolName,
        type: 'box' as const,
        marker: {
          color: CHART_COLORS[index % CHART_COLORS.length],
          opacity: 0.7,
        },
        boxmean: 'sd',
        pointpos: -0.5,
        jitter: 0.3,
        scalegroup: exp.toolName,
        hovertemplate: `<b>${exp.toolName}</b><br>Value: %{y:.4f}<extra></extra>`,
      }));
  }, [experimentData]);

  const layout: Partial<Layout> = useMemo(
    () => ({
      title: {
        text: `${metricLabel}${direction === 'higher' ? ' ↑' : ' ↓'}`,
        font: {
          size: 13,
          color: '#0f172a',
          family: 'system-ui, -apple-system, sans-serif',
        },
      },
      yaxis: {
        title: { text: metricLabel } as any,
        zeroline: false,
        gridcolor: '#e2e8f0',
        showgrid: true,
        gridwidth: 1,
      } as any,
      xaxis: {
        title: { text: '' } as any,
      } as any,
      showlegend: false,
      plot_bgcolor: 'rgba(248, 250, 252, 0.3)',
      paper_bgcolor: 'white',
      font: {
        family: 'system-ui, -apple-system, sans-serif',
        size: 11,
        color: '#475569',
      },
      margin: {
        l: 65,
        r: 20,
        t: 50,
        b: 50,
      },
      hovermode: 'closest' as const,
    }),
    [metricLabel, direction],
  );

  const config: Partial<Config> = useMemo(
    () => ({
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      toImageButtonOptions: {
        format: 'png',
        filename: `${metricKey}_box_plot`,
        height: 600,
        width: 900,
        scale: 2,
      },
    }),
    [metricKey],
  );

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
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        position: 'relative',
      }}
    >
      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
      />
    </Box>
  );
};

export default BoxPlot;
