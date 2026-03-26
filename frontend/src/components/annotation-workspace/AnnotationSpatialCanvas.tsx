import React, { useEffect, useMemo, useRef, useState } from 'react';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import DeckGL, { DeckGLRef } from '@deck.gl/react';
import { BitmapLayer, ScatterplotLayer } from '@deck.gl/layers';
import { OrthographicView } from '@deck.gl/core';
import { Box, Typography } from '@mui/material';

import {
  AnnotationMode,
  AnnotationSpatialSpot,
  SpatialImageMetadata,
} from '@/types/annotationPlayground';

interface BrushConfig {
  brushRadius: number;
  activeLabelId: number;
  mode: AnnotationMode;
}

interface AnnotationSpatialCanvasProps {
  spots: AnnotationSpatialSpot[];
  coordinateBuffer: Float32Array;
  imageMetadata: SpatialImageMetadata | null;
  annotationBuffer: Uint8Array;
  annotationVersion: number;
  labelColors: Record<number, [number, number, number]>;
  spotOpacity: number;
  brushConfig: BrushConfig;
  brushCursorWorldPosition: { x: number; y: number } | null;
  cursorScreenPosition: { x: number; y: number } | null;
  onPointerDown: (payload: AnnotationCanvasPointerPayload) => void;
  onPointerMove: (payload: AnnotationCanvasPointerPayload) => void;
  onPointerUp: () => void;
  onPointerLeave: (payload: AnnotationCanvasPointerPayload) => void;
}

export interface AnnotationCanvasPointerPayload {
  screenX: number;
  screenY: number;
  worldX: number | null;
  worldY: number | null;
}

interface DeckViewState {
  target: [number, number, number];
  zoom: number;
  minZoom: number;
  maxZoom: number;
}

const DEFAULT_SPOT_RADIUS = 6;

