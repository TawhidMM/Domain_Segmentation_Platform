import React, { useCallback, useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Alert,
  Divider,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Copy, CheckCircle, AlertCircle, Clock, Zap, Plus, Check, RotateCw, FlipHorizontal, FlipVertical, Download as DownloadIcon } from 'lucide-react';
import { useComparisonBasket } from '@/hooks/useComparisonBasket';
import FloatingCompareBar from '@/components/visualization/FloatingCompareBar';
import SpatialPlot from '@/components/visualization/SpatialPlot';
import { DatasetExplorer } from '@/components/experiment';
import { exportExperiment, exportExperimentUmap, fetchExperimentDetails, fetchRunStatus, fetchExperimentResult, fetchExperimentMetrics } from '@/services/experimentService';
import { toast } from 'sonner';
import { ExperimentDetails, ExperimentResult, ExperimentMetrics } from '@/types';

const FocusPage: React.FC = () => {
  const { experimentId } = useParams<{ experimentId: string }>();
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get('t');
  const { addJob, removeJob, isJobInBasket } = useComparisonBasket();
  const [rotation, setRotation] = useState(0);
  const [mirrorX, setMirrorX] = useState(false);
  const [mirrorY, setMirrorY] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingUmap, setIsExportingUmap] = useState(false);

  // Experiment and run state
  const [experimentData, setExperimentData] = useState<ExperimentDetails | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());
  
  // Run data state (replaces useJobTracking)
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<ExperimentResult | null>(null);
  const [metrics, setMetrics] = useState<ExperimentMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | undefined>(undefined);

  const isInBasket = selectedRunId && isJobInBasket(selectedRunId);

  // Load experiment structure on mount
  useEffect(() => {
    const loadExperiment = async () => {
      if (!experimentId || !accessToken) {
        setError('Missing experiment ID or access token');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await fetchExperimentDetails(experimentId, accessToken);
        setExperimentData(data);

        // Auto-select first run of first dataset
        if (data.datasets?.length > 0) {
          const firstDataset = data.datasets[0];
          if (firstDataset.runs?.length > 0) {
            setSelectedRunId(firstDataset.runs[0].run_id);
            setExpandedDatasets(new Set([firstDataset.dataset_id]));
          }
        }
      } catch (err: any) {
        const code = err.response?.status;
        setErrorCode(code);
        setError(code === 403 ? 'Unauthorized access' : code === 404 ? 'Experiment not found' : 'Failed to load experiment');
      } finally {
        setIsLoading(false);
      }
    };

    loadExperiment();
  }, [experimentId, accessToken]);

  // Load run data when selected run changes
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;

    const loadRunData = async () => {
      if (!selectedRunId || !accessToken) return;

      try {
        // Fetch run status
        const runStatus = await fetchRunStatus(selectedRunId, accessToken);
        setStatus(runStatus.status);

        // If finished, fetch results and metrics
        if (runStatus.status === 'finished') {
          const [resultData, metricsData] = await Promise.all([
            fetchExperimentResult(selectedRunId, accessToken),
            fetchExperimentMetrics(selectedRunId, accessToken).catch(() => null),
          ]);
          setResult(resultData);
          setMetrics(metricsData);
          setIsPolling(false);
        } else if (runStatus.status === 'queued' || runStatus.status === 'running') {
          // Start polling
          setIsPolling(true);
          pollingInterval = setInterval(async () => {
            try {
              const updatedStatus = await fetchRunStatus(selectedRunId, accessToken);
              setStatus(updatedStatus.status);

              if (updatedStatus.status === 'finished') {
                const [resultData, metricsData] = await Promise.all([
                  fetchExperimentResult(selectedRunId, accessToken),
                  fetchExperimentMetrics(selectedRunId, accessToken).catch(() => null),
                ]);
                setResult(resultData);
                setMetrics(metricsData);
                setIsPolling(false);
                if (pollingInterval) clearInterval(pollingInterval);
              } else if (updatedStatus.status === 'failed') {
                setIsPolling(false);
                if (pollingInterval) clearInterval(pollingInterval);
              }
            } catch (err) {
              console.error('Polling error:', err);
            }
          }, 5000);
        }
      } catch (err: any) {
        const code = err.response?.status;
        setErrorCode(code);
        setError('Failed to load run data');
        toast.error('Failed to load run data');
      }
    };

    loadRunData();

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [selectedRunId, accessToken]);

  const handleRunSelect = (runId: string) => {
    setSelectedRunId(runId);
    setResult(null);
    setMetrics(null);
    setStatus(null);
  };

  const handleDatasetToggle = (datasetId: string) => {
    setExpandedDatasets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(datasetId)) {
        newSet.delete(datasetId);
      } else {
        newSet.add(datasetId);
      }
      return newSet;
    });
  };

  const copyLink = useCallback(() => {
    const fullUrl = window.location.href;
    navigator.clipboard.writeText(fullUrl).then(() => {
      toast.success('Link copied to clipboard!');
    });
  }, []);

  const handleAddToCompare = useCallback(() => {
    if (!selectedRunId || !accessToken) return;

    if (isInBasket) {
      removeJob(selectedRunId);
      toast.success('Removed from comparison');
    } else {
      addJob(selectedRunId, accessToken);
      toast.success('Added to comparison');
    }
  }, [selectedRunId, accessToken, isInBasket, addJob, removeJob]);

  const handleDownloadSVG = useCallback(async () => {
    if (!selectedRunId || !accessToken) return;

    setIsExporting(true);
    try {
      const blob = await exportExperiment(selectedRunId, 'svg', accessToken);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `run_${selectedRunId}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('SVG exported successfully!');
    } catch (error) {
      console.error('Failed to export SVG:', error);
      toast.error('Failed to export SVG. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [selectedRunId, accessToken]);

  const handleDownloadUmap = useCallback(async () => {
    if (!selectedRunId || !accessToken) return;

    setIsExportingUmap(true);
    try {
      const blob = await exportExperimentUmap(selectedRunId, accessToken);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `run_${selectedRunId}_umap.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('UMAP exported successfully!');
    } catch (error) {
      console.error('Failed to export UMAP:', error);
      toast.error('Failed to export UMAP. Please try again.');
    } finally {
      setIsExportingUmap(false);
    }
  }, [selectedRunId, accessToken]);

  const getStatusColor = (stat: string | null): 'warning' | 'info' | 'success' | 'error' | 'default' => {
    switch (stat) {
      case 'queued':
        return 'warning';
      case 'running':
        return 'info';
      case 'finished':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (stat: string | null): React.ReactElement | null => {
    switch (stat) {
      case 'queued':
        return <Clock size={16} />;
      case 'running':
        return <Zap size={16} />;
      case 'finished':
        return <CheckCircle size={16} />;
      case 'failed':
        return <AlertCircle size={16} />;
      default:
        return null;
    }
  };

  // Invalid access link
  if (!accessToken || !experimentId) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: '#EF4444', marginBottom: 16 }} />
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Invalid Access Link
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            The job access link is missing required parameters. Please check the URL and try again.
          </Typography>
          <Button variant="contained" href="/">
            Return to Home
          </Button>
        </Paper>
      </Container>
    );
  }

  // Error states
  if (error && errorCode) {
    if (errorCode === 403) {
      return (
        <Container maxWidth="sm" sx={{ py: 6 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <AlertCircle size={48} style={{ color: '#EF4444', marginBottom: 16 }} />
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Unauthorized Access
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              You don't have permission to access this job. The access token may be invalid or expired.
            </Typography>
            <Button variant="contained" href="/">
              Return to Home
            </Button>
          </Paper>
        </Container>
      );
    }

    if (errorCode === 404) {
      return (
        <Container maxWidth="sm" sx={{ py: 6 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <AlertCircle size={48} style={{ color: '#EF4444', marginBottom: 16 }} />
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Job Not Found
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              The job you're looking for doesn't exist or has expired.
            </Typography>
            <Button variant="contained" href="/">
              Return to Home
            </Button>
          </Paper>
        </Container>
      );
    }

    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {error}
          </Typography>
        </Alert>
        <Button variant="contained" href="/">
          Return to Home
        </Button>
      </Container>
    );
  }

  // Loading state
  if (isLoading && !status) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Loading job status...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Left Sidebar - Dataset/Run Explorer */}
      <Box
        sx={{
          width: 320,
          borderRight: '1px solid',
          borderColor: 'divider',
          overflow: 'auto',
          backgroundColor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Experiment Runs
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Select a run to view results
          </Typography>
        </Box>
        {isLoading && !experimentData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress />
          </Box>
        ) : error && !experimentData ? (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : experimentData ? (
          <DatasetExplorer
            datasets={experimentData.datasets}
            selectedRunId={selectedRunId}
            expandedDatasets={expandedDatasets}
            onRunSelect={handleRunSelect}
            onDatasetToggle={handleDatasetToggle}
          />
        ) : null}
      </Box>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="lg" sx={{ py: 4, pb: 12, flex: 1 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Run Results
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              {selectedRunId ? (
                <>Viewing results for run <code>{selectedRunId.substring(0, 12)}...</code></>
              ) : (
                'Select a run from the sidebar to view results'
              )}
            </Typography>

        {/* Status Chip and Copy Link */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {status && getStatusIcon(status) && (
            <Chip
              icon={getStatusIcon(status) as React.ReactElement}
              label={status.charAt(0).toUpperCase() + status.slice(1)}
              color={getStatusColor(status) as any}
              variant="outlined"
            />
          )}

          {isPolling && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Polling for updates...
            </Typography>
          )}

          <Tooltip title="Copy job link">
            <Button
              startIcon={<Copy size={16} />}
              variant="outlined"
              size="small"
              onClick={copyLink}
            >
              Copy Link
            </Button>
          </Tooltip>

          {status === 'finished' && (
            <>
              <Tooltip title={isInBasket ? 'Remove from comparison' : 'Add to comparison'}>
                <Button
                  startIcon={isInBasket ? <Check size={16} /> : <Plus size={16} />}
                  variant={isInBasket ? 'contained' : 'outlined'}
                  size="small"
                  onClick={handleAddToCompare}
                  color={isInBasket ? 'success' : 'primary'}
                >
                  {isInBasket ? '✓ In Comparison' : '+ Add to Compare'}
                </Button>
              </Tooltip>

            </>
          )}
        </Box>

        {/* Share Instructions */}
        {status && (status === 'queued' || status === 'running') && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Job is processing...
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              You can share or bookmark the link above to check back on progress anytime. The link remains valid until
              the job completes.
            </Typography>
          </Alert>
        )}

        {status === 'finished' && (
          <Alert severity="success" sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Job completed successfully!
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Results are displayed below. You can bookmark this link to revisit results anytime.
            </Typography>
          </Alert>
        )}

        {status === 'failed' && (
          <Alert severity="error" sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Job failed to complete
            </Typography>
          </Alert>
        )}
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Results Section */}
      {status === 'finished' && result ? (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Results
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
              <Tooltip title="Rotate 90°">
                <IconButton size="small" onClick={() => setRotation((prev) => (prev + 90) % 360)}>
                  <RotateCw size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Mirror Horizontal">
                <IconButton
                  size="small"
                  onClick={() => setMirrorX((prev) => !prev)}
                  sx={{ color: mirrorX ? 'primary.main' : 'inherit' }}
                >
                  <FlipHorizontal size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Mirror Vertical">
                <IconButton
                  size="small"
                  onClick={() => setMirrorY((prev) => !prev)}
                  sx={{ color: mirrorY ? 'primary.main' : 'inherit' }}
                >
                  <FlipVertical size={18} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <SpatialPlot
            result={result}
            metrics={metrics}
            title="Spatial Domain Analysis"
            height={600}
            rotation={rotation}
            mirrorX={mirrorX}
            mirrorY={mirrorY}
            jobId={selectedRunId || ''}
            accessToken={accessToken}
            hasHistology={result?.has_histology}
          />

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
              Downloads
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              <Button
                startIcon={<DownloadIcon size={16} />}
                variant="outlined"
                onClick={handleDownloadSVG}
                disabled={isExporting}
              >
                {isExporting ? 'Downloading...' : 'Download Spatial Plot'}
              </Button>
              <Button
                startIcon={<DownloadIcon size={16} />}
                variant="outlined"
                onClick={handleDownloadUmap}
                disabled={isExportingUmap}
              >
                {isExportingUmap ? 'Downloading...' : 'Download UMAP'}
              </Button>
            </Box>
          </Box>
        </Box>
      ) : status === 'queued' || status === 'running' ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress size={56} sx={{ mb: 3 }} />
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
            {status === 'queued' ? 'Job is queued' : 'Job is running'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            {status === 'queued'
              ? 'Your job is waiting to be processed. This page will update automatically.'
              : 'Your job is being processed. This page will update automatically.'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Checking for updates every 5 seconds...
          </Typography>
        </Box>
      ) : status === 'failed' ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <AlertCircle size={56} style={{ color: '#EF4444', marginBottom: 24 }} />
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
            Job Failed
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            The job encountered an error during processing. Please try again or contact support if the problem
            persists.
          </Typography>
          <Button variant="contained" href="/">
            Create New Job
          </Button>
        </Box>
      ) : null}

          <FloatingCompareBar />
        </Container>
      </Box>
    </Box>
  );
};

export default FocusPage;
