import React from 'react';
import { Box, Typography, Stack, IconButton, Tooltip } from '@mui/material';
import { X, ExternalLink, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

const CompareJobList: React.FC<CompareJobListProps> = ({experiments, onRemoveExperiment}) => {
  const navigate = useNavigate();

  const handleViewIndividually = (experimentId: string, token: string) => {
    navigate(`/experiment/${experimentId}?t=${token}`);
  };

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
        <Stack spacing={1.5}>
          {experiments.map((experiment) => (
            <Box
              key={experiment.id}
              sx={{
                p: 1.75,
                border: '1px solid',
                borderColor: '#DDE6F1',
                borderRadius: '10px',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F9FBFF 100%)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#7DD3FC',
                  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
                },
              }}
            >
              {/* Tool Name */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box
                  onClick={() => handleViewIndividually(experiment.id, experiment.token)}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    '&:hover': { color: '#0EA5E9' },
                    transition: 'color 0.2s',
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.98rem',
                      color: 'inherit',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {experiment.result?.toolName || 'Experiment'}
                  </Typography>
                  <ExternalLink size={14} style={{ opacity: 0.45, flexShrink: 0 }} />
                </Box>

                <Tooltip title="Remove from comparison">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveExperiment(experiment.id);
                    }}
                    size="small"
                    sx={{
                      width: 26,
                      height: 26,
                      color: '#94A3B8',
                      '&:hover': { bgcolor: '#FEE2E2', color: '#DC2626' },
                    }}
                  >
                    <X size={14} />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Experiment ID in Compact Style */}
              <Box
                sx={{
                  px: 1,
                  py: 0.75,
                  backgroundColor: '#EFF6FF',
                  borderRadius: '8px',
                  border: '1px solid #D7E3F6',
                  mb: experiment.isLoading ? 1 : 0,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: '#64748B',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                    fontSize: '0.68rem',
                  }}
                >
                  {experiment.id.substring(0, 10)}...{experiment.id.substring(experiment.id.length - 6)}
                </Typography>
              </Box>

              {experiment.isLoading && (
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  Loading...
                </Typography>
              )}

              {/* Error state */}
              {experiment.errorCode && experiment.errorCode >= 400 && (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start',
                    p: 2,
                    backgroundColor: '#FEE2E2',
                    borderRadius: '8px',
                    border: '1.5px solid #FECACA',
                  }}
                >
                  <AlertCircle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        fontWeight: 700,
                        color: '#DC2626',
                        mb: 0.5,
                        fontSize: '0.8rem',
                      }}
                    >
                      Access Error
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#991B1B',
                        fontSize: '0.65rem',
                        lineHeight: 1.3,
                      }}
                    >
                      {experiment.errorCode === 403 ? 'Unauthorized access' : 'Resource not found'}
                    </Typography>
                  </Box>
                </Box>
              )}

            </Box>
          ))}
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
          }}
        >
          Click a tool name to open the experiment.
        </Typography>
      </Box>
    </Box>
  );
};

export default CompareJobList;
