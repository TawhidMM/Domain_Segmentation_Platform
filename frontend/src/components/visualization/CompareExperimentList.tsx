import React, { useState, useMemo } from 'react';
import { Box, Typography, Stack, IconButton, Tooltip, Collapse, Chip, Skeleton, Alert, LinearProgress } from '@mui/material';
import { X, ExternalLink, ChevronDown, ChevronRight, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useComparisonDataset } from '@/context/ComparisonDatasetContext';
import { UNIFIED_CHART_COLORS } from '@/config/metricsConfig';

const PANEL_WIDTH = 256;
const PANEL_WIDTH_COLLAPSED = 40;

interface ExperimentResultPayload {
  status?: string;
}

interface ExperimentMetricsPayload {
  runs?: Array<{ status?: string }>;
}

interface Experiment {
  id: string;
  token: string;
  result: ExperimentResultPayload | null;
  metrics: ExperimentMetricsPayload | null;
  isLoading: boolean;
  error: string | null;
  errorCode?: number;
}

interface CompareExperimentListProps {
  experiments: Experiment[];
  onRemoveExperiment: (experimentId: string) => void;
}

const CompareExperimentList: React.FC<CompareExperimentListProps> = ({ experiments, onRemoveExperiment }) => {
  const navigate = useNavigate();
  const { datasets, selectedDataset, setSelectedDataset, isLoading, error } = useComparisonDataset();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(
    datasets.length > 0 ? new Set([datasets[0]?.dataset_id].filter(Boolean)) : new Set()
  );

  const toggleCollapse = () => setCollapsed((prev) => !prev);

  const toggleDatasetExpanded = (datasetId: string) => {
    const next = new Set(expandedDatasets);
    if (next.has(datasetId)) next.delete(datasetId); else next.add(datasetId);
    setExpandedDatasets(next);
  };

  const handleViewIndividually = (experimentId: string, token: string) => {
    if (!token || token === 'undefined') return;
    navigate(`/experiment/${experimentId}?t=${token}`);
  };
    useMemo(() => {
        const map: Record<string, string> = {};
        experiments.forEach((exp, idx) => {
            map[exp.id] = UNIFIED_CHART_COLORS[idx % UNIFIED_CHART_COLORS.length];
        });
        return map;
    }, [experiments]);

    if (isLoading) {
        return (
            <Box
                sx={{
                    width: collapsed ? PANEL_WIDTH_COLLAPSED : PANEL_WIDTH,
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
                    transition: 'width 0.2s ease',
                }}
            >
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Skeleton variant="rounded" height={28} />
                    <Skeleton variant="rounded" height={48} />
                    <Skeleton variant="rounded" height={48} />
                </Box>
            </Box>
        );
    }
    if (error) {
    return (
      <Box
        sx={{
          width: collapsed ? PANEL_WIDTH_COLLAPSED : PANEL_WIDTH,
          borderRight: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
          transition: 'width 0.2s ease',
          p: 2,
        }}
      >
        <Alert severity="error" sx={{ fontSize: '0.75rem' }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (datasets.length === 0) {
    return (
      <Box
        sx={{
          width: collapsed ? PANEL_WIDTH_COLLAPSED : PANEL_WIDTH,
          borderRight: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
          transition: 'width 0.2s ease',
          p: 2,
        }}
      >
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Typography variant="caption">No shared datasets available for comparison.</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: collapsed ? PANEL_WIDTH_COLLAPSED : PANEL_WIDTH,
        borderRight: '1px solid',
        borderColor: 'divider',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
        transition: 'width 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: '#F0FDFA',
        }}
      >
        <IconButton size="small" onClick={toggleCollapse} aria-label={collapsed ? 'Expand panel' : 'Collapse panel'} sx={{ flexShrink: 0, bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}>
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </IconButton>
      </Box>
      {!collapsed ? (
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 2 },
          }}
        >
          <Stack sx={{ p: 1.25 }} spacing={0.75}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.25, pt: 0.5, pb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
                DATASETS
              </Typography>
              <Chip size="small" label={datasets.length} sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'grey.100', color: 'text.secondary' }} />
            </Box>

            {datasets.map((dataset) => {
              const isExpanded = expandedDatasets.has(dataset.dataset_id);
              const isSelected = dataset.dataset_id === selectedDataset;
              const datasetLabel = dataset.dataset_name?.trim() || dataset.dataset_id;
                dataset.tools.reduce((sum, tool) => {
                    const exp = experiments.find((e) => e.id === tool.experiment_id);
                    return sum + (exp?.metrics?.runs?.length ?? 0);
                }, 0);
                return (
                    <Box
                        key={dataset.dataset_id}
                        sx={{ position: 'relative' }}
                    >
                  {isSelected && (
                    <Box sx={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: '3px', bgcolor: 'primary.main', borderRadius: '0 4px 4px 0' }} />
                  )}

                  <Box sx={{ p: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <IconButton size="small" onClick={() => toggleDatasetExpanded(dataset.dataset_id)} aria-label={isExpanded ? 'Collapse dataset' : 'Expand dataset'} sx={{ padding: 0.5, color: 'text.secondary' }}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </IconButton>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Dataset
                        </Typography>
                        <Tooltip title={`${datasetLabel} (${dataset.dataset_id})`} placement="top" arrow>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'grey.900', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                            {datasetLabel}
                          </Typography>
                        </Tooltip>
                      </Box>
                      <Chip
                        size="small"
                        label={isSelected ? 'Active' : 'Select'}
                        onClick={() => setSelectedDataset(dataset.dataset_id)}
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          ...(isSelected
                            ? { bgcolor: 'primary.main', color: 'white', '& .MuiChip-icon': { color: 'white' } }
                            : { bgcolor: 'white', color: 'primary.main', border: '1px solid', borderColor: 'primary.main' }),
                        }}
                      />
                    </Stack>
                  </Box>

                  <Collapse in={isExpanded}>
                    <Box sx={{ px: 0.5, pb: 1, pt: 0.5 }}>
                      <Stack spacing={1}>
                        {dataset.tools.map((tool) => {
                          const expObj = experiments.find((e) => e.id === tool.experiment_id);
                          const navigationToken = expObj?.token || tool.token;
                          const statusKey = (expObj?.result as ExperimentResultPayload | undefined)?.status as string | undefined;
                          const isRunning = statusKey === 'running';

                          return (
                            <Box
                              key={tool.experiment_id}
                              sx={{
                                p: '0.5rem 0.75rem',
                                borderRadius: '6px',
                                transition: 'background 0.15s ease',
                                '&:hover': { bgcolor: 'rgba(13,148,136,0.05)' },
                              }}
                            >
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'grey.900', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {tool.tool_name}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, opacity: 0.75, '&:hover': { opacity: 1 } }}>
                                  <Tooltip title="Open experiment" placement="top" arrow>
                                    <IconButton size="small" onClick={() => handleViewIndividually(tool.experiment_id, navigationToken)} aria-label={"Open " + tool.tool_name} sx={{ padding: 0.5, color: 'text.secondary' }}>
                                      <ExternalLink size={14} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Remove from comparison" placement="top" arrow>
                                    <IconButton size="small" onClick={() => onRemoveExperiment(tool.experiment_id)} aria-label={"Remove " + tool.tool_name} sx={{ padding: 0.5, color: 'text.secondary' }}>
                                      <X size={14} />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Stack>

                              {isRunning && (
                                <Box sx={{ mt: 0.75 }}>
                                  <LinearProgress sx={{ height: 3, borderRadius: 1, bgcolor: 'grey.100', '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' } }} />
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Stack>
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        </Box>
      )}
    </Box>
  );
};

export default CompareExperimentList;
