import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import KDBush from 'kdbush';

import { AnnotationMode, AnnotationSpatialSpot } from '@/types/annotationPlayground';

interface BrushWorldPoint {
  x: number;
  y: number;
}

interface AnnotationBrushConfig {
  spots: AnnotationSpatialSpot[];
  kdTree: KDBush | null;
  annotationBuffer: Uint8Array;
  brushRadius: number;
  activeLabelId: number;
  mode: AnnotationMode;
  enabled: boolean;
  onAnnotationMutated: () => void;
  onStrokeComplete?: (changes: Map<number, number>) => void;
}

interface AnnotationPointerPayload {
  screenX: number;
  screenY: number;
  worldX: number | null;
  worldY: number | null;
}

export function pointToSegmentDistanceSquared(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    const ddx = px - x1;
    const ddy = py - y1;
    return ddx * ddx + ddy * ddy;
  }

  const tRaw = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const t = Math.max(0, Math.min(1, tRaw));
  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;

  const ddx = px - nearestX;
  const ddy = py - nearestY;
  return ddx * ddx + ddy * ddy;
}

export function useAnnotationBrush({
  spots,
  kdTree,
  annotationBuffer,
  brushRadius,
  activeLabelId,
  mode,
  enabled,
  onAnnotationMutated,
  onStrokeComplete,
}: AnnotationBrushConfig) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorScreenPosition, setCursorScreenPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<BrushWorldPoint | null>(null);
  const [previousPoint, setPreviousPoint] = useState<BrushWorldPoint | null>(null);
  const [currentStrokeChanges, setCurrentStrokeChanges] = useState<Map<number, number>>(new Map());
  const currentStrokeChangesRef = useRef<Map<number, number>>(new Map());

  const shouldPaint = enabled && (mode === 'draw' || mode === 'erase');

  const applyBrushSegment = useCallback(
    (fromPoint: BrushWorldPoint, toPoint: BrushWorldPoint) => {
      if (!kdTree || spots.length === 0 || annotationBuffer.length === 0) {
        return;
      }

      const minX = Math.min(fromPoint.x, toPoint.x) - brushRadius;
      const maxX = Math.max(fromPoint.x, toPoint.x) + brushRadius;
      const minY = Math.min(fromPoint.y, toPoint.y) - brushRadius;
      const maxY = Math.max(fromPoint.y, toPoint.y) + brushRadius;

      const candidateIndexes = kdTree.range(minX, minY, maxX, maxY);
      const changedIndexes = new Set<number>();
      const nextValue = mode === 'draw' ? activeLabelId : 0;
      const brushRadiusSquared = brushRadius * brushRadius;

      // Update stroke changes tracking
      setCurrentStrokeChanges((prevChanges) => {
        const nextChanges = new Map(prevChanges);

        for (const candidateIndex of candidateIndexes) {
          const spot = spots[candidateIndex];
          if (!spot) {
            continue;
          }

          const distanceSquared = pointToSegmentDistanceSquared(
            spot.x,
            spot.y,
            fromPoint.x,
            fromPoint.y,
            toPoint.x,
            toPoint.y,
          );

          if (distanceSquared > brushRadiusSquared) {
            continue;
          }

          const currentLabel = annotationBuffer[candidateIndex] ?? 0;
          if (currentLabel === nextValue) {
            continue;
          }

          // Store old value only if not already tracked in this stroke
          if (!nextChanges.has(candidateIndex)) {
            nextChanges.set(candidateIndex, annotationBuffer[candidateIndex] ?? 0);
          }

          annotationBuffer[candidateIndex] = nextValue;
          changedIndexes.add(candidateIndex);
        }

        if (changedIndexes.size > 0) {
          onAnnotationMutated();
        }

        currentStrokeChangesRef.current = nextChanges;

        return nextChanges;
      });
    },
    [activeLabelId, annotationBuffer, brushRadius, kdTree, mode, onAnnotationMutated, spots],
  );

  const buildWorldPoint = useCallback((payload: AnnotationPointerPayload): BrushWorldPoint | null => {
    if (payload.worldX === null || payload.worldY === null) {
      return null;
    }

    return {
      x: payload.worldX,
      y: payload.worldY,
    };
  }, []);

  const handlePointerDown = useCallback(
    (payload: AnnotationPointerPayload) => {
      setCursorScreenPosition({ x: payload.screenX, y: payload.screenY });

      if (!shouldPaint) {
        return;
      }

      const worldPoint = buildWorldPoint(payload);
      if (!worldPoint) {
        return;
      }

      setIsDrawing(true);
      setCurrentPoint(worldPoint);
      setPreviousPoint(worldPoint);
      setCurrentStrokeChanges(() => {
        const nextChanges = new Map<number, number>();
        currentStrokeChangesRef.current = nextChanges;
        return nextChanges;
      });
      applyBrushSegment(worldPoint, worldPoint);
    },
    [applyBrushSegment, buildWorldPoint, shouldPaint],
  );

  const handlePointerMove = useCallback(
    (payload: AnnotationPointerPayload) => {
      setCursorScreenPosition({ x: payload.screenX, y: payload.screenY });

      const worldPoint = buildWorldPoint(payload);
      if (!worldPoint) {
        return;
      }

      setCurrentPoint(worldPoint);

      if (!isDrawing || !shouldPaint) {
        return;
      }

      const strokeStart = previousPoint ?? worldPoint;
      applyBrushSegment(strokeStart, worldPoint);
      setPreviousPoint(worldPoint);
    },
    [applyBrushSegment, buildWorldPoint, isDrawing, previousPoint, shouldPaint],
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setPreviousPoint(null);

    // Record the stroke changes to history
    const strokeChanges = currentStrokeChangesRef.current;
    if (onStrokeComplete && strokeChanges.size > 0) {
      onStrokeComplete(strokeChanges);
    }

    setCurrentStrokeChanges((prevChanges) => {
      if (prevChanges.size === 0) {
        return prevChanges;
      }

      const nextChanges = new Map<number, number>();
      currentStrokeChangesRef.current = nextChanges;
      return nextChanges;
    });
  }, [onStrokeComplete]);

  useEffect(() => {
    if (!shouldPaint) {
      stopDrawing();
    }
  }, [shouldPaint, stopDrawing]);

  const handlePointerUp = useCallback(() => {
    stopDrawing();
  }, [stopDrawing]);

  const handlePointerLeave = useCallback(
    (payload: AnnotationPointerPayload) => {
      const exitWorldPoint = buildWorldPoint(payload);
      if (isDrawing && shouldPaint && exitWorldPoint) {
        const strokeStart = previousPoint ?? currentPoint ?? exitWorldPoint;
        applyBrushSegment(strokeStart, exitWorldPoint);
      }

    setCursorScreenPosition(null);
    setCurrentPoint(null);
    stopDrawing();
    },
    [applyBrushSegment, buildWorldPoint, currentPoint, isDrawing, previousPoint, shouldPaint, stopDrawing],
  );

  const brushCursorWorldPosition = useMemo(() => {
    if (!currentPoint || mode === 'pan') {
      return null;
    }

    return currentPoint;
  }, [currentPoint, mode]);

  return {
    isDrawing,
    currentPoint,
    previousPoint,
    cursorScreenPosition,
    brushCursorWorldPosition,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
  };
}
