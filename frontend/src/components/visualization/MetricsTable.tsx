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
  Chip,
} from '@mui/material';
import { Star } from '@mui/icons-material';
import { METRIC_CONFIG, getMetricGroups, UNIFIED_CHART_COLORS } from '@/config/metricsConfig';
import { formatMetricWithStd, calculateStats, findBestJobIds } from '@/utils/metricsUtils';
import { AllExperimentRunMetrics } from '@/hooks/useMultiExperimentBestRuns';

interface MetricsTableProps {
  experimentMetrics: Array<{
    experimentId: string;
    experimentName: string;
    metricsData: AllExperimentRunMetrics | null;
  }>;
  experimentIds: string[];
}

const MetricsTable: React.FC<MetricsTableProps> = ({ experimentMetrics, experimentIds }) => {
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    experimentIds.forEach((expId, idx) => {
      map[expId] = UNIFIED_CHART_COLORS[idx % UNIFIED_CHART_COLORS.length];
    });
    return map;
  }, [experimentIds]);

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

  // Best job IDs per metric
  const bestByMetric = useMemo(() => {
    const map: Record<string, string[]> = {};
    METRIC_CONFIG.forEach((metric) => {
      const chartData = experimentIds.map((expId) => {
        const exp = experimentMetrics.find((m) => m.experimentId === expId);
        if (!exp?.metricsData?.runs) {
          return { jobId: expId, experimentName: exp?.experimentName || expId, value: null };
        }
        const values = exp.metricsData.runs
          .map((run) => run.metrics[metric.key as keyof typeof run.metrics])
          .filter((v): v is number => typeof v === 'number' && !isNaN(v));
        if (values.length === 0) {
          return { jobId: expId, experimentName: exp?.experimentName || expId, value: null };
        }
        const { mean } = calculateStats(values);
        return { jobId: expId, experimentName: exp?.experimentName || expId, value: mean };
      });
      map[metric.key] = findBestJobIds(chartData, metric.better);
    });
    return map;
  }, [experimentMetrics, experimentIds]);

  let previousGroup: string | null = null;

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 0,
        p: 3,
        borderRadius: 3,
        bgcolor: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid',
        borderColor: 'grey.100',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Star sx={{ fontSize: 14, color: '#f59e0b' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            = best · values are mean ± std
          </Typography>
        </Box>
      </Box>
      <TableContainer
        sx={{
          overflowX: 'auto',
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
                  py: 2,
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
                const experimentName = expData?.experimentName || `Exp ${index + 1}`;
                const color = colorMap[expId] || '#94a3b8';
                return (
                  <TableCell
                    key={expId}
                    align="right"
                    sx={{
                      bgcolor: '#f8f9fb',
                      fontWeight: 600,
                      fontSize: '0.9375rem',
                      letterSpacing: '0.02em',
                      py: 2,
                      px: 3,
                      borderBottom: '2px solid',
                      borderColor: 'grey.300',
                      minWidth: 140,
                      color: 'grey.800',
                    }}
                  >
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: color,
                          flexShrink: 0,
                        }}
                      />
                      <span>{experimentName}</span>
                    </Box>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {METRIC_CONFIG.map((metric) => {
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
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1 }}>
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
                        <Chip
                          size="small"
                          label={metric.better === 'higher' ? '↑ Higher' : '↓ Lower'}
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            bgcolor: metric.better === 'higher' ? '#e8f5e9' : '#fff3e0',
                            color: metric.better === 'higher' ? '#2e7d32' : '#c57c1c',
                          }}
                        />
                      </Box>
                    </TableCell>

                    {experimentIds.map((expId) => {
                      const stats = metricsStats[expId]?.[metric.key];
                      const cellContent = stats ? formatMetricWithStd(stats.mean, stats.stdDev, 3) : 'N/A';
                      const isBest = bestByMetric[metric.key]?.includes(expId);

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
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              px: 1.5,
                              py: 0.75,
                              borderRadius: 1.5,
                              bgcolor: isBest ? '#fef3c7' : '#f3f4f6',
                            }}
                          >
                            <span>{cellContent}</span>
                            <Box
                              sx={{
                                width: 14,
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {isBest && <Star sx={{ fontSize: 14, color: '#f59e0b' }} />}
                            </Box>
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
