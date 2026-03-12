import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { pie as d3Pie } from 'd3-shape';
import { OverlayDomainSpot } from './useOverlayDomainData';

interface OverlayDomainCanvasProps {
  spots: OverlayDomainSpot[];
  domainColorMap: Record<number, string>;
  spotRadius?: number;
  onHoveredSpotChange: (spot: OverlayDomainSpot | null) => void;
  onMousePositionChange: (position: { x: number; y: number }) => void;
}

interface CanvasTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const DEFAULT_SPOT_RADIUS = 8;

function encodeSpotIndex(index: number): [number, number, number] {
  const encoded = index + 1;
  return [encoded & 255, (encoded >> 8) & 255, (encoded >> 16) & 255];
}

function decodeSpotIndex(r: number, g: number, b: number): number {
  const encoded = r + (g << 8) + (b << 16);
  return encoded - 1;
}

function computeTransform(spots: OverlayDomainSpot[], width: number, height: number): CanvasTransform {
  const xs = spots.map((spot) => spot.x);
  const ys = spots.map((spot) => spot.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const xRange = Math.max(maxX - minX, 1);
  const yRange = Math.max(maxY - minY, 1);

  const scale = Math.min(width / xRange, height / yRange);
  const offsetX = (width - xRange * scale) / 2 - minX * scale;
  const offsetY = (height - yRange * scale) / 2 - minY * scale;

  return {
    scale,
    offsetX,
    offsetY,
  };
}

const OverlayDomainCanvas: React.FC<OverlayDomainCanvasProps> = ({
  spots,
  domainColorMap,
  spotRadius = DEFAULT_SPOT_RADIUS,
  onHoveredSpotChange,
  onMousePositionChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visualCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const hoverRafRef = useRef<number | null>(null);
  const drawRafRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastPointerPixelRef = useRef<{ x: number; y: number } | null>(null);
  const lastTooltipPositionRef = useRef<{ x: number; y: number } | null>(null);
  const hoveredIndexRef = useRef<number>(-1);
  const dprRef = useRef(1);

  const [size, setSize] = useState({ width: 0, height: 0 });

  const pieGenerator = useMemo(
    () =>
      d3Pie<number>()
        .sort(null)
        .value(() => 1),
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const nextWidth = Math.floor(entry.contentRect.width);
      const nextHeight = Math.floor(entry.contentRect.height);

      setSize((previous) => {
        if (previous.width === nextWidth && previous.height === nextHeight) {
          return previous;
        }

        return { width: nextWidth, height: nextHeight };
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const visualCanvas = visualCanvasRef.current;
    const hitCanvas = hitCanvasRef.current;
    if (!visualCanvas || !hitCanvas || size.width <= 0 || size.height <= 0) {
      return;
    }

    if (drawRafRef.current !== null) {
      cancelAnimationFrame(drawRafRef.current);
      drawRafRef.current = null;
    }

    drawRafRef.current = requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;

      visualCanvas.width = Math.floor(size.width * dpr);
      visualCanvas.height = Math.floor(size.height * dpr);
      visualCanvas.style.width = `${size.width}px`;
      visualCanvas.style.height = `${size.height}px`;

      hitCanvas.width = Math.floor(size.width * dpr);
      hitCanvas.height = Math.floor(size.height * dpr);
      hitCanvas.style.width = `${size.width}px`;
      hitCanvas.style.height = `${size.height}px`;

      const visualContext = visualCanvas.getContext('2d');
      const hitContext = hitCanvas.getContext('2d', { willReadFrequently: true });

      if (!visualContext || !hitContext) {
        return;
      }

      hitContextRef.current = hitContext;

      visualContext.setTransform(1, 0, 0, 1, 0, 0);
      hitContext.setTransform(1, 0, 0, 1, 0, 0);

      visualContext.clearRect(0, 0, visualCanvas.width, visualCanvas.height);
      hitContext.clearRect(0, 0, hitCanvas.width, hitCanvas.height);

      if (spots.length === 0) {
        return;
      }

      const transform = computeTransform(spots, size.width, size.height);

      visualContext.setTransform(
        dpr * transform.scale,
        0,
        0,
        dpr * transform.scale,
        dpr * transform.offsetX,
        dpr * transform.offsetY,
      );

      hitContext.setTransform(
        dpr * transform.scale,
        0,
        0,
        dpr * transform.scale,
        dpr * transform.offsetX,
        dpr * transform.offsetY,
      );

      spots.forEach((spot, spotIndex) => {
        const arcs = pieGenerator(spot.domainsInOrder.map(() => 1));

        arcs.forEach((arc, sliceIndex) => {
          const domain = spot.domainsInOrder[sliceIndex] ?? -1;
          visualContext.beginPath();
          visualContext.moveTo(spot.x, spot.y);
          visualContext.arc(spot.x, spot.y, spotRadius, arc.startAngle, arc.endAngle);
          visualContext.closePath();
          visualContext.fillStyle = domainColorMap[domain] ?? '#94A3B8';
          visualContext.fill();
        });

        const [r, g, b] = encodeSpotIndex(spotIndex);
        hitContext.beginPath();
        hitContext.arc(spot.x, spot.y, spotRadius, 0, Math.PI * 2);
        hitContext.closePath();
        hitContext.fillStyle = `rgb(${r}, ${g}, ${b})`;
        hitContext.fill();
      });
    });

    return () => {
      if (drawRafRef.current !== null) {
        cancelAnimationFrame(drawRafRef.current);
        drawRafRef.current = null;
      }
    };
  }, [domainColorMap, pieGenerator, size.height, size.width, spotRadius, spots]);

  useEffect(() => {
    return () => {
      if (hoverRafRef.current !== null) {
        cancelAnimationFrame(hoverRafRef.current);
      }
      if (drawRafRef.current !== null) {
        cancelAnimationFrame(drawRafRef.current);
      }
    };
  }, []);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = visualCanvasRef.current;
    const hitContext = hitContextRef.current;

    if (!canvas || !hitContext || spots.length === 0) {
      onHoveredSpotChange(null);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    pendingPointerRef.current = { x: localX, y: localY };

    if (hoverRafRef.current !== null) {
      return;
    }

    hoverRafRef.current = requestAnimationFrame(() => {
      hoverRafRef.current = null;

      const pendingPointer = pendingPointerRef.current;
      if (!pendingPointer) {
        return;
      }

      const dpr = dprRef.current;
      const pixelX = Math.max(0, Math.min(Math.floor(pendingPointer.x * dpr), hitContext.canvas.width - 1));
      const pixelY = Math.max(0, Math.min(Math.floor(pendingPointer.y * dpr), hitContext.canvas.height - 1));

      const lastPointerPixel = lastPointerPixelRef.current;
      if (lastPointerPixel && lastPointerPixel.x === pixelX && lastPointerPixel.y === pixelY) {
        return;
      }
      lastPointerPixelRef.current = { x: pixelX, y: pixelY };

      const pixel = hitContext.getImageData(pixelX, pixelY, 1, 1).data;
      const hoveredIndex = decodeSpotIndex(pixel[0], pixel[1], pixel[2]);

      if (hoveredIndex < 0 || hoveredIndex >= spots.length) {
        lastTooltipPositionRef.current = null;
        if (hoveredIndexRef.current !== -1) {
          hoveredIndexRef.current = -1;
          onHoveredSpotChange(null);
        }
        return;
      }

      const lastTooltipPosition = lastTooltipPositionRef.current;
      if (
        !lastTooltipPosition ||
        Math.abs(lastTooltipPosition.x - pendingPointer.x) >= 1 ||
        Math.abs(lastTooltipPosition.y - pendingPointer.y) >= 1
      ) {
        lastTooltipPositionRef.current = { x: pendingPointer.x, y: pendingPointer.y };
        onMousePositionChange({ x: pendingPointer.x, y: pendingPointer.y });
      }

      if (hoveredIndexRef.current !== hoveredIndex) {
        hoveredIndexRef.current = hoveredIndex;
        onHoveredSpotChange(spots[hoveredIndex]);
      }
    });
  };

  const handleMouseLeave = () => {
    pendingPointerRef.current = null;
    lastPointerPixelRef.current = null;
    lastTooltipPositionRef.current = null;

    if (hoverRafRef.current !== null) {
      cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = null;
    }

    hoveredIndexRef.current = -1;
    onHoveredSpotChange(null);
  };

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
      <canvas
        ref={visualCanvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      <canvas ref={hitCanvasRef} style={{ display: 'none' }} aria-hidden />
    </Box>
  );
};

export default OverlayDomainCanvas;
