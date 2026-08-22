import React, { useCallback, useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import { Copy, CheckCircle, AlertCircle, Clock, Zap, Plus, Check, RotateCw, FlipHorizontal, FlipVertical, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useComparisonStore } from '@/stores/comparison';
import FloatingCompareBar from '@/components/visualization/FloatingCompareBar';
import SpatialPlot from '@/components/visualization/SpatialPlot';
import { DatasetExplorer } from '@/components/experiment';
import { exportExperiment, exportExperimentUmap, fetchExperimentDetails, fetchExperimentResult, fetchExperimentMetrics } from '@/services/experimentService';
import { toast } from 'sonner';
import { ExperimentDetails, ExperimentResult, ExperimentMetrics, RunDetail } from '@/types';



const findRunDetail = (details: ExperimentDetails | null, runId: string | null): RunDetail | null => {
  if (!details || !runId) return null;
  for (const ds of details.datasets) {
    const run = ds.runs.find((r) => r.run_id === runId);
    if (run) return run;
  }
  return null;
};

const FocusPage: React.FC = () => {
  const { experimentId } = useParams<{ experimentId: string }>();
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get('t');
  const runParam = searchParams.get('run');
  const addExperiment = useComparisonStore((state) => state.addExperiment);
  const removeExperiment = useComparisonStore((state) => state.removeExperiment);
  // Compute the boolean directly so React re-renders when basket changes
  const isInBasket = useComparisonStore((state) =>
    experimentId ? state.basket.some((exp) => exp.id === experimentId) : false
  );
  const [rotation, setRotation] = useState(0);
  const [mirrorX, setMirrorX] = useState(false);
  const [mirrorY, setMirrorY] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingUmap, setIsExportingUmap] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  // Experiment and run state
  const [experimentData, setExperimentData] = useState<ExperimentDetails | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());
  
  // Run data state (replaces useJobTracking)
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<ExperimentResult | null>(null);
  const [metrics, setMetrics] = useState<ExperimentMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | undefined>(undefined);

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

        // Auto-select run from ?run= if present, otherwise first run of first dataset
        if (data.datasets?.length > 0) {
          let targetRunId: string | null = null;
          let targetDatasetId: string | null = null;

          if (runParam) {
            for (const ds of data.datasets) {
              const found = ds.runs?.find((r) => r.run_id === runParam);
              if (found) {
                targetRunId = runParam;
                targetDatasetId = ds.dataset_id;
                break;
              }
            }
          }

          if (!targetRunId) {
            const firstDataset = data.datasets[0];
            if (firstDataset.runs?.length > 0) {
              targetRunId = firstDataset.runs[0].run_id;
              targetDatasetId = firstDataset.dataset_id;
            }
          }

          if (targetRunId && targetDatasetId) {
            setSelectedRunId(targetRunId);
            setStatus(findRunDetail(data, targetRunId)?.status ?? null);
            setExpandedDatasets(new Set([targetDatasetId]));
          }
        }
      } catch (err) {
        const code = (err as { response?: { status?: number } })?.response?.status;
        setErrorCode(code);
        setError(code === 403 ? 'Unauthorized access' : code === 404 ? 'Experiment not found' : 'Failed to load experiment');
      } finally {
        setIsLoading(false);
      }
    };

    loadExperiment();
  }, [experimentId, accessToken, runParam]);

  // Consolidated single poller: keeps ALL run statuses in the sidebar fresh while any run is
  // queued/running, and loads the selected run's result/metrics once it finishes.
  useEffect(() => {
    if (!experimentId || !accessToken || !selectedRunId) return;

    let cancelled = false;
    let inFlight = false;
    let hasSucceeded = false;
    let resultLoaded = false;
    let intervalRef: NodeJS.Timeout | null = null;

    const loadRunResult = async (runId: string) => {
      try {
        const [resultData, metricsData] = await Promise.all([
          fetchExperimentResult(runId, accessToken),
          fetchExperimentMetrics(runId, accessToken).catch(() => null),
        ]);
        if (cancelled) return;
        setResult(resultData);
        setMetrics(metricsData);
      } catch (err) {
        console.error('Failed to load run result:', err);
        resultLoaded = false;
        if (!cancelled) toast.error('Failed to load run data');
      }
    };

    const pollOnce = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const fresh = await fetchExperimentDetails(experimentId, accessToken);
        if (cancelled) return;
        hasSucceeded = true;

        // Keep BOTH the sidebar and the action-bar chip in sync with all runs
        setExperimentData(fresh);

        // Derive the selected run's current status from the fresh details
        const selectedRunDetail = findRunDetail(fresh, selectedRunId);
        const selectedRunStatus = selectedRunDetail?.status ?? null;
        if (selectedRunStatus) setStatus(selectedRunStatus);

        // Load the selected run's result + metrics exactly once when it finishes
        if (selectedRunStatus === 'finished' && !resultLoaded) {
          resultLoaded = true;
          await loadRunResult(selectedRunId);
        }

        // Keep polling only while at least one run is still queued/running
        const hasActiveRuns = fresh.datasets.some((ds) =>
          ds.runs.some((r) => r.status === 'queued' || r.status === 'running')
        );
        if (!hasActiveRuns && intervalRef) {
          clearInterval(intervalRef);
          intervalRef = null;
        }
      } catch (err) {

        console.error('Polling error:', err);

        if (!hasSucceeded && !cancelled) {
          const code = (err as { response?: { status?: number } })?.response?.status;
          setErrorCode(code);
          setError('Failed to load run data');
          toast.error('Failed to load run data');
        }
      } finally {
        inFlight = false;
      }
    };

    // Immediate first check, then a 5s heartbeat while any run is active
    pollOnce();
    intervalRef = setInterval(pollOnce, 5000);

    return () => {
      cancelled = true;
      if (intervalRef) clearInterval(intervalRef);
    };
  }, [experimentId, accessToken, selectedRunId]);

  const handleRunSelect = (runId: string) => {
    if (runId === selectedRunId) {
      return;
  }
    setSelectedRunId(runId);
    setResult(null);
    setMetrics(null);
    setStatus(null);
    setError(null);
    setErrorCode(undefined);
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
    if (!experimentId || !accessToken) return;

    if (isInBasket) {
      removeExperiment(experimentId);
      toast.success('Removed from comparison');
    } else {
      addExperiment(experimentId, accessToken, experimentData?.experiment_name);
      toast.success('Added to comparison');
    }
  }, [experimentId, accessToken, isInBasket, addExperiment, removeExperiment, experimentData?.experiment_name]);

  const handleDownloadSVG = useCallback(async () => {
    if (!selectedRunId || !accessToken) return;

    setIsExporting(true);
    const toastId = toast.loading('Exporting spatial plot...');
    try {
      const blob = await exportExperiment(selectedRunId, 'svg', accessToken);
      toast.dismiss(toastId);

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `run_${selectedRunId}_export.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('SVG exported successfully!');
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Failed to export SVG:', error);
      toast.error('Failed to export SVG. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [selectedRunId, accessToken]);

  const handleDownloadCsv = useCallback(() => {
    if (!result?.spots || result.spots.length === 0) {
      toast.error('No prediction data available to export');
      return;
    }

    setIsExportingCsv(true);
    try {
      const header = 'barcode,prediction\n';
      const rows = result.spots.map(spot => `${spot.barcode},${spot.domain}`);
      const csvContent = header + rows.join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `run_${selectedRunId}_predictions.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Predictions CSV exported successfully!');
    } catch (error) {
      console.error('Failed to export CSV:', error);
      toast.error('Failed to export CSV. Please try again.');
    } finally {
      setIsExportingCsv(false);
    }
  }, [result, selectedRunId]);

  const handleDownloadUmap = useCallback(async () => {
    if (!selectedRunId || !accessToken) return;

    setIsExportingUmap(true);
    const toastId = toast.loading('Exporting UMAP...');
    try {
      const blob = await exportExperimentUmap(selectedRunId, accessToken);
      toast.dismiss(toastId);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `run_${selectedRunId}_umap_export.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('UMAP exported successfully!');
    } catch (error) {
      toast.dismiss(toastId);
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
              Result Not Found
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              The result you're looking for doesn't exist or has expired.
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

  const ExportMenu: React.FC<{
    onDownloadSvg: () => void;
    onDownloadUmap: () => void;
    onDownloadCsv: () => void;
    isExporting: boolean;
    isExportingUmap: boolean;
    isExportingCsv: boolean;
  }> = ({ onDownloadSvg, onDownloadUmap, onDownloadCsv, isExporting, isExportingUmap, isExportingCsv }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    return (
      <>
        <Tooltip title="Export">
          <Button
            size="small"
            variant="outlined"
            onClick={handleClick}
            endIcon={<ChevronDown size={16} />}
            disabled={isExporting || isExportingUmap || isExportingCsv}
          >
            Export
          </Button>
        </Tooltip>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            onClick={() => { handleClose(); onDownloadSvg(); }}
            disabled={isExporting}
          >
            Spatial Plot (SVG & PDF)
          </MenuItem>
          <MenuItem
            onClick={() => { handleClose(); onDownloadUmap(); }}
            disabled={isExportingUmap}
          >
            UMAP (SVG & PDF)
          </MenuItem>
          <MenuItem
            onClick={() => { handleClose(); onDownloadCsv(); }}
            disabled={isExportingCsv}
          >
            Predictions (CSV)
          </MenuItem>
        </Menu>
      </>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Left Sidebar - Dataset/Run Explorer */}
      <Box
        sx={{
          width: sidebarCollapsed ? 56 : 260,
          borderRight: '1px solid',
          borderColor: 'divider',
          overflow: 'auto',
          backgroundColor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
        }}
      >
        {!sidebarCollapsed && (
          <>
            <Box sx={{ p: 3, pb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '16px', mb: 0.5 }}>
                Experiment Runs
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '13px' }}>
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
          </>
        )}
        {sidebarCollapsed && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2 }}>
            <IconButton size="small" onClick={() => setSidebarCollapsed(false)}>
              <PanelLeftOpen size={20} />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Slim sticky action bar */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            px: 2,
            py: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
            minHeight: 44,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!sidebarCollapsed ? (
                <IconButton size="small" onClick={() => setSidebarCollapsed(true)}>
                  <PanelLeftClose size={18} />
                </IconButton>
              ) : (
                <Box sx={{ width: 40 }} />
              )}
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                }}
                title={experimentData?.experiment_name}
              >
                {experimentData?.experiment_name || 'Untitled Experiment'}
              </Typography>
              {status && getStatusIcon(status) && (
                <Chip
                  icon={getStatusIcon(status) as React.ReactElement}
                  label={status.charAt(0).toUpperCase() + status.slice(1)}
                  color={getStatusColor(status)}
                  variant="outlined"
                  size="small"
                />
              )}
              {selectedRunId ? (
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: 'text.primary',
                      flexShrink: 0,
                    }}
                  >
                    Seed {findRunDetail(experimentData, selectedRunId)?.seed ?? '—'}
                  </Typography>
                  <Typography
                    variant="caption"
                    title={selectedRunId}
                    sx={{
                      color: 'text.secondary',
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {selectedRunId}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No run selected
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', '& .MuiButton-root': { py: 0.8 } }}>
            <Tooltip title="Copy this URL to bookmark and access results later">
              <Button
                size="small"
                variant="outlined"
                startIcon={<Copy size={16} />}
                onClick={copyLink}
              >
                Copy Link
              </Button>
            </Tooltip>

            {status === 'finished' && (
              <Tooltip title={isInBasket ? 'Remove this result from the comparing' : 'Add this result to for comparing'}>
                <Button
                  size="small"
                  variant="outlined"
                  color={isInBasket ? 'success' : 'primary'}
                  startIcon={isInBasket ? <Check size={18} /> : <Plus size={18} />}
                  onClick={handleAddToCompare}
                >
                  {isInBasket ? 'Remove' : 'Add to Compare'}
                </Button>
              </Tooltip>
            )}

            {status === 'finished' && (
              <ExportMenu
                onDownloadSvg={handleDownloadSVG}
                onDownloadUmap={handleDownloadUmap}
                onDownloadCsv={handleDownloadCsv}
                isExporting={isExporting}
                isExportingUmap={isExportingUmap}
                isExportingCsv={isExportingCsv}
              />
            )}
            <Tooltip title="Learn about the features on this page">
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate('/how-to-use#single-method-result-exploration')}
                sx={{ textTransform: 'none', fontSize: '0.8125rem' }}
              >
                User Guide
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {/* Content area with scroll */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2 }}>
          {status === 'failed' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Job failed to complete. Please try again or contact support if the problem persists.
              </Typography>
            </Alert>
          )}

          {status === 'finished' && result ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Results
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
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
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <SpatialPlot
                  result={result}
                  metrics={metrics}
                  title=""
                  rotation={rotation}
                  mirrorX={mirrorX}
                  mirrorY={mirrorY}
                  runId={selectedRunId || ''}
                  accessToken={accessToken}
                  hasHistology={result?.has_histology}
                />
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
        </Box>
        <FloatingCompareBar />
      </Box>
    </Box>
  );
};

export default FocusPage;