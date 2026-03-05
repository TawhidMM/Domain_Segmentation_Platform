import { useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface CompareJobsParams {
  jobIds: string[];
  tokens: string[];
  isValid: boolean;
}

/**
 * Custom hook for parsing and validating compare jobs URL parameters
 * Handles automatic redirection for invalid states
 */
export function useCompareJobsParams(): CompareJobsParams {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const jobsParam = searchParams.get('jobs');
  const tokensParam = searchParams.get('tokens');

  const { jobIds, tokens, isValid } = useMemo(() => {
    if (!jobsParam || !tokensParam) {
      return { jobIds: [], tokens: [], isValid: false };
    }

    const jobs = jobsParam.split(',').filter(Boolean);
    const toks = tokensParam.split(',').filter(Boolean);

    const valid = jobs.length === toks.length && jobs.length >= 2;

    return { jobIds: jobs, tokens: toks, isValid: valid };
  }, [jobsParam, tokensParam]);

  // Redirect if invalid or < 2 jobs
  useEffect(() => {
    if (!isValid) {
      if (jobIds.length === 1) {
        // Redirect to single job focus page
        navigate(`/experiment/${jobIds[0]}?t=${tokens[0]}`);
      } else {
        // Redirect to home
        navigate('/');
      }
    }
  }, [isValid, jobIds, tokens, navigate]);

  return { jobIds, tokens, isValid };
}
