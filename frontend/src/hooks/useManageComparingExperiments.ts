import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SetURLSearchParams } from 'react-router-dom';

interface useManageComparingExperimentsParams {
  experimentIds: string[];
  tokens: string[];
  setSearchParams: SetURLSearchParams;
}

interface useManageComparingExperimentsReturn {
  handleReorderExperiment: (draggedExpId: string, dropExpId: string) => void;
  handleRemoveExperiment: (experimentId: string) => void;
}

/**
 * Custom hook for managing experiment reordering and removal in comparison view
 * Handles URL parameter updates and navigation
 */
export function useManageComparingExperiments({
  experimentIds,
  tokens,
  setSearchParams,
}: useManageComparingExperimentsParams): useManageComparingExperimentsReturn {
  const navigate = useNavigate();

  const handleReorderExperiment = useCallback(
    (draggedExpId: string, dropExpId: string) => {
      const draggedIndex = experimentIds.indexOf(draggedExpId);
      const dropIndex = experimentIds.indexOf(dropExpId);

      if (draggedIndex === -1 || dropIndex === -1) {
        return;
      }

      // Reorder the jobs in the full arrays
      const newExperiments = [...experimentIds];
      const newTokens = [...tokens];

      const [draggedExperiment] = newExperiments.splice(draggedIndex, 1);
      const [draggedToken] = newTokens.splice(draggedIndex, 1);

      newExperiments.splice(dropIndex, 0, draggedExperiment);
      newTokens.splice(dropIndex, 0, draggedToken);

      // Update URL params with new order
      setSearchParams({
        jobs: newExperiments.join(','),
        tokens: newTokens.join(','),
      });
    },
    [experimentIds, tokens, setSearchParams]
  );

  const handleRemoveExperiment = useCallback(
    (experimentId: string) => {
      const newExperiments = experimentIds.filter((id) => id !== experimentId);
      const newTokens = tokens.filter((_, index) => experimentIds[index] !== experimentId);

      if (newExperiments.length < 2) {
        // Redirect to remaining experiment focus page
        navigate(`/experiment/${newExperiments[0]}?t=${newTokens[0]}`);
      } else {
        // Update URL
        const newExperimentsParam = newExperiments.join(',');
        const newTokensParam = newTokens.join(',');
        setSearchParams({ jobs: newExperimentsParam, tokens: newTokensParam });
      }
    },
    [experimentIds, tokens, navigate, setSearchParams]
  );

  return {
    handleReorderExperiment,
    handleRemoveExperiment,
  };
}
