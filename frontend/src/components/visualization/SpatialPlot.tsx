import React, { useMemo, useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import HardwareAccelerationGuard from '@/components/shared/HardwareAccelerationGuard';
import { Box, Typography, CircularProgress, Slider, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { ExperimentMetrics, ExperimentResult } from '@/types';
import { Data, Layout, Config } from 'plotly.js';
import { useZoomScaledMarkerSize } from '@/hooks/useZoomScaledMarkerSize';

interface SpatialPlotProps {
  result: ExperimentResult | null;
  metrics?: ExperimentMetrics | null;
  title?: string;
  height?: number;
  showLegend?: boolean;
  compact?: boolean;
  rotation?: number;
  mirrorX?: boolean;
  mirrorY?: boolean;
  runId?: string;
  accessToken?: string | null;
  hasHistology?: boolean;
}

type HistologyMode = 'spots' | 'histology' | 'overlay';

const SpatialPlot: React.FC<SpatialPlotProps> = ({
  result,
  metrics,
  title,
  height,
  showLegend = true,
  compact = false,
  rotation = 0,
  mirrorX = false,
  mirrorY = false,
  runId,
  accessToken,
  hasHistology = false,
}) => {
  const { scale, getSize, plotEventHandlers } = useZoomScaledMarkerSize();
  const [histologyMode, setHistologyMode] = useState<HistologyMode>(hasHistology ? 'overlay' : 'spots');
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [loadedHistologyUrl, setLoadedHistologyUrl] = useState<string | null>(null);
  const [loadedHistologyImage, setLoadedHistologyImage] = useState<HTMLImageElement | null>(null);
  const [histologySize, setHistologySize] = useState<{ width: number; height: number } | null>(null);
  const [histologyStatus, setHistologyStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const histologyUrl = useMemo(() => {
    if (!runId || !accessToken) return null;
    const encodedToken = encodeURIComponent(accessToken);
    return `/api/datasets/${runId}/histology?token=${encodedToken}`;
  }, [runId, accessToken]);

  useEffect(() => {
    if (!hasHistology) {
      setHistologyMode('spots');
    }
  }, [hasHistology]);

  useEffect(() => {
    if (!hasHistology || !histologyUrl) {
      setHistologyStatus('idle');
      setLoadedHistologyUrl(null);
      setLoadedHistologyImage(null);
      setHistologySize(null);
      return;
    }

    let isActive = true;
    setHistologyStatus('loading');
    setLoadedHistologyUrl(null);
    setLoadedHistologyImage(null);
    setHistologySize(null);

    const image = new Image();
    image.onload = () => {
      if (!isActive) return;
      setLoadedHistologyUrl(histologyUrl);
      setLoadedHistologyImage(image);
      setHistologySize({ width: image.naturalWidth, height: image.naturalHeight });
      setHistologyStatus('loaded');
    };
    image.onerror = () => {
      if (!isActive) return;
      setHistologyStatus('error');
    };
    image.src = histologyUrl;

    return () => {
      isActive = false;
    };
  }, [hasHistology, histologyUrl]);

  const transformedHistologyUrl = useMemo(() => {
    if (!loadedHistologyImage || !histologySize) return loadedHistologyUrl;

    const { width, height } = histologySize;
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const sourceCorners = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: 0, y: height },
      { x: width, y: height },
    ];

    const transformedCorners = sourceCorners.map(({ x, y }) => {
      let transformedX = x;
      let transformedY = y;

      if (mirrorX) transformedX = -transformedX;
      if (mirrorY) transformedY = -transformedY;

      return {
        x: transformedX * cos - transformedY * sin,
        y: transformedX * sin + transformedY * cos,
      };
    });

    const xs = transformedCorners.map((corner) => corner.x);
    const ys = transformedCorners.map((corner) => corner.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(maxX - minX));
    canvas.height = Math.max(1, Math.ceil(maxY - minY));

    const context = canvas.getContext('2d');
    if (!context) return loadedHistologyUrl;

    const xScale = mirrorX ? -1 : 1;
    const yScale = mirrorY ? -1 : 1;
    context.setTransform(xScale * cos, xScale * sin, -yScale * sin, yScale * cos, -minX, -minY);
    context.drawImage(loadedHistologyImage, 0, 0);

    try {
      return canvas.toDataURL('image/png');
    } catch {
      return loadedHistologyUrl;
    }
  }, [loadedHistologyImage, histologySize, rotation, mirrorX, mirrorY, loadedHistologyUrl]);

  const formatMetric = (value?: number | null) => (value === null || value === undefined ? '—' : value.toFixed(3));
  const containerHeight = height;
  const canShowHistology = hasHistology && histologyStatus === 'loaded' && !!loadedHistologyUrl && !!histologySize;
  const effectiveMode: HistologyMode = canShowHistology ? histologyMode : 'spots';
  const showImage = canShowHistology && (effectiveMode === 'overlay' || effectiveMode === 'histology');
  const showSpots = effectiveMode === 'spots' || effectiveMode === 'overlay';

  // Memo to compute transformed image layout (matches spot transformations)
  const imageLayout = useMemo(() => {
    if (!histologySize) return null;

    const { width, height } = histologySize;
    
    // Transform all four corners of the image
    const corners = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: 0, y: height },
      { x: width, y: height },
    ];

    // Apply same transform as spots: mirrorX -> mirrorY -> rotation
    const transformed = corners.map(({ x, y }) => {
      let newX = x;
      let newY = y;

      if (mirrorX) newX = -newX;
      if (mirrorY) newY = -newY;

      const rad = (rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: newX * cos - newY * sin,
        y: newX * sin + newY * cos,
      };
    });

    // Find bounding box
    const xs = transformed.map(c => c.x);
    const ys = transformed.map(c => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Determine which corner contains origin (0,0) to set anchors
    // With autorange: 'reversed', Y=0 appears at top of plot
    // Floating point tolerance for -0 comparison
    const isZero = (v: number) => Math.abs(v) < 1e-10;
    const originIsLeft = isZero(minX);   // x=0 is at left edge (minX) → xanchor='left'
    const originIsTop = isZero(minY);    // y=0 is at top edge (minY) with reversed Y → yanchor='top'

    return {
      sizex: maxX - minX,
      sizey: maxY - minY,
      xanchor: originIsLeft ? 'left' as const : 'right' as const,
      yanchor: originIsTop ? 'top' as const : 'bottom' as const,
    };
  }, [histologySize, rotation, mirrorX, mirrorY]);

  const plotData: Data[] = useMemo(() => {
    if (!result || !result.spots) {
      return [];
    }

    if (result.spots.length === 0) {
      return [];
    }

    // Helper to transform coordinates
    const transformCoords = (x: number, y: number) => {
      let newX = x;
      let newY = y;

      // Apply mirroring first
      if (mirrorX) newX = -newX;
      if (mirrorY) newY = -newY;

      // Apply rotation
      const rad = (rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rotatedX = newX * cos - newY * sin;
      const rotatedY = newX * sin + newY * cos;

      return { x: rotatedX, y: rotatedY };
    };

    const opacityValue = effectiveMode === 'overlay' ? overlayOpacity : 0.85;

    if (effectiveMode === 'histology') {
      // Keep histology mode on the same coordinate system as spots/overlay.
      const transformedSpots = result.spots.map((spot) => transformCoords(spot.x, spot.y));

      return [
        {
          x: transformedSpots.map((spot) => spot.x),
          y: transformedSpots.map((spot) => spot.y),
          mode: 'markers' as const,
          type: 'scattergl' as const,
          hoverinfo: 'skip',
          marker: {
            opacity: 0,
            size: compact ? 4 : 6,
          },
          showlegend: false,
        },
      ];
    }

    if (!result.domains || result.domains.length === 0) {
      return [];
    }

    const data = result.domains.map((domain) => {
      const spotsForDomain = result.spots.filter((spot) => spot.domain === domain.domain_id);

      return {
        x: spotsForDomain.map((spot) => transformCoords(spot.x, spot.y).x),
        y: spotsForDomain.map((spot) => transformCoords(spot.x, spot.y).y),
        mode: 'markers' as const,
        type: 'scattergl' as const,
        name: `Domain ${domain.domain_id + 1}`,
        marker: {
          color: domain.color,
            size: getSize(compact ? 4 : 6),
          opacity: opacityValue,
        },
        hovertemplate: `Domain ${domain.domain_id + 1}<br>X: %{x:.1f}<br>Y: %{y:.1f}<extra></extra>`,
      };
    });

    return data;
  }, [result, compact, rotation, mirrorX, mirrorY, effectiveMode, overlayOpacity, getSize, scale]);

  const layout: Partial<Layout> = useMemo(() => {
    const hasImage = showImage && histologySize && transformedHistologyUrl;

    // Use transformed image layout or defaults
    const imgLayout = imageLayout
      ? imageLayout
      : { sizex: histologySize?.width ?? 0, sizey: histologySize?.height ?? 0, xanchor: 'left' as const, yanchor: 'top' as const };

    return {
      autosize: true,
      margin: compact
        ? { l: 40, r: 20, t: title ? 40 : 20, b: 40 }
        : { l: 60, r: 40, t: title ? 60 : 40, b: 60 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: hasImage ? 'rgba(0,0,0,0)' : '#FAFAFA',
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
        autorange: 'reversed',
      },
      images: hasImage
        ? [
            {
              source: transformedHistologyUrl as string,
              xref: 'x',
              yref: 'y',
              x: 0,
              y: 0,
              sizex: imgLayout.sizex,
              sizey: imgLayout.sizey,
              sizing: 'stretch',
              opacity: 1,
              layer: 'below',
              xanchor: imgLayout.xanchor,
              yanchor: imgLayout.yanchor,
            },
          ]
        : undefined,
      showlegend: showLegend && !compact && showSpots,
      legend: {
        orientation: 'v',
        x: 1.02,
        y: 1,
        font: { size: 15 },
        itemsizing: 'constant',
      },
      hovermode: 'closest',
    };
  }, [title, showLegend, compact, showImage, histologySize, transformedHistologyUrl, showSpots, imageLayout]);

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
        height: containerHeight ?? 200,
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
        width: '100%',
        height: containerHeight ? `${containerHeight}px` : '100%',
        minHeight: containerHeight ?? 200,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          px: compact ? 1.5 : 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: '#F8FAFC',
          display: 'flex',
          flexWrap: 'wrap',
          gap: compact ? 1 : 1.5,
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Silhouette: <b>{formatMetric(metrics?.silhouette)}</b>
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Davies–Bouldin: <b>{formatMetric(metrics?.davies_bouldin)}</b>
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Calinski–Harabasz: <b>{formatMetric(metrics?.calinski_harabasz)}</b>
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Moran's I: <b>{formatMetric(metrics?.morans_I)}</b>
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Geary's C: <b>{formatMetric(metrics?.gearys_C)}</b>
        </Typography>
      </Box>
      {hasHistology && (
        <Box
          sx={{
            px: compact ? 1.5 : 2,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'white',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
          }}
        >
          <ToggleButtonGroup
            size="small"
            value={histologyMode}
            exclusive
            onChange={(_, value: HistologyMode | null) => {
              if (value) {
                setHistologyMode(value);
              }
            }}
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                px: 1.5,
                py: 0.5,
                fontSize: '0.75rem',
              },
            }}
          >
            <ToggleButton value="spots">Spots</ToggleButton>
            <ToggleButton value="histology">Histology</ToggleButton>
            <ToggleButton value="overlay">Overlay</ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Overlay opacity
            </Typography>
            <Slider
              size="small"
              min={0}
              max={1}
              step={0.05}
              value={overlayOpacity}
              onChange={(_, value) => {
                if (typeof value === 'number') {
                  setOverlayOpacity(value);
                }
              }}
              disabled={histologyMode !== 'overlay'}
              sx={{ width: 140 }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 36 }}>
              {overlayOpacity.toFixed(2)}
            </Typography>
          </Box>
          {histologyStatus === 'loading' && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Loading histology...
            </Typography>
          )}
          {histologyStatus === 'error' && (
            <Typography variant="caption" sx={{ color: 'error.main' }}>
              Histology image unavailable.
            </Typography>
          )}
        </Box>
      )}
      <HardwareAccelerationGuard>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
          }}
        >
          <Plot
            data={plotData}
            layout={layout}
            config={config}
            {...plotEventHandlers}
            style={{ width: '100%', height: '100%', minHeight: 0, position: 'absolute', top: 0, left: 0 }}
            useResizeHandler
          />
        </Box>
      </HardwareAccelerationGuard>
    </Box>
  );
};

export default SpatialPlot;