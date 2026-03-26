import React, { useEffect, useMemo, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView, PickingInfo } from '@deck.gl/core';
import { Box } from '@mui/material';
import createDeckGLPieLayer, { DeckGLPieDatum } from './DeckGLPieLayer';
import { OverlayDomainSpot } from './useOverlayDomainData';

interface HoverInfo {
  spot: OverlayDomainSpot | null;
  x: number;
  y: number;
}

interface DeckGLPieCanvasProps {
  spots: OverlayDomainSpot[];
  domainColorMap: Record<number, string>;
  spotRadius?: number;
  onHover: (hover: HoverInfo) => void;
}

interface DeckViewState {
  target: [number, number, number];
  zoom: number;
  minZoom: number;
  maxZoom: number;
}

const DEFAULT_SPOT_RADIUS = 8;
const MIN_ZOOM_SCALE = 0.25;
const MAX_ZOOM_SCALE = 16;

function computeBounds(spots: OverlayDomainSpot[]) {
  const xs = spots.map((spot) => spot.x);
  const ys = spots.map((spot) => spot.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function buildFitViewState(
  spots: OverlayDomainSpot[],
  width: number,
  height: number,
): DeckViewState {
  const { minX, maxX, minY, maxY } = computeBounds(spots);
  const xRange = Math.max(maxX - minX, 1);
  const yRange = Math.max(maxY - minY, 1);
  const zoom = Math.log2(Math.min(width / xRange, height / yRange));

  return {
    target: [(minX + maxX) / 2, (minY + maxY) / 2, 0],
    zoom,
    minZoom: zoom - 8,
    maxZoom: zoom + 4,
  };
}

const DeckGLPieCanvas: React.FC<DeckGLPieCanvasProps> = ({
  spots,
  domainColorMap,
  spotRadius = DEFAULT_SPOT_RADIUS,
  onHover,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [viewState, setViewState] = useState<DeckViewState | null>(null);
  const [baseZoom, setBaseZoom] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const nextWidth = Math.floor(entry.contentRect.width);
      const nextHeight = Math.floor(entry.contentRect.height);

      setContainerSize((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) {
          return prev;
        }
        return { width: nextWidth, height: nextHeight };
      });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (spots.length === 0 || containerSize.width <= 0 || containerSize.height <= 0) {
      return;
    }

    setViewState((prev) => {
      if (prev) {
        return prev;
      }

      const fitted = buildFitViewState(spots, containerSize.width, containerSize.height);
      setBaseZoom(fitted.zoom);
      return fitted;
    });
  }, [containerSize.height, containerSize.width, spots]);

  const zoomScaledSpotRadius = useMemo(() => {
    if (!viewState || baseZoom === null) {
      return spotRadius;
    }

    const zoomScale = Math.pow(2, viewState.zoom - baseZoom);
    const clampedScale = Math.max(MIN_ZOOM_SCALE, Math.min(MAX_ZOOM_SCALE, zoomScale));

    return spotRadius * clampedScale;
  }, [baseZoom, spotRadius, viewState]);

  const deckSpots = useMemo<DeckGLPieDatum[]>(
    () =>
      spots.map((spot) => ({
        ...spot,
        id: spot.spotId,
        position: [spot.x, spot.y, 0],
      })),
    [spots],
  );

  const layer = useMemo(
    () =>
      createDeckGLPieLayer({
        id: 'overlay-domain-pie-layer',
        data: deckSpots,
        domainColorMap,
        spotRadius: zoomScaledSpotRadius,
        onHover: (info: PickingInfo<DeckGLPieDatum>) => {
          onHover({
            spot: info.object ?? null,
            x: info.x,
            y: info.y,
          });
        },
      }),
    [deckSpots, domainColorMap, onHover, zoomScaledSpotRadius],
  );

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 520,
        borderRadius: 2,
        border: '1px solid #DDE6F1',
        bgcolor: '#F8FAFC',
        overflow: 'hidden',
      }}
    >
      {viewState && (
        <DeckGL
          layers={[layer]}
          views={new OrthographicView({ id: 'overlay-domain-ortho' })}
          controller
          viewState={viewState}
          onViewStateChange={({ viewState: nextViewState }) => {
            setViewState(nextViewState as DeckViewState);
          }}
        />
      )}
    </Box>
  );
};

export default DeckGLPieCanvas;