function computeViewBounds(
  spots: AnnotationSpatialSpot[],
  imageMetadata: SpatialImageMetadata | null,
) {
  if (imageMetadata) {
    const [left, bottom, right, top] = imageMetadata.bounds;
    return {
      minX: Math.min(left, right),
      maxX: Math.max(left, right),
      minY: Math.min(top, bottom),
      maxY: Math.max(top, bottom),
    };
  }

  if (spots.length === 0) {
    return {
      minX: 0,
      maxX: 1,
      minY: 0,
      maxY: 1,
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const spot of spots) {
    if (spot.x < minX) {
      minX = spot.x;
    }
    if (spot.x > maxX) {
      maxX = spot.x;
    }
    if (spot.y < minY) {
      minY = spot.y;
    }
    if (spot.y > maxY) {
      maxY = spot.y;
    }
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
  };
}

function buildFitViewState(
  spots: AnnotationSpatialSpot[],
  imageMetadata: SpatialImageMetadata | null,
  width: number,
  height: number,
): DeckViewState {
  const { minX, maxX, minY, maxY } = computeViewBounds(spots, imageMetadata);
  const xRange = Math.max(maxX - minX, 1);
  const yRange = Math.max(maxY - minY, 1);
  const zoom = Math.log2(Math.min(width / xRange, height / yRange));

  return {
    target: [(minX + maxX) / 2, (minY + maxY) / 2, 0],
    zoom,
    minZoom: zoom - 8,
    maxZoom: zoom + 6,
  };
}

const AnnotationSpatialCanvas: React.FC<AnnotationSpatialCanvasProps> = ({
  spots,
  coordinateBuffer,
  imageMetadata,
  annotationBuffer,
  annotationVersion,
  labelColors,
  spotOpacity,
  brushConfig,
  brushCursorWorldPosition,
  cursorScreenPosition,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
}) => {
  const deckRef = useRef<DeckGLRef | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastDataSignatureRef = useRef<string>('');
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [viewState, setViewState] = useState<DeckViewState | null>(null);
  const [deckError, setDeckError] = useState<string | null>(null);

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

      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      setContainerSize((prev) => {
        if (prev.width === width && prev.height === height) {
          return prev;
        }

        return { width, height };
      });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (containerSize.width <= 0 || containerSize.height <= 0) {
      return;
    }

    const dataSignature = `${spots.length}|${imageMetadata?.url ?? 'none'}|${
      imageMetadata?.bounds?.join(',') ?? 'none'
    }`;

    const next = buildFitViewState(spots, imageMetadata, containerSize.width, containerSize.height);

    if (lastDataSignatureRef.current !== dataSignature) {
      lastDataSignatureRef.current = dataSignature;
      setViewState(next);
      return;
    }

    setViewState((prev) => prev ?? next);
  }, [containerSize, imageMetadata, spots]);

  const layers = useMemo(() => {
    const builtLayers = [];

    if (imageMetadata) {
      builtLayers.push(
        new BitmapLayer({
          id: 'annotation-histology-image',
          image: imageMetadata.url,
          bounds: imageMetadata.bounds,
          pickable: true,
          loadOptions: {
            fetch: {
              method: 'GET',
              mode: 'cors',
              credentials: 'omit',
            },
          },
        }),
      );
    }

    builtLayers.push(
      new ScatterplotLayer({
        id: 'annotation-spots',
        data: {
          length: spots.length,
          attributes: {
            getPosition: { value: coordinateBuffer, size: 2 },
          },
        },
        getRadius: (_unused: unknown, { index }) => spots[index]?.radius ?? DEFAULT_SPOT_RADIUS,
        radiusUnits: 'common',
        stroked: false,
        filled: true,
        opacity: spotOpacity,
        pickable: true,
        getFillColor: (_unused: unknown, { index }) => {
          if (index < 0) {
            return [148, 163, 184];
          }

          const spot = spots[index];
          if (!spot) {
            return [148, 163, 184];
          }

          const labelId = annotationBuffer[index] ?? 0;
          if (labelId !== 0) {
            return labelColors[labelId] ?? spot.originalColor;
          }

          return spot.originalColor;
        },
        updateTriggers: {
          getFillColor: [annotationVersion, labelColors],
        },
      }),
    );

    if (brushCursorWorldPosition && brushConfig.mode !== 'pan') {
      builtLayers.push(
        new ScatterplotLayer({
          id: 'brush-ghost-layer',
          data: [brushCursorWorldPosition],
          getPosition: (point: { x: number; y: number }) => [point.x, point.y],
          getRadius: brushConfig.brushRadius,
          radiusUnits: 'common',
          filled: true,
          getFillColor: [59, 130, 246, 40],
          stroked: true,
          getLineColor: [15, 23, 42, 200],
          lineWidthUnits: 'pixels',
          getLineWidth: 1,
          pickable: false,
        }),
      );
    }

    return builtLayers;
  }, [
    annotationBuffer,
    annotationVersion,
    brushConfig.brushRadius,
    brushConfig.mode,
    brushCursorWorldPosition,
    imageMetadata,
    labelColors,
    spotOpacity,
    coordinateBuffer,
    spots,
  ]);

  const buildPointerPayload = (
    event: React.MouseEvent<HTMLDivElement>,
  ): AnnotationCanvasPointerPayload => {
    const container = containerRef.current;
    const deckInstance = deckRef.current?.deck;

    if (!container) {
      return {
        screenX: 0,
        screenY: 0,
        worldX: null,
        worldY: null,
      };
    }

    const rect = container.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const viewport = deckInstance?.getViewports()?.[0];

    if (!viewport) {
      return {
        screenX,
        screenY,
        worldX: null,
        worldY: null,
      };
    }

    const [worldX, worldY] = viewport.unproject([screenX, screenY]);
    return {
      screenX,
      screenY,
      worldX,
      worldY,
    };
  };

  const canRenderDeck = Boolean(
    viewState && containerSize.width > 0 && containerSize.height > 0,
  );
  const isPanMode = brushConfig.mode === 'pan';

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 640,
        border: '1px solid #D7E3F4',
        borderRadius: 2,
        bgcolor: '#F8FAFC',
        overflow: 'hidden',
        cursor: isPanMode ? 'grab' : 'none',
        '&:active': {
          cursor: isPanMode ? 'grabbing' : 'none',
        },
      }}
      onMouseDown={(event) => onPointerDown(buildPointerPayload(event))}
      onMouseMove={(event) => onPointerMove(buildPointerPayload(event))}
      onMouseUp={onPointerUp}
      onMouseLeave={(event) => onPointerLeave(buildPointerPayload(event))}
    >
      {canRenderDeck && (
        <DeckGL
          ref={deckRef}
          width={containerSize.width}
          height={containerSize.height}
          layers={layers}
          views={new OrthographicView({ id: 'annotation-ortho-view' })}
          viewState={viewState}
          controller={isPanMode}
          getCursor={({ isDragging }) => {
            if (!isPanMode) {
              return 'none';
            }

            return isDragging ? 'grabbing' : 'grab';
          }}
          onError={(error) => {
            const message = error instanceof Error ? error.message : 'Unknown Deck.gl error';
            setDeckError(message);
          }}
          onViewStateChange={({ viewState: nextViewState }) => {
            setViewState(nextViewState as DeckViewState);
          }}
        />
      )}

      {deckError && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(248, 250, 252, 0.88)',
            p: 2,
          }}
        >
          <Box sx={{ maxWidth: 680, textAlign: 'left', color: '#0F172A' }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Deck/WebGL initialization failed</Typography>
            <Typography sx={{ fontSize: 13, mb: 0.5 }}>
              This browser/runtime could not create the GPU context needed by Deck.gl.
            </Typography>
            <Typography sx={{ fontSize: 12, fontFamily: 'monospace', mb: 1.5 }}>
              {deckError}
            </Typography>
            <Typography sx={{ fontSize: 13 }}>
              Recommended fixes: enable hardware acceleration, update graphics drivers, and verify WebGL in
              `chrome://gpu` or `about:support`.
            </Typography>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'transparent',
        }}
      />

      {brushConfig.mode === 'erase' && cursorScreenPosition && (
        <Box
          sx={{
            position: 'absolute',
            left: cursorScreenPosition.x + 10,
            top: cursorScreenPosition.y + 10,
            width: 14,
            height: 14,
            borderRadius: 0.5,
            bgcolor: 'rgba(248, 250, 252, 0.96)',
            border: '1px solid rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          <CleaningServicesIcon sx={{ fontSize: 10, color: '#0F172A' }} />
        </Box>
      )}
    </Box>
  );
};

export default AnnotationSpatialCanvas;
