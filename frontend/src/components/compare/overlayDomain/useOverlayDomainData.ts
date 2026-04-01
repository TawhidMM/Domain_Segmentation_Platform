import { useEffect, useMemo, useState } from 'react';
import {
  fetchOverlayDomainMapData,
  OverlayDomainMapResponse,
  OverlayDomainMapSpot,
} from '@/services/experimentService';
import { normalizeSpotDomains } from './PieLayerUtils';

export interface OverlayDomainToolSelection {
  experiment_id: string;
  token: string;
  tool_name: string;
}

export interface OverlayDomainExperiment {
  experimentId: string;
  experimentName: string;
}

export interface OverlayDomainSpot {
  spotId: string;
  x: number;
  y: number;
  domainsByExperiment: Record<string, number>;
  domainsInOrder: number[];
  packedDomains: number[];
  sliceCount: number;
}

interface UseOverlayDomainDataResult {
  loading: boolean;
  error: string | null;
  spots: OverlayDomainSpot[];
  domainIds: number[];
  domainColorMap: Record<number, string>;
  orderedExperiments: OverlayDomainExperiment[];
}

const DOMAIN_PALETTE = [
  '#0F766E',
  '#2563EB',
  '#F97316',
  '#DC2626',
  '#059669',
  '#7C3AED',
  '#CA8A04',
  '#DB2777',
  '#0891B2',
  '#65A30D',
  '#B45309',
  '#4338CA',
  '#1D4ED8',
  '#BE123C',
];

function normalizeSpots(
  apiSpots: OverlayDomainMapSpot[],
  orderedExperiments: OverlayDomainExperiment[],
): OverlayDomainSpot[] {
  const spots = apiSpots.map((spot) => {
    const domainsByExperiment = spot.domains ?? {};

    return {
      spotId: spot.spot_id,
      x: spot.x,
      y: spot.y,
      domainsByExperiment,
      domainsInOrder: orderedExperiments.map((experiment) => domainsByExperiment[experiment.experimentId] ?? -1),
    };
  });

  return normalizeSpotDomains(spots).map((spot) => ({
    ...spot,
    packedDomains: [...spot.domainsInOrder],
  }));
}

function extractDomainIds(spots: OverlayDomainSpot[]): number[] {
  const domainSet = new Set<number>();

  spots.forEach((spot) => {
    spot.domainsInOrder.forEach((domain) => {
      if (domain >= 0) {
        domainSet.add(domain);
      }
    });
  });

  return Array.from(domainSet).sort((a, b) => a - b);
}

function buildDomainColorMap(domainIds: number[]): Record<number, string> {
  return domainIds.reduce<Record<number, string>>((colorMap, domainId, index) => {
    colorMap[domainId] = DOMAIN_PALETTE[index % DOMAIN_PALETTE.length];
    return colorMap;
  }, {});
}

function buildExperimentOrder(
  tools: OverlayDomainToolSelection[],
  response: OverlayDomainMapResponse,
): OverlayDomainExperiment[] {
  return tools.map((tool, index) => ({
    experimentId: tool.experiment_id,
    experimentName: tool.tool_name || response.tools[index] || `Experiment ${index + 1}`,
  }));
}

export function useOverlayDomainData(tools: OverlayDomainToolSelection[], selectedDataset?: string | null): UseOverlayDomainDataResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spots, setSpots] = useState<OverlayDomainSpot[]>([]);
  const [orderedExperiments, setOrderedExperiments] = useState<OverlayDomainExperiment[]>([]);

  useEffect(() => {
    if (tools.length < 2 || !selectedDataset) {
      setLoading(false);
      setError(null);
      setSpots([]);
      setOrderedExperiments([]);
      return;
    }

    let isActive = true;

    const loadOverlayDomainData = async () => {
      setLoading(true);
      setError(null);

      try {
        const requestPayload = tools.map((tool) => ({
          experiment_id: tool.experiment_id,
          token: tool.token,
        }));

        const response = await fetchOverlayDomainMapData(requestPayload, selectedDataset);

        if (!isActive) {
          return;
        }

        const experimentOrder = buildExperimentOrder(tools, response);
        const normalizedSpots = normalizeSpots(response.spots, experimentOrder);

        setOrderedExperiments(experimentOrder);
        setSpots(normalizedSpots);
      } catch (err) {
        if (!isActive) {
          return;
        }

        setSpots([]);
        setOrderedExperiments([]);
        setError(err instanceof Error ? err.message : 'Failed to load overlay domain map.');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadOverlayDomainData();

    return () => {
      isActive = false;
    };
  }, [tools, selectedDataset]);

  const domainIds = useMemo(() => extractDomainIds(spots), [spots]);
  const domainColorMap = useMemo(() => buildDomainColorMap(domainIds), [domainIds]);

  return {
    loading,
    error,
    spots,
    domainIds,
    domainColorMap,
    orderedExperiments,
  };
}
