import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Data, Layout, Config } from 'plotly.js';
import { getDomainColor } from '@/lib/colorMaps';

interface Spot {
  x: number;
  y: number;
  consensus_domain: string | number;
  confidence: number;
}

interface SpatialConsensusPlotProps {
  spots: Spot[] | null;
  mode: 'consensus' | 'confidence' | 'combined';
  isLoading?: boolean;
  domainColors?: Record<string, string>;
}

const SpatialConsensusPlot: React.FC<SpatialConsensusPlotProps> = ({
  spots,
  mode,
  isLoading = false,
  domainColors,
}) => {
  const plotData: Data[] = useMemo(() => {
    if (!spots || spots.length === 0) {
      return [];
    }

    const x = spots.map((s) => s.x);
    const y = spots.map((s) => s.y);

    switch (mode) {
      case 'consensus': {
        // Group spots by domain for categorical colors
        const domainGroups = new Map<string | number, Spot[]>();
        spots.forEach((spot) => {
          if (!domainGroups.has(spot.consensus_domain)) {
            domainGroups.set(spot.consensus_domain, []);
          }
          domainGroups.get(spot.consensus_domain)!.push(spot);
        });

        // Create a trace for each domain
        return Array.from(domainGroups.entries()).map(([domain, domainSpots]) => ({
          x: domainSpots.map((s) => s.x),
          y: domainSpots.map((s) => s.y),
          mode: 'markers' as const,
          type: 'scattergl' as const,
          name: `Domain ${domain}`,
          marker: {
            size: 6,
            color: getDomainColor(domain, domainColors),
            opacity: 0.9,
          },
          hovertemplate: `Domain ${domain}<br>X: %{x:.2f}<br>Y: %{y:.2f}<extra></extra>`,
        }));
      }

      case 'confidence': {
        // All spots in one trace, colored by confidence
        return [
          {
            x,
            y,
            mode: 'markers' as const,
            type: 'scattergl' as const,
            name: 'Confidence Score',
            marker: {
              size: 6,
              color: spots.map((s) => s.confidence),
              colorscale: 'Viridis',
              cmin: 0,
              cmax: 1,
              colorbar: {
                title: 'Confidence',
                thickness: 15,
                len: 0.7,
              },
              opacity: 0.9,
            },
            hovertemplate: 'X: %{x:.2f}<br>Y: %{y:.2f}<br>Confidence: %{marker.color:.3f}<extra></extra>',
          },
        ];
      }

      case 'combined': {
        // Group spots by domain, color by domain, opacity by confidence
        const domainGroups = new Map<string | number, Spot[]>();
        spots.forEach((spot) => {
          if (!domainGroups.has(spot.consensus_domain)) {
            domainGroups.set(spot.consensus_domain, []);
          }
          domainGroups.get(spot.consensus_domain)!.push(spot);
        });

        return Array.from(domainGroups.entries()).map(([domain, domainSpots]) => ({
          x: domainSpots.map((s) => s.x),
          y: domainSpots.map((s) => s.y),
          mode: 'markers' as const,
          type: 'scattergl' as const,
          name: `Domain ${domain}`,
          marker: {
            size: 6,
            color: getDomainColor(domain, domainColors),
            opacity: domainSpots.map((s) => Math.max(0.25, s.confidence)), // Min 25% opacity
          },
          hovertemplate: `Domain ${domain}<br>X: %{x:.2f}<br>Y: %{y:.2f}<br>Confidence: %{customdata:.3f}<extra></extra>`,
          customdata: domainSpots.map((s) => s.confidence),
        }));
      }

      default:
        return [];
    }
  }, [spots, mode, domainColors]);

  const layout: Partial<Layout> = useMemo(
    () => ({
      autosize: true,
      height: 600,
      margin: { l: 60, r: 40, t: 40, b: 60 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: '#FAFAFA',
      xaxis: {
        title: { text: 'X Coordinate' },
        showgrid: true,
        gridcolor: '#E2E8F0',
        zeroline: false,
      },
      yaxis: {
        title: { text: 'Y Coordinate' },
        showgrid: true,
        gridcolor: '#E2E8F0',
        zeroline: false,
        scaleanchor: 'x' as const,
        scaleratio: 1,
      } as any,
      showlegend: mode === 'consensus' || mode === 'combined',
      legend: {
        orientation: 'v',
        x: 1.02,
        y: 1,
        font: { size: 14 },
      },
      hovermode: 'closest',
    }),
    [mode]
  );

  const config: Partial<Config> = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    displaylogo: false,
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          height: 600,
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
          Loading consensus visualization...
        </Typography>
      </Box>
    );
  }

  if (!spots || spots.length === 0) {
    return (
      <Box
        sx={{
          height: 600,
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
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No consensus data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', borderRadius: 2, overflow: 'hidden' }}>
      <Plot data={plotData} layout={layout} config={config} />
    </Box>
  );
};

export default SpatialConsensusPlot;
