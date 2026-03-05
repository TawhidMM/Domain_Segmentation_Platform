import React, { useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
} from '@mui/material';
import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon } from '@mui/icons-material';
import { METRIC_CONFIG, getMetricGroups } from '@/config/metricsConfig';
import { useMetricsAnalysis } from '@/hooks/useMetricsAnalysis';
import { ExperimentMetrics } from '@/types';

interface MetricsTableProps {
  jobs: Array<{
    id: string;
    metrics: ExperimentMetrics | null;
    result?: {
      toolName?: string;
    } | null;
  }>;
  jobIds: string[];
}

/**
 * Get accent color for metric based on optimization direction
 */
const getMetricAccentColor = (better: 'higher' | 'lower') => {
  return better === 'higher' ? '#1976d2' : '#ed6c02'; // Blue for higher, Orange for lower
};

/**
 * Direction Indicator Component
 */
const DirectionIndicator: React.FC<{ better: 'higher' | 'lower' }> = ({ better }) => {
  const color = better === 'higher' ? '#2e7d32' : '#c57c1c'; // Darker greens and oranges
  
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: '50%',
        bgcolor: better === 'higher' ? '#e8f5e9' : '#fff3e0',
        ml: 0.75,
      }}
    >
      {better === 'higher' ? (
        <TrendingUpIcon sx={{ fontSize: 16, color }} />
      ) : (
        <TrendingDownIcon sx={{ fontSize: 16, color }} />
      )}
    </Box>
  );
};

/**
 * MetricsTable Component
 * Displays comparison metrics in a clean, scientific table format
 * Highlights best values according to metric optimization direction
 */
