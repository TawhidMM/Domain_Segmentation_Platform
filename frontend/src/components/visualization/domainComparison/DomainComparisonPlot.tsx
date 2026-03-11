import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Data, Layout, Config, PlotMouseEvent } from 'plotly.js';
import { Box, Paper, Typography } from '@mui/material';
import { DomainComparisonResponse } from './types';

interface DomainComparisonPlotProps {
  data: DomainComparisonResponse;
  selectedDomain: number | null;
  onDomainSelect: (domain: number) => void;
}

const BOTH_COLOR = '#6D28D9';
const A_ONLY_COLOR = '#07f72f';
const B_ONLY_COLOR = '#F97316';
const DOMAIN_BULLET_COLOR = 'rgb(13, 199, 228)';

const DomainComparisonPlot: React.FC<DomainComparisonPlotProps> = ({
  data,
  selectedDomain,
  onDomainSelect,
}) => {
  const selectedDomainValue = selectedDomain;

  const availableDomains = useMemo(
    () =>
      Array.from(new Set(data.spots.map((spot) => spot.A)))
        .filter((domain): domain is number => typeof domain === 'number')
        .sort((a, b) => a - b),
    [data.spots],
  );

  const { both, aOnly, bOnly } = useMemo(() => {
    if (selectedDomainValue === null) {
      return { both: [], aOnly: [], bOnly: [] };
    }

    const bothSpots = data.spots.filter((spot) => spot.A === selectedDomainValue && spot.B === selectedDomainValue);
    const aOnlySpots = data.spots.filter((spot) => spot.A === selectedDomainValue && spot.B !== selectedDomainValue);
    const bOnlySpots = data.spots.filter((spot) => spot.A !== selectedDomainValue && spot.B === selectedDomainValue);

    return { both: bothSpots, aOnly: aOnlySpots, bOnly: bOnlySpots };
  }, [data.spots, selectedDomainValue]);

  const buildTrace = useMemo(
    () =>
      (name: string, spots: DomainComparisonResponse['spots'], color: string): Data => ({
        x: spots.map((spot) => spot.x),
        y: spots.map((spot) => spot.y),
        mode: 'markers',
        type: 'scattergl',
        name,
        marker: {
          size: 6,
          color,
          opacity: 0.85,
        },
        customdata: spots.map((spot) => [spot.barcode, spot.A, spot.B]),
        hovertemplate:
          `Barcode: %{customdata[0]}<br>${data.experiments.A.tool_name}: %{customdata[1]}<br>${data.experiments.B.tool_name}: %{customdata[2]}<extra></extra>`,
      }),
    [data.experiments.A.tool_name, data.experiments.B.tool_name],
  );

  const plotData: Data[] = useMemo(
    () => [
      {
        // Hidden anchor trace keeps plot extents stable even when visible traces change.
        x: data.spots.map((spot) => spot.x),
        y: data.spots.map((spot) => spot.y),
        mode: 'markers',
        type: 'scattergl',
        name: '__extent_anchor__',
        showlegend: false,
        hoverinfo: 'skip',
        marker: {
          size: 1,
          color: 'rgba(0,0,0,0)',
          opacity: 0,
        },
      },
      buildTrace('Both', both, BOTH_COLOR),
      buildTrace(`${data.experiments.A.tool_name} only`, aOnly, A_ONLY_COLOR),
      buildTrace(`${data.experiments.B.tool_name} only`, bOnly, B_ONLY_COLOR),
    ],
    [buildTrace, both, aOnly, bOnly, data.spots, data.experiments.A.tool_name, data.experiments.B.tool_name],
  );

  const axisRanges = useMemo(() => {
    if (data.spots.length === 0) {
      return null;
    }

    const xs = data.spots.map((spot) => spot.x);
    const ys = data.spots.map((spot) => spot.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const xPad = (maxX - minX || 1) * 0.04;
    const yPad = (maxY - minY || 1) * 0.04;

    return {
      x: [minX - xPad, maxX + xPad],
      // Keep reversed orientation while freezing range.
      y: [maxY + yPad, minY - yPad],
    };
  }, [data.spots]);

  const layout: Partial<Layout> = useMemo(
    () => ({
      autosize: true,
      height: 560,
      margin: { l: 60, r: 40, t: 30, b: 60 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: '#FAFAFA',
      xaxis: {
        title: { text: 'X Coordinate' },
        showgrid: true,
        gridcolor: '#E2E8F0',
        zeroline: false,
        autorange: false,
        range: axisRanges?.x,
      },
      yaxis: {
        title: { text: 'Y Coordinate' },
        showgrid: true,
        gridcolor: '#E2E8F0',
        zeroline: false,
        scaleanchor: 'x',
        scaleratio: 1,
        autorange: false,
        range: axisRanges?.y,
      } as any,
      showlegend: true,
      legend: {
        orientation: 'h',
        x: 0,
        y: 1.08,
      },
      hovermode: 'closest',
      // Prevent layout reset when selectedDomain changes.
      uirevision: 'domain-comparison-fixed-layout',
    }),
    [axisRanges],
  );

  const config: Partial<Config> = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    displaylogo: false,
  };

  const handleClick = (event: Readonly<PlotMouseEvent>) => {
    if (!event.points || event.points.length === 0) {
      return;
    }

    // Enforce one active domain by always deriving a single domain from click points.
    const clickedDomains = event.points
      .map((point) => {
        const customData = point.customdata as unknown;
        if (!Array.isArray(customData) || customData.length < 2) {
          return undefined;
        }
        const domainA = customData[1];
        return typeof domainA === 'number' ? domainA : undefined;
      })
      .filter((domain): domain is number => typeof domain === 'number');

    if (clickedDomains.length === 0) {
      return;
    }

    const nextDomain = Math.min(...clickedDomains);
    onDomainSelect(nextDomain);
  };

  if (selectedDomainValue === null) {
    return (
      <Box
        sx={{
          height: 560,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#FAFAFA',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No domain available to display.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 220px' },
        gap: 2,
        p: 2,
        bgcolor: '#FAFAFA',
      }}
    >
      <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
        <Plot
          data={plotData}
          layout={layout}
          config={config}
          onClick={handleClick}
          useResizeHandler
          style={{ width: '100%', height: '560px' }}
        />
      </Box>

      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          borderRadius: 2,
          maxHeight: 560,
          overflowY: 'auto',
          bgcolor: 'white',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
          Domains
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {availableDomains.map((domain) => {
            const isActive = selectedDomainValue === domain;

            return (
              <Box
                key={domain}
                role="button"
                tabIndex={0}
                onClick={() => onDomainSelect(domain)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onDomainSelect(domain);
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1,
                  py: 0.75,
                  borderRadius: 1,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: isActive ? 'primary.main' : 'transparent',
                  bgcolor: isActive ? 'primary.50' : 'transparent',
                  '&:hover': {
                    bgcolor: isActive ? 'primary.100' : 'grey.100',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: DOMAIN_BULLET_COLOR,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: isActive ? 700 : 500 }}>
                  Domain {domain}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Paper>
    </Box>
  );
};

export default DomainComparisonPlot;
