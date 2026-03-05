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
import { formatMetricWithStd, calculateStats } from '@/utils/metricsUtils';
import { AllExperimentRunMetrics } from '@/hooks/useMultiExperimentBestRuns';

interface MetricsTableProps {
  experimentMetrics: Array<{
    experimentId: string;
    toolName: string;
    metricsData: AllExperimentRunMetrics | null;
  }>;
  experimentIds: string[];
}

/**
 * Get accent color for metric based on optimization direction
 */
const getMetricAccentColor = (better: 'higher' | 'lower') => {
  return better === 'higher' ? '#1976d2' : '#ed6c02';
};

/**
 * Direction Indicator Component
 */
const DirectionIndicator: React.FC<{ better: 'higher' | 'lower' }> = ({ better }) => {
  const color = better === 'higher' ? '#2e7d32' : '#c57c1c';

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
 * Displays mean ± std metrics for multi-run experiments
 */
const MetricsTable: React.FC<MetricsTableProps> = ({ experimentMetrics, experimentIds }) => {
  // Calculate stats for each experiment and metric
  const metricsStats = useMemo(() => {
    const stats: Record<string, Record<string, { mean: number; stdDev: number }>> = {};

    experimentIds.forEach((expId) => {
      stats[expId] = {};
      const expData = experimentMetrics.find((m) => m.experimentId === expId);

      METRIC_CONFIG.forEach((metric) => {
        if (!expData?.metricsData?.runs) {
          stats[expId][metric.key] = { mean: 0, stdDev: 0 };
          return;
        }

        const values = expData.metricsData.runs
          .map((run) => run.metrics[metric.key as keyof typeof run.metrics])
          .filter((v): v is number => typeof v === 'number' && !isNaN(v));

        if (values.length === 0) {
          stats[expId][metric.key] = { mean: 0, stdDev: 0 };
        } else {
          const { mean, stdDev } = calculateStats(values);
          stats[expId][metric.key] = { mean, stdDev };
        }
      });
    });

    return stats;
  }, [experimentMetrics, experimentIds]);

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
              {experimentIds.map((expId, index) => {
                const expData = experimentMetrics.find((m) => m.experimentId === expId);
                const toolName = expData?.toolName || `Exp ${index + 1}`;
                return (
                  <TableCell
                    key={expId}
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
                      minWidth: 140,
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

              const showGroupDivider = metric.group !== previousGroup;
              previousGroup = metric.group;

              return (
                <React.Fragment key={metric.key}>
                  {showGroupDivider && (
                    <TableRow>
                      <TableCell
                        colSpan={experimentIds.length + 1}
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

                    {experimentIds.map((expId) => {
                      const stats = metricsStats[expId]?.[metric.key];
                      const cellContent = stats ? formatMetricWithStd(stats.mean, stats.stdDev, 3) : 'N/A';

                      return (
                        <TableCell
                          key={expId}
                          align="right"
                          sx={{
                            py: 2.5,
                            px: 3,
                            fontSize: '0.875rem',
                            fontVariantNumeric: 'tabular-nums',
                            fontFamily: '"Roboto Mono", monospace',
                            color: 'grey.700',
                            borderBottom: '1px solid',
                            borderColor: 'grey.100',
                            bgcolor: 'white',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'inline-block',
                              px: 1.5,
                              py: 0.75,
                              borderRadius: 1.5,
                              bgcolor: '#f3f4f6',
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
