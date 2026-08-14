import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Container, Typography, Chip, Button, CircularProgress, Tabs, Tab, Tooltip } from '@mui/material';
import {
  GridView,
  BarChart as BarChartIcon,
  TableChart as TableChartIcon,
  MapOutlined as MapIcon,
  CompareArrows as CompareArrowsIcon,
  DonutSmall as DonutSmallIcon,
} from '@mui/icons-material';
import { Link2, Check } from 'lucide-react';
import { useMultiExperimentBestRuns } from '@/hooks/useMultiExperimentBestRuns';
import { useCompareJobsParams } from '@/hooks/useCompareJobsParams';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useJobReordering } from '@/hooks/useJobReordering';
import CompareExperimentList from '@/components/visualization/CompareExperimentList';
import SpatialPlot from '@/components/visualization/SpatialPlot';
import MetricsTab from '@/components/visualization/metrics/MetricsTab';
import SpatialConsensusVisualization from '@/components/visualization/SpatialConsensusVisualization';
import DomainComparisonTab from '@/components/visualization/domainComparison/DomainComparisonTab';
import OverlayDomainTab from '@/components/compare/overlayDomain/OverlayDomainTab';
import { downloadCompareMetricBoxplots, fetchConsensusData } from '@/services/experimentService';
import { ComparisonDatasetProvider, useComparisonDataset } from '@/context/ComparisonDatasetContext';
import { toast } from 'sonner';

