import { useCallback, useState } from 'react';
import type React from 'react';

import { StrokeWorldPoint, useStrokeInterpolation } from '@/hooks/useStrokeInterpolation';

export function useAnnotationPointerState(brushRadius: number) {
  const { buildInterpolatedSegment } = useStrokeInterpolation(brushRadius);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentMouseWorld, setCurrentMouseWorld] = useState<StrokeWorldPoint | null>(null);
  const [previousMouseWorld, setPreviousMouseWorld] = useState<StrokeWorldPoint | null>(null);
  const [cursorScreenPosition, setCursorScreenPosition] = useState<{ x: number; y: number } | null>(null);
  const [interpolatedWorldPath, setInterpolatedWorldPath] = useState<StrokeWorldPoint[]>([]);

  const updateCursorWorldPosition = useCallback((coordinate: number[] | null | undefined) => {
    if (!coordinate || coordinate.length < 2) {
      setCurrentMouseWorld(null);
      return;
    }

    const [x, y] = coordinate;
    setCurrentMouseWorld({ x, y });
  }, []);

  const handlePointerDown = useCallback(() => {
    setIsDrawing(true);
    setInterpolatedWorldPath([]);
    setPreviousMouseWorld(currentMouseWorld);
  }, [currentMouseWorld]);

  const handlePointerMove = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const targetRect = event.currentTarget.getBoundingClientRect();
      setCursorScreenPosition({
        x: event.clientX - targetRect.left,
        y: event.clientY - targetRect.top,
      });

      if (!isDrawing || !currentMouseWorld) {
        return;
      }

      const strokeStart = previousMouseWorld ?? currentMouseWorld;
      const segment = buildInterpolatedSegment(strokeStart, currentMouseWorld);

      setInterpolatedWorldPath(segment);
      setPreviousMouseWorld(currentMouseWorld);
    },
    [buildInterpolatedSegment, currentMouseWorld, isDrawing, previousMouseWorld],
  );

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    setInterpolatedWorldPath([]);
    setPreviousMouseWorld(currentMouseWorld);
  }, [currentMouseWorld]);

  const handlePointerLeave = useCallback(() => {
    setCursorScreenPosition(null);
    if (isDrawing) {
      setIsDrawing(false);
    }

    setInterpolatedWorldPath([]);
  }, [isDrawing]);

  return {
    isDrawing,
    currentMouseWorld,
    previousMouseWorld,
    cursorScreenPosition,
    interpolatedWorldPath,
    updateCursorWorldPosition,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
  };
}
