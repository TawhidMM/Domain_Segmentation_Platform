import React, { useMemo, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Chip, Paper, Alert, Button, CircularProgress, Stack } from '@mui/material';
import { GridView, Download as DownloadIcon } from '@mui/icons-material';
import { useMultiJobResults } from '@/hooks/useMultiJobResults';
import CompareJobList from '@/components/visualization/CompareJobList';
import SpatialPlot from '@/components/visualization/SpatialPlot';
import { exportComparisonMetrics } from '@/services/experimentService';
import { toast } from 'sonner';

const ComparePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isExportingMetrics, setIsExportingMetrics] = useState(false);

  // Parse URL params
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

  // Fetch results for all completed jobs
  const jobResults = useMultiJobResults(jobIds, tokens);

  // If invalid or < 2 jobs, redirect
  React.useEffect(() => {
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

  if (!isValid) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Redirecting...
          </Typography>
        </Box>
      </Container>
    );
  }

  const handleRemoveJob = (jobId: string) => {
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
  };

  const handleDownloadMetrics = useCallback(async () => {
    if (jobIds.length < 2) {
      toast.error('At least 2 experiments required');
      return;
    }

    setIsExportingMetrics(true);
    try {
      // Encode the payload for backend
      const payload = { jobs: jobIds, tokens };
      const jsonStr = JSON.stringify(payload);
      const b64 = btoa(jsonStr); // standard base64
      const urlSafe = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); // URL-safe
      
      const blob = await exportComparisonMetrics(urlSafe);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'comparison_metrics_export.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Metrics exported successfully!');
    } catch (error) {
      console.error('Failed to export metrics:', error);
      toast.error('Failed to export metrics. Please try again.');
    } finally {
      setIsExportingMetrics(false);
    }
  }, [jobIds, tokens]);

  // Build job list for comparison
  const comparisonJobs = jobIds.map((jobId, index) => ({
    id: jobId,
    token: tokens[index],
    result: jobResults[jobId]?.result || null,
    metrics: jobResults[jobId]?.metrics || null,
    isLoading: jobResults[jobId]?.isLoading || false,
    error: jobResults[jobId]?.error || null,
    errorCode: jobResults[jobId]?.errorCode,
  }));

  // Filter jobs with results for grid display
  const jobsWithResults = comparisonJobs.filter((job) => job.result);

  // Calculate grid columns
  const gridCols = jobsWithResults.length <= 2 ? jobsWithResults.length : 2;

  return (
    <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          px: 4,
          py: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GridView sx={{ fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Compare Experiments
            </Typography>
            <Chip
              label={`${jobIds.length} experiments`}
              size="small"
              sx={{ bgcolor: 'primary.light', color: 'white', fontWeight: 600 }}
            />
          </Box>

          {/* Download Metrics Button */}
          {jobIds.length >= 2 && (
            <Button
              startIcon={<DownloadIcon />}
              variant="outlined"
              onClick={handleDownloadMetrics}
              disabled={isExportingMetrics}
              sx={{ textTransform: 'none' }}
            >
              {isExportingMetrics ? 'Exporting...' : 'Download Metrics'}
            </Button>
          )}
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Compare {jobIds.length} jobs side by side
        </Typography>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel */}
        <CompareJobList jobs={comparisonJobs} jobIds={jobIds} tokens={tokens} onRemoveJob={handleRemoveJob} />

        {/* Right Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {/* Grid Content */}
          <Box sx={{ p: 4, flex: 1, overflow: 'auto' }}>
            {jobsWithResults.length === 0 ? (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                  Loading Results
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                  Fetching comparison results...
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                  gap: 3,
                }}
              >
                {jobsWithResults.map((job) => (
                  <Box key={job.id}>
                    <SpatialPlot
                      result={job.result}
                      metrics={job.metrics}
                      title={`Job ${jobIds.indexOf(job.id) + 1}`}
                      height={400}
                      showLegend={false}
                      compact
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ComparePage;