const MetricsTable: React.FC<MetricsTableProps> = ({ jobs, jobIds }) => {
  const { isBestValue, formatMetricValue } = useMetricsAnalysis({ jobs });

  // Calculate normalized values for opacity scaling
  const getValueOpacity = useMemo(() => {
    return (metricKey: string, jobId: string): number => {
      const job = jobs.find((j) => j.id === jobId);
      const value = job?.metrics?.[metricKey as keyof ExperimentMetrics];
      
      if (value === null || value === undefined) return 1;
      
      const metric = METRIC_CONFIG.find((m) => m.key === metricKey);
      if (!metric) return 1;
      
      // Get all values for this metric
      const allValues = jobs
        .map((j) => j.metrics?.[metricKey as keyof ExperimentMetrics])
        .filter((v): v is number => v !== null && v !== undefined);
      
      if (allValues.length === 0) return 1;
      
      const min = Math.min(...allValues);
      const max = Math.max(...allValues);
      const range = max - min;
      
      if (range === 0) return 1;
      
      // Normalize to 0-1, then scale to 0.7-1 range for better visibility
      const normalized = metric.better === 'higher'
        ? (value - min) / range
        : (max - value) / range;
      
      return 0.7 + normalized * 0.3; // Maps to 0.7-1 range (less transparent)
    };
  }, [jobs]);

  // Create stable callback references
  const getCellContent = useMemo(
    () => (metricKey: string, jobId: string) => {
      const job = jobs.find((j) => j.id === jobId);
      const value = job?.metrics?.[metricKey as keyof ExperimentMetrics];
      return formatMetricValue(value);
    },
    [jobs, formatMetricValue]
  );

  const getIsBest = useMemo(
    () => (metricKey: string, jobId: string) => {
      return isBestValue(metricKey, jobId);
    },
    [isBestValue]
  );

  const metricGroups = getMetricGroups();
  let previousGroup: string | null = null;

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 3,
        p: 3,
        borderRadius: 3,
        bgcolor: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid',
        borderColor: 'grey.100',
      }}
    >
      <TableContainer
        sx={{
          maxHeight: 'calc(100vh - 350px)',
          overflowX: 'auto',
          overflowY: 'auto',
        }}
      >
        <Table stickyHeader sx={{ minWidth: 400 }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  bgcolor: '#f8f9fb',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  letterSpacing: '0.02em',
                  py: 2.5,
                  px: 3,
                  borderBottom: '2px solid',
                  borderColor: 'grey.300',
                  minWidth: 200,
                  position: 'sticky',
                  left: 0,
                  zIndex: 3,
                  color: 'grey.800',
                }}
              >
                Metric
              </TableCell>
              {jobIds.map((jobId, index) => {
                const job = jobs.find((j) => j.id === jobId);
                const toolName = job?.result?.toolName || `Exp ${index + 1}`;
                return (
                  <TableCell
                    key={jobId}
                    align="right"
                    sx={{
                      bgcolor: '#f8f9fb',
                      fontWeight: 600,
                      fontSize: '0.9375rem',
                      letterSpacing: '0.02em',
                      py: 2.5,
                      px: 3,
                      borderBottom: '2px solid',
                      borderColor: 'grey.300',
                      minWidth: 120,
                      color: 'grey.800',
                    }}
                  >
                    {toolName}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {METRIC_CONFIG.map((metric) => {
              const accentColor = getMetricAccentColor(metric.better);
              
              // Check if we need a group divider
              const showGroupDivider = metric.group !== previousGroup;
              previousGroup = metric.group;

              return (
                <React.Fragment key={metric.key}>
                  {/* Group Divider */}
                  {showGroupDivider && (
                    <TableRow>
                      <TableCell
                        colSpan={jobIds.length + 1}
                        sx={{
                          bgcolor: 'transparent',
                          borderBottom: 'none',
                          pt: previousGroup === null ? 0 : 3,
                          pb: 1,
                          px: 3,
                        }}
                      >
                        <Typography
                          variant="overline"
                          sx={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            letterSpacing: '0.08em',
                            color: 'grey.600',
                            textTransform: 'uppercase',
                          }}
                        >
                          {metric.group}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Metric Row */}
                  <TableRow
                    sx={{
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.02)',
                      },
                      '&:hover td': {
                        bgcolor: 'inherit',
                      },
                      transition: 'background-color 0.15s ease',
                      '&:last-child td': {
                        borderBottom: 0,
                      },
                    }}
                  >
                    {/* Metric Name Column */}
                    <TableCell
                      sx={{
                        py: 2.5,
                        px: 3,
                        pl: 1.5,
                        fontWeight: 600,
                        fontSize: '0.9375rem',
                        borderBottom: '1px solid',
                        borderColor: 'grey.100',
                        bgcolor: 'white',
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        borderLeft: `3px solid ${accentColor}`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 1 }}>
                        <Typography
                          component="span"
                          sx={{
                            fontSize: '0.9375rem',
                            fontWeight: 600,
                            color: 'grey.900',
                          }}
                        >
                          {metric.label}
                        </Typography>
                        <DirectionIndicator better={metric.better} />
                      </Box>
                    </TableCell>

                    {/* Metric Value Columns */}
                    {jobIds.map((jobId) => {
                      const isBest = getIsBest(metric.key, jobId);
                      const cellContent = getCellContent(metric.key, jobId);
                      const opacity = getValueOpacity(metric.key, jobId);

                      return (
                        <TableCell
                          key={jobId}
                          align="right"
                          sx={{
                            py: 2.5,
                            px: 3,
                            fontSize: '0.9375rem',
                            fontVariantNumeric: 'tabular-nums',
                            fontFamily: '"Roboto Mono", monospace',
                            fontWeight: isBest ? 700 : 500,
                            color: isBest ? accentColor : 'grey.700',
                            borderBottom: '1px solid',
                            borderColor: 'grey.100',
                            bgcolor: 'white',
                            opacity: 1,
                            transition: 'all 0.15s ease',
                            position: 'relative',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'inline-block',
                              px: isBest ? 1.5 : 0,
                              py: isBest ? 0.75 : 0,
                              borderRadius: 1.5,
                              bgcolor: isBest ? `${accentColor}12` : 'transparent',
                              border: isBest ? `1.5px solid ${accentColor}24` : 'none',
                              boxShadow: isBest ? `inset 0 0 0 1px ${accentColor}20` : 'none',
                            }}
                          >
                            {cellContent}
                          </Box>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default MetricsTable;
