import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Box, Typography, CircularProgress } from '@mui/material';
import { ExperimentResult } from '@/types';
import { Data, Layout, Config } from 'plotly.js';

interface SpatialPlotProps {
  result: ExperimentResult | null;
  title?: string;
  height?: number;
  showLegend?: boolean;
  compact?: boolean;
}

const SpatialPlot: React.FC<SpatialPlotProps> = ({
  result,
  title,
  height = 500,
  showLegend = true,
  compact = false,
}) => {
  const plotData: Data[] = useMemo(() => {
    if (!result) return [];

    const uniqueDomains = [...new Set(result.domains)].sort((a, b) => a - b);

    return uniqueDomains.map((domain) => {
      const indices = result.domains
        .map((d, i) => (d === domain ? i : -1))
        .filter((i) => i !== -1);

      return {
        x: indices.map((i) => result.coordinates[i].x),
        y: indices.map((i) => result.coordinates[i].y),
        mode: 'markers' as const,
        type: 'scatter' as const,
        name: `Domain ${domain + 1}`,
        marker: {
          color: result.domainColors[domain],
          size: compact ? 4 : 6,
          opacity: 0.8,
        },
        hovertemplate: `Domain ${domain + 1}<br>X: %{x:.1f}<br>Y: %{y:.1f}<extra></extra>`,
      };
    });
  }, [result, compact]);

  const layout: Partial<Layout> = useMemo(
    () => ({
      autosize: true,
      height,
      margin: compact
        ? { l: 40, r: 20, t: title ? 40 : 20, b: 40 }
        : { l: 60, r: 40, t: title ? 60 : 40, b: 60 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: '#FAFAFA',
      title: title
        ? {
            text: title,
            font: { size: compact ? 14 : 18, family: 'Inter', color: '#0F172A' },
          }
        : undefined,
      xaxis: {
        title: { text: 'X Coordinate' },
        showgrid: true,
        gridcolor: '#E2E8F0',
        zeroline: false,
        tickfont: { size: compact ? 10 : 12 },
      },
      yaxis: {
        title: { text: 'Y Coordinate' },
        showgrid: true,
        gridcolor: '#E2E8F0',
        zeroline: false,
        scaleanchor: 'x',
        scaleratio: 1,
        tickfont: { size: compact ? 10 : 12 },
      },
      showlegend: showLegend && !compact,
      legend: {
        orientation: 'v',
        x: 1.02,
        y: 1,
        font: { size: 11 },
      },
      hovermode: 'closest',
    }),
    [height, title, showLegend, compact]
  );

  const config: Partial<Config> = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    displaylogo: false,
  };

  if (!result) {
    return (
      <Box
        sx={{
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAFAFA',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Waiting for results...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'white',
      }}
    >
      <Plot data={plotData} layout={layout} config={config} style={{ width: '100%', height }} useResizeHandler />
    </Box>
  );
};

export default SpatialPlot;
