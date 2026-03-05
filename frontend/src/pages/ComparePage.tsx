import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Container, Typography, Chip, Button, CircularProgress, Tabs, Tab } from '@mui/material';
import { GridView, Download as DownloadIcon, BarChart as BarChartIcon, TableChart as TableChartIcon, MapOutlined as MapIcon } from '@mui/icons-material';
import { useMultiJobResults } from '@/hooks/useMultiJobResults';
import { useCompareJobsParams } from '@/hooks/useCompareJobsParams';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useJobReordering } from '@/hooks/useJobReordering';
import CompareJobList from '@/components/visualization/CompareJobList';
import SpatialPlot from '@/components/visualization/SpatialPlot';
import MetricsTable from '@/components/visualization/MetricsTable';
import MetricsBarCharts from '@/components/visualization/MetricsBarCharts';
import SpatialConsensusVisualization from '@/components/visualization/SpatialConsensusVisualization';
import { exportComparisonMetrics, fetchConsensusData } from '@/services/experimentService';
import { toast } from 'sonner';

const ComparePage: React.FC = () => {
  const [, setSearchParams] = useSearchParams();
  const [isExportingMetrics, setIsExportingMetrics] = useState(false);
  const [activeTab, setActiveTab] = useState<'plots' | 'metrics' | 'consensus'>('plots');
  const [consensusData, setConsensusData] = useState<any>(null);
  const [consensusLoading, setConsensusLoading] = useState(false);
  const [consensusError, setConsensusError] = useState<string | null>(null);

  // Parse and validate URL params
  const { jobIds, tokens, isValid } = useCompareJobsParams();

  // Drag and drop functionality
  const { isDragging, isDragOver, handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd } =
    useDragAndDrop();

  // Job reordering and removal
  const { handleReorderJobs, handleRemoveJob } = useJobReordering({ jobIds, tokens, setSearchParams });

  // Fetch results for all completed jobs
  const jobResults = useMultiJobResults(jobIds, tokens);

  const comparisonPayload = useMemo(() => {
    if (jobIds.length < 2) {
      return '';
    }

    const payload = { jobs: jobIds, tokens };
    const jsonStr = JSON.stringify(payload);
    const b64 = btoa(jsonStr);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }, [jobIds, tokens]);

  // Fetch consensus data from backend
  useEffect(() => {
    if (!comparisonPayload) {
      setConsensusData(null);
      return;
    }

    const loadConsensusData = async () => {
      setConsensusLoading(true);
      setConsensusError(null);
      try {
        const data = await fetchConsensusData(comparisonPayload);
        setConsensusData(data);
      } catch (error) {
        console.error('Error fetching consensus data:', error);
        setConsensusError(error instanceof Error ? error.message : 'Unknown error');
        setConsensusData(null);
      } finally {
        setConsensusLoading(false);
      }
    };

    loadConsensusData();
  }, [comparisonPayload]);

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



  const handleDownloadMetrics = useCallback(async () => {
    if (jobIds.length < 2 || !comparisonPayload) {
      toast.error('At least 2 experiments required');
      return;
    }

    setIsExportingMetrics(true);
    try {
      // Encode the payload for backend
      const blob = await exportComparisonMetrics(comparisonPayload);

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
  }, [jobIds, comparisonPayload]);



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

        {/* Tabs */}
        <Box sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                minHeight: 48,
              },
            }}
          >
            <Tab
              label="Plots"
              value="plots"
              icon={<BarChartIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
            />
            <Tab
              label="Metrics"
              value="metrics"
              icon={<TableChartIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
            />
            <Tab
              label="Consensus"
              value="consensus"
              icon={<MapIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
            />
          </Tabs>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel */}
        <CompareJobList jobs={comparisonJobs} jobIds={jobIds} tokens={tokens} onRemoveJob={handleRemoveJob} />

        {/* Right Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {/* Plots Tab */}
          {activeTab === 'plots' && (
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
                {jobsWithResults.map((job) => {
                  const dragging = isDragging(job.id);
                  const dragOver = isDragOver(job.id);

                  return (
                    <Box
                      key={job.id}
                      draggable
                      onDragStart={() => handleDragStart(job.id)}
                      onDragOver={(e) => handleDragOver(e, job.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, job.id, handleReorderJobs)}
                      onDragEnd={handleDragEnd}
                      sx={{
                        cursor: 'grab',
                        opacity: dragging ? 0.5 : 1,
                        transform: dragOver && !dragging ? 'scale(0.98)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                        border: dragOver && !dragging ? '2px dashed' : '2px solid transparent',
                        borderColor: dragOver && !dragging ? 'primary.main' : 'transparent',
                        borderRadius: 2,
                        p: dragOver && !dragging ? 1 : 0,
                        '&:active': {
                          cursor: 'grabbing',
                        },
                        '&:hover': {
                          boxShadow: dragging ? 'none' : 2,
                        },
                      }}
                    >
                      <SpatialPlot
                        result={job.result}
                        metrics={job.metrics}
                        title={job.result?.toolName}
                        height={400}
                        showLegend={false}
                        compact
                      />
                    </Box>
                  );
                })}
              </Box>
            )}
            </Box>
          )}

          {/* Metrics Tab */}
          {activeTab === 'metrics' && (
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
                    Loading Metrics
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    Fetching comparison metrics...
                  </Typography>
                </Box>
              ) : (
                <>
                  <MetricsTable jobs={jobsWithResults} jobIds={jobIds} />
                  <MetricsBarCharts
                    metrics={jobsWithResults}
                    jobIds={jobIds}
                    comparisonPayload={comparisonPayload}
                    onDownloadAll={handleDownloadMetrics}
                  />
                </>
              )}
            </Box>
          )}

          {/* Consensus Tab */}
          {activeTab === 'consensus' && (
            <Box sx={{ p: 4, flex: 1, overflow: 'auto' }}>
              {consensusError && (
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'error.light',
                    borderRadius: 1,
                    mb: 2,
                    color: 'error.main',
                  }}
                >
                  <Typography variant="body2">Error: {consensusError}</Typography>
                </Box>
              )}
              {consensusLoading ? (
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
                    Loading Consensus
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    Building consensus predictions...
                  </Typography>
                </Box>
              ) : consensusData ? (
                <SpatialConsensusVisualization
                  data={consensusData}
                  isLoading={consensusLoading}
                />
              ) : (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    No consensus data available
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ComparePage;
