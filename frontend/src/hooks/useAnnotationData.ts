import { useEffect, useState } from 'react';

import { fetchAnnotationData } from '@/services/annotationService';
import {
  AnnotationDataResponse,
  AnnotationSpatialSpot,
  SpatialImageMetadata,
} from '@/types/annotationPlayground';
import { getFallbackSpotColor } from '@/utils/annotationColors';

const DEFAULT_NORMALIZED_SPOT_RADIUS = 6;

function normalizeSpots(payload: AnnotationDataResponse): AnnotationSpatialSpot[] {
  const fallbackColor = getFallbackSpotColor();

  return payload.spots.map((spot, index) => {
    const spotIdCandidate = spot.spot_id ?? spot.id ?? spot.barcode ?? index;
    const originalColor = spot.color ?? spot.rgb ?? fallbackColor;

    return {
      spotId: String(spotIdCandidate),
      barcode: spot.barcode ?? String(spotIdCandidate),
      x: spot.x,
      y: spot.y,
      originalColor,
      radius: DEFAULT_NORMALIZED_SPOT_RADIUS,
    };
  });
}

function normalizeImage(payload: AnnotationDataResponse): SpatialImageMetadata | null {
  if (!payload.image_url || !payload.image_bounds) {
    return null;
  }

  return {
    url: payload.image_url,
    bounds: payload.image_bounds,
  };
}

export function useAnnotationData() {
  const [spots, setSpots] = useState<AnnotationSpatialSpot[]>([]);
  const [coordinateBuffer, setCoordinateBuffer] = useState<Float32Array>(new Float32Array(0));
  const [imageMetadata, setImageMetadata] = useState<SpatialImageMetadata | null>(null);
  const [annotationBuffer, setAnnotationBuffer] = useState<Uint8Array>(new Uint8Array(0));
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchAnnotationData();
        if (!mounted) {
          return;
        }

        const normalizedSpots = normalizeSpots(payload);
        const nextPositions = new Float32Array(normalizedSpots.length * 2);
        for (let i = 0; i < normalizedSpots.length; i += 1) {
          const spot = normalizedSpots[i];
          nextPositions[i * 2] = spot.x;
          nextPositions[i * 2 + 1] = spot.y;
        }

        setSpots(normalizedSpots);
        setCoordinateBuffer(nextPositions);
        setImageMetadata(normalizeImage(payload));
        setAnnotationBuffer(new Uint8Array(normalizedSpots.length));
      } catch (err) {
        if (!mounted) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Failed to load annotation data';
        setError(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    spots,
    coordinateBuffer,
    imageMetadata,
    annotationBuffer,
    setAnnotationBuffer,
    loading,
    error,
  };
}
