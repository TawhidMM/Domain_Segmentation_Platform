import { useCallback, useMemo } from 'react';

export interface StrokeWorldPoint {
  x: number;
  y: number;
}

export function useStrokeInterpolation(brushRadius: number) {
  const stepDistance = useMemo(() => Math.max(1, brushRadius / 2), [brushRadius]);

  const buildInterpolatedSegment = useCallback(
    (
      fromPoint: StrokeWorldPoint,
      toPoint: StrokeWorldPoint,
    ): StrokeWorldPoint[] => {
      const dx = toPoint.x - fromPoint.x;
      const dy = toPoint.y - fromPoint.y;
      const distance = Math.hypot(dx, dy);

      if (distance === 0) {
        return [toPoint];
      }

      const steps = Math.ceil(distance / stepDistance);
      const points: StrokeWorldPoint[] = [];

      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        points.push({
          x: fromPoint.x + dx * t,
          y: fromPoint.y + dy * t,
        });
      }

      return points;
    },
    [stepDistance],
  );

  return {
    buildInterpolatedSegment,
    stepDistance,
  };
}