const ComparePageContent: React.FC = () => {
  const [, setSearchParams] = useSearchParams();
  const [isExportingMetrics, setIsExportingMetrics] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'plots' | 'metrics' | 'consensus' | 'domain-comparison' | 'overlay-domain-map'
  >('plots');
  const [consensusData, setConsensusData] = useState<any>(null);
  const [consensusLoading, setConsensusLoading] = useState(false);
  const [consensusError, setConsensusError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const ta = document.createElement('textarea');
        ta.value = window.location.href;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  }, []);

  // Get dataset context
  const { selectedDataset } = useComparisonDataset();

  // Parse and validate URL params
  const { jobIds: experimentIds, tokens, isValid } = useCompareJobsParams();

  // Drag and drop functionality
  const { isDragging, isDragOver, handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd } =
    useDragAndDrop();

  // Job reordering and removal
  const { handleReorderJobs, handleRemoveJob: handleRemoveExperiment } = useJobReordering({ jobIds: experimentIds, tokens, setSearchParams });

  // Fetch best-run results and all metrics for experiments
  const { bestRunState, metricsState } = useMultiExperimentBestRuns(experimentIds, tokens, selectedDataset);

  const consensusExperiments = useMemo(() => {
    if (experimentIds.length < 2) {
      return [];
    }

    return experimentIds
      .map((experimentId, index) => ({
        experiment_id: experimentId,
        token: tokens[index],
      }))
      .filter((item) => item.token);
  }, [experimentIds, tokens]);

  // Fetch consensus data from backend
  useEffect(() => {
    if (consensusExperiments.length < 2 || !selectedDataset) {
      setConsensusData(null);
      return;
    }

    const loadConsensusData = async () => {
      setConsensusLoading(true);
      setConsensusError(null);
      try {
        const data = await fetchConsensusData(consensusExperiments, selectedDataset);
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
  }, [consensusExperiments, selectedDataset]);

  const handleDownloadMetrics = useCallback(async () => {
    if (experimentIds.length < 2) {
      toast.error('At least 2 experiments required');
      return;
    }

    const experiments = experimentIds
      .map((experimentId, index) => ({
        experiment_id: experimentId,
        token: tokens[index],
      }))
      .filter((item) => item.token);

    if (experiments.length < 2) {
      toast.error('Missing access tokens for selected experiments');
      return;
    }

    setIsExportingMetrics(true);
    try {
      // const blob = await exportComparisonMetrics(comparisonPayload);
      const blob = await downloadCompareMetricBoxplots(experiments);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'metric_boxplots.zip';
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
  }, [experimentIds, tokens]);

  // Build experiment list for comparison sidebar
  const comparisonExperiments = experimentIds.map((expId, index) => ({
    id: expId,
    token: tokens[index],
    result: bestRunState[expId]?.result || null,
    metrics: bestRunState[expId]?.metrics || null,
    isLoading: bestRunState[expId]?.isLoading || false,
    error: bestRunState[expId]?.error || null,
    errorCode: bestRunState[expId]?.errorCode,
  }));

  // Filter experiments with results for plot display
  const experimentsWithResults = comparisonExperiments.filter((exp) => exp.result);

  // Calculate grid columns based on number of experiments
  const gridCols = experimentsWithResults.length <= 2 ? experimentsWithResults.length : 2;

  // Prepare metrics data for MetricsTable and MetricsBarCharts
  const experimentMetricsData = experimentIds.map((expId, index) => ({
    experimentId: expId,
    toolName: bestRunState[expId]?.result?.toolName || `Experiment ${index + 1}`,
    totalRuns: bestRunState[expId]?.totalRuns || 0,
    metricsData: metricsState[expId]?.metricsData || null,
  }));

  const toolSelections = useMemo(
    () =>
      experimentIds.map((expId, index) => ({
        experiment_id: expId,
        token: tokens[index],
        tool_name: bestRunState[expId]?.result?.toolName || `Experiment ${index + 1}`,
      })),
    [experimentIds, tokens, bestRunState],
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0, minHeight: 40 }}>
            <GridView sx={{ fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
              Compare Experiments
            </Typography>
            <Chip
              label={`${experimentIds.length} experiments`}
              size="small"
              sx={{ bgcolor: 'primary.light', color: 'white', fontWeight: 600 }}
            />
          </Box>

          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              flex: 1,
              minHeight: 42,
              ml: { xs: 0, md: 5 },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.8125rem',
                minHeight: 42,
                px: 1.5,
              },
            }}
          >
            <Tab
              label="Plots"
              value="plots"
              icon={<BarChartIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
            />
            <Tab
              label="Metrics"
              value="metrics"
              icon={<TableChartIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
            />
            <Tab
              label="Consensus"
              value="consensus"
              icon={<MapIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
            />
            <Tab
              label="Domain Comparison"
              value="domain-comparison"
              icon={<CompareArrowsIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
            />
            <Tab
              label="Overlay Domain Map"
              value="overlay-domain-map"
              icon={<DonutSmallIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
            />
          </Tabs>

          <Box sx={{ flexShrink: 0, mt: 0.5 }}>
            <Tooltip title="Copy this URL to bookmark and access results later">
              <Button
                size="small"
                variant="outlined"
                startIcon={copied ? <Check size={16} /> : <Link2 size={16} />}
                onClick={copyLink}
                sx={{ py: 0.8, textTransform: 'none', fontWeight: 600 }}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel */}
        <CompareExperimentList experiments={comparisonExperiments} onRemoveExperiment={handleRemoveExperiment} />

        {/* Right Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {/* Plots Tab */}
          {activeTab === 'plots' && (
            <Box sx={{ p: 4, flex: 1, overflow: 'auto' }}>
              {experimentsWithResults.length === 0 ? (
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
                    Fetching best-run results...
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
                  {experimentsWithResults.map((exp) => {
                    const dragging = isDragging(exp.id);
                    const dragOver = isDragOver(exp.id);

                    return (
                      <Box
                        key={exp.id}
                        draggable
                        onDragStart={() => handleDragStart(exp.id)}
                        onDragOver={(e) => handleDragOver(e, exp.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, exp.id, handleReorderJobs)}
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
                        <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                            {exp.result?.toolName}
                          </Typography>
                          <SpatialPlot
                            result={exp.result}
                            metrics={exp.metrics}
                            title={exp.result?.toolName}
                            height={500}
                            showLegend={false}
                            compact
                          />
                        </Box>
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
              {experimentsWithResults.length === 0 ? (
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
                    Fetching metrics...
                  </Typography>
                </Box>
              ) : (
                <MetricsTab
                  experimentMetrics={experimentMetricsData}
                  experimentIds={experimentIds}
                  onDownloadAll={handleDownloadMetrics}
                  isExporting={isExportingMetrics}
                />
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

          {/* Domain Comparison Tab */}
          {activeTab === 'domain-comparison' && (
            <Box sx={{ p: 4, flex: 1, overflow: 'auto' }}>
              <DomainComparisonTab tools={toolSelections} />
            </Box>
          )}

          {/* Overlay Domain Map Tab */}
          {activeTab === 'overlay-domain-map' && (
            <Box sx={{ p: 4, flex: 1, overflow: 'auto' }}>
              <OverlayDomainTab tools={toolSelections} />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Wrapper component that provides the ComparisonDatasetProvider context
 */
const ComparePage: React.FC = () => {
  const { jobIds: experimentIds, tokens } = useCompareJobsParams();

  if (experimentIds.length < 2) {
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

  const experiments = experimentIds.map((expId, index) => ({
    experiment_id: expId,
    token: tokens[index],
  }));

  return (
    <ComparisonDatasetProvider experiments={experiments}>
      <ComparePageContent />
    </ComparisonDatasetProvider>
  );
};

export default ComparePage;
