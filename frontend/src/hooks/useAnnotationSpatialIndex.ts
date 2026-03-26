import { useMemo } from 'react';
import KDBush from 'kdbush';

import { AnnotationSpatialSpot } from '@/types/annotationPlayground';

export interface AnnotationSpatialIndex {
  kdTree: KDBush | null;
  indexToSpotId: string[];
}

export function useAnnotationSpatialIndex(spots: AnnotationSpatialSpot[]): AnnotationSpatialIndex {
  return useMemo(() => {
    if (spots.length === 0) {
      return {
        kdTree: null,
        indexToSpotId: [],
      };
    }

    const kdTree = new KDBush(spots.length);
    const indexToSpotId: string[] = [];

    for (let idx = 0; idx < spots.length; idx += 1) {
      const spot = spots[idx];
      kdTree.add(spot.x, spot.y);
      indexToSpotId.push(spot.spotId);
    }

    kdTree.finish();

    return {
      kdTree,
      indexToSpotId,
    };
  }, [spots]);
}
