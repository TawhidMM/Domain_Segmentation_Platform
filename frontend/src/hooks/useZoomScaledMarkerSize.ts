import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface ZoomScaledMarkerSizeOptions {
  minScale?: number;
  maxScale?: number;
}

interface PlotEventHandlers {
  onInitialized: (figure: any, graphDiv: HTMLElement) => void;
  onUpdate: (figure: any, graphDiv: HTMLElement) => void;
  onRelayout: (eventData: any) => void;
}

interface ZoomScaledMarkerSizeResult {
  scale: number;
  getSize: (baseSize: number) => number;
  plotEventHandlers: PlotEventHandlers;
}

const getRangeFromFigure = (figure: any): [number, number] | null => {
  const range = figure?.layout?.xaxis?.range;
  if (!Array.isArray(range) || range.length < 2) return null;

  const start = Number(range[0]);
  const end = Number(range[1]);
  return Number.isFinite(start) && Number.isFinite(end) ? [start, end] : null;
};

const getRangeFromRelayout = (eventData: any): [number, number] | null => {
  if (Array.isArray(eventData?.['xaxis.range']) && eventData['xaxis.range'].length >= 2) {
    const [start, end] = eventData['xaxis.range'];
    return Number.isFinite(Number(start)) && Number.isFinite(Number(end))
      ? [Number(start), Number(end)]
      : null;
  }

  const start = Number(eventData?.['xaxis.range[0]']);
  const end = Number(eventData?.['xaxis.range[1]']);
  return Number.isFinite(start) && Number.isFinite(end) ? [start, end] : null;
};

const getSpan = (range: [number, number]): number => Math.abs(range[1] - range[0]);

export function useZoomScaledMarkerSize({
  minScale = 0.5,
  maxScale = 16,
}: ZoomScaledMarkerSizeOptions = {}): ZoomScaledMarkerSizeResult {
  const [scale, setScale] = useState(1);
  const baselineSpanRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  const scheduleScale = useCallback(
    (nextScale: number) => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        setScale((currentScale) => (currentScale === nextScale ? currentScale : nextScale));
      });
    },
    [],
  );

  const captureBaseline = useCallback((figure: any) => {
    if (baselineSpanRef.current !== null) return;

    const range = getRangeFromFigure(figure);
    const span = range ? getSpan(range) : 0;
    if (span > 0) {
      baselineSpanRef.current = span;
    }
  }, []);

  const onInitialized = useCallback(
    (figure: any, _graphDiv: HTMLElement) => {
      captureBaseline(figure);
    },
    [captureBaseline],
  );

  const onUpdate = useCallback(
    (figure: any, _graphDiv: HTMLElement) => {
      captureBaseline(figure);

      const baselineSpan = baselineSpanRef.current;
      if (baselineSpan === null) return;

      const range = getRangeFromFigure(figure);
      const span = range ? getSpan(range) : 0;
      if (span <= 0) return;

      const nextScale = Math.min(maxScale, Math.max(minScale, baselineSpan / span));
      scheduleScale(nextScale);
    },
    [captureBaseline, maxScale, minScale, scheduleScale],
  );

  const onRelayout = useCallback(
    (eventData: any) => {
      if (eventData?.['xaxis.autorange'] === true) {
        scheduleScale(1);
        return;
      }

      const baselineSpan = baselineSpanRef.current;
      const range = getRangeFromRelayout(eventData);
      const currentSpan = range ? getSpan(range) : 0;
      if (baselineSpan === null || currentSpan <= 0) return;

      const nextScale = Math.min(maxScale, Math.max(minScale, baselineSpan / currentSpan));
      scheduleScale(nextScale);
    },
    [maxScale, minScale, scheduleScale],
  );

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const getSize = useCallback((baseSize: number) => baseSize * scale, [scale]);
  const plotEventHandlers = useMemo(
    () => ({ onInitialized, onUpdate, onRelayout }),
    [onInitialized, onUpdate, onRelayout],
  );

  return { scale, getSize, plotEventHandlers };
}
