import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SetURLSearchParams } from 'react-router-dom';

interface UseJobReorderingParams {
  jobIds: string[];
  tokens: string[];
  setSearchParams: SetURLSearchParams;
}

interface UseJobReorderingReturn {
  handleReorderJobs: (draggedJobId: string, dropJobId: string) => void;
  handleRemoveJob: (jobId: string) => void;
}

/**
 * Custom hook for managing job reordering and removal in comparison view
 * Handles URL parameter updates and navigation
 */
export function useJobReordering({
  jobIds,
  tokens,
  setSearchParams,
}: UseJobReorderingParams): UseJobReorderingReturn {
  const navigate = useNavigate();

  const handleReorderJobs = useCallback(
    (draggedJobId: string, dropJobId: string) => {
      // Find the actual indices in the full jobIds array
      const draggedIndex = jobIds.indexOf(draggedJobId);
      const dropIndex = jobIds.indexOf(dropJobId);

      if (draggedIndex === -1 || dropIndex === -1) {
        return;
      }

      // Reorder the jobs in the full arrays
      const newJobs = [...jobIds];
      const newTokens = [...tokens];

      const [draggedJob] = newJobs.splice(draggedIndex, 1);
      const [draggedToken] = newTokens.splice(draggedIndex, 1);

      newJobs.splice(dropIndex, 0, draggedJob);
      newTokens.splice(dropIndex, 0, draggedToken);

      // Update URL params with new order
      setSearchParams({
        jobs: newJobs.join(','),
        tokens: newTokens.join(','),
      });
    },
    [jobIds, tokens, setSearchParams]
  );

  const handleRemoveJob = useCallback(
    (jobId: string) => {
      const newJobs = jobIds.filter((id) => id !== jobId);
      const newTokens = tokens.filter((_, index) => jobIds[index] !== jobId);

      if (newJobs.length < 2) {
        // Redirect to remaining job focus page
        navigate(`/experiment/${newJobs[0]}?t=${newTokens[0]}`);
      } else {
        // Update URL
        const newJobsParam = newJobs.join(',');
        const newTokensParam = newTokens.join(',');
        setSearchParams({ jobs: newJobsParam, tokens: newTokensParam });
      }
    },
    [jobIds, tokens, navigate, setSearchParams]
  );

  return {
    handleReorderJobs,
    handleRemoveJob,
  };
}
