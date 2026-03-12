import React, { useState } from 'react';
import { Box, Typography, Stack, IconButton, Tooltip, Collapse } from '@mui/material';
import { X, ExternalLink, AlertCircle, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useComparisonDataset } from '@/context/ComparisonDatasetContext';

interface Experiment {
  id: string;
  token: string;
  result: any;
  metrics: any;
  isLoading: boolean;
  error: string | null;
  errorCode?: number;
}

interface CompareJobListProps {
  experiments: Experiment[];
  onRemoveExperiment: (experimentId: string) => void;
}

const CompareJobList: React.FC<CompareJobListProps> = ({ experiments, onRemoveExperiment }) => {
  const navigate = useNavigate();
  const { datasets, selectedDataset, setSelectedDataset } = useComparisonDataset();
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(
    datasets.length > 0 ? new Set([datasets[0].dataset_id]) : new Set()
  );

  const handleViewIndividually = (experimentId: string, token: string) => {
    navigate(`/experiment/${experimentId}?t=${token}`);
  };

  const toggleDatasetExpanded = (datasetId: string) => {
    const newExpanded = new Set(expandedDatasets);
    if (newExpanded.has(datasetId)) {
      newExpanded.delete(datasetId);
    } else {
      newExpanded.add(datasetId);
    }
    setExpandedDatasets(newExpanded);
  };

  const handleDatasetSelect = (datasetId: string) => {
    setSelectedDataset(datasetId);
  };

  // If no datasets, show original layout
  if (datasets.length === 0) {
    return (
      <Box
        sx={{
          width: 300,
          borderRight: '1px solid',
          borderColor: '#DCE5F0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#F3F6FB',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2.5,
            borderBottom: '1px solid',
            borderColor: '#DCE5F0',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F8FC 100%)',
            boxShadow: 'inset 0 2px 0 #BAE6FD',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
            Compared Experiments
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            {experiments.length} experiment{experiments.length !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {/* Experiments List */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            Loading datasets...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 300,
        borderRight: '1px solid',
        borderColor: '#DCE5F0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#F3F6FB',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          borderBottom: '1px solid',
          borderColor: '#DCE5F0',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F8FC 100%)',
          boxShadow: 'inset 0 2px 0 #BAE6FD',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
          Datasets
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          {datasets.length} dataset{datasets.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Datasets and Tools List */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Stack spacing={1}>
          {datasets.map((dataset) => {
            const isExpanded = expandedDatasets.has(dataset.dataset_id);
            const isSelected = selectedDataset === dataset.dataset_id;

            return (
              <Box key={dataset.dataset_id}>
                {/* Dataset Header */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    p: 1.5,
                    border: '1px solid',
                    borderColor: isSelected ? '#7DD3FC' : '#DDE6F1',
                    borderRadius: '8px',
                    background: isSelected
                      ? 'linear-gradient(180deg, #E0F2FE 0%, #F0F9FF 100%)'
                      : 'linear-gradient(180deg, #FFFFFF 0%, #F9FBFF 100%)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#7DD3FC',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                    },
                  }}
                  onClick={() => {
                    toggleDatasetExpanded(dataset.dataset_id);
                    handleDatasetSelect(dataset.dataset_id);
                  }}
                >
                  <ChevronDown
                    size={16}
                    style={{
                      transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 0.2s',
                      flexShrink: 0,
                      color: isSelected ? '#0EA5E9' : '#64748B',
                    }}
                  />
                  <Typography
                    sx={{
                      flex: 1,
                      fontWeight: isSelected ? 700 : 600,
                      fontSize: '0.9rem',
                      color: isSelected ? '#0369A1' : '#0F172A',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {dataset.dataset_id}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: '#94A3B8',
                      flexShrink: 0,
                    }}
                  >
                    {dataset.tools.length} tools
                  </Typography>
                </Box>

                {/* Tools List */}
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <Box sx={{ ml: 2, mt: 1, mb: 1.5 }}>
                    <Stack spacing={0.75}>
                      {dataset.tools.map((tool) => {
                        const expObj = experiments.find((e) => e.id === tool.experiment_id);

                        return (
                          <Box
                            key={`${dataset.dataset_id}-${tool.experiment_id}`}
                            sx={{
                              p: 1.25,
                              border: '1px solid',
                              borderColor: '#E2E8F0',
                              borderRadius: '6px',
                              background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                borderColor: '#7DD3FC',
                                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
                              },
                            }}
                          >
                            {/* Tool Name */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                              <Box
                                onClick={() => handleViewIndividually(tool.experiment_id, tool.token)}
                                sx={{
                                  flex: 1,
                                  minWidth: 0,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  '&:hover': { color: '#0EA5E9' },
                                  transition: 'color 0.2s',
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    color: 'inherit',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {tool.tool_name}
                                </Typography>
                                <ExternalLink size={12} style={{ opacity: 0.45, flexShrink: 0 }} />
                              </Box>

                              <Tooltip title="Remove from comparison">
                                <IconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveExperiment(tool.experiment_id);
                                  }}
                                  size="small"
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    color: '#94A3B8',
                                    '&:hover': { bgcolor: '#FEE2E2', color: '#DC2626' },
                                  }}
                                >
                                  <X size={12} />
                                </IconButton>
                              </Tooltip>
                            </Box>

                            {/* Experiment ID */}
                            <Box
                              sx={{
                                px: 0.75,
                                py: 0.5,
                                backgroundColor: '#EFF6FF',
                                borderRadius: '4px',
                                border: '1px solid #D7E3F6',
                                mb: expObj?.isLoading ? 0.75 : 0,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'block',
                                  color: '#64748B',
                                  wordBreak: 'break-all',
                                  fontFamily: 'monospace',
                                  fontSize: '0.65rem',
                                }}
                              >
                                {tool.experiment_id.substring(0, 10)}...{tool.experiment_id.substring(tool.experiment_id.length - 6)}
                              </Typography>
                            </Box>

                            {/* Loading State */}
                            {expObj?.isLoading && (
                              <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.5 }}>
                                Loading...
                              </Typography>
                            )}

                            {/* Error State */}
                            {expObj?.errorCode && expObj.errorCode >= 400 && (
                              <Box
                                sx={{
                                  display: 'flex',
                                  gap: 0.75,
                                  alignItems: 'flex-start',
                                  p: 0.75,
                                  backgroundColor: '#FEE2E2',
                                  borderRadius: '4px',
                                  border: '1px solid #FECACA',
                                  mt: 0.75,
                                }}
                              >
                                <AlertCircle size={14} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                                <Box>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      display: 'block',
                                      fontWeight: 700,
                                      color: '#DC2626',
                                      fontSize: '0.7rem',
                                    }}
                                  >
                                    Access Error
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: '#991B1B',
                                      fontSize: '0.6rem',
                                      lineHeight: 1.2,
                                    }}
                                  >
                                    {expObj.errorCode === 403 ? 'Unauthorized access' : 'Resource not found'}
                                  </Typography>
                                </Box>
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

      {/* Bottom Info */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: '#DCE5F0',
          background: 'linear-gradient(180deg, #F8FAFD 0%, #FFFFFF 100%)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: '#64748B',
            display: 'block',
            fontSize: '0.75rem',
            lineHeight: 1.4,
          }}
        >
          Click dataset to select. Click tool name to open experiment.
        </Typography>
      </Box>
    </Box>
  );
};

export default CompareJobList;
