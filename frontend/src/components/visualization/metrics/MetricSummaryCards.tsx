import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, Chip, Stack } from '@mui/material';
import { TrendingUp, TrendingDown, Star } from '@mui/icons-material';
import { METRIC_CONFIG, UNIFIED_CHART_COLORS } from '@/config/metricsConfig';
import { calculateStats, findBestJobIds } from '@/utils/metricsUtils';
import { AllExperimentRunMetrics } from '@/hooks/useMultiExperimentBestRuns';

interface MetricSummaryCardsProps {
  experimentMetrics: Array<{
    experimentId: string;
    experimentName: string;
    metricsData: AllExperimentRunMetrics | null;
  }>;
  experimentIds: string[];
  onSelectMetric?: (metricKey: string) => void;
  selectedMetric?: string;
}

const MetricSummaryCards: React.FC<MetricSummaryCardsProps> = ({
  experimentMetrics,
  experimentIds,
  onSelectMetric,
  selectedMetric,
}) => {
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    experimentIds.forEach((expId, idx) => {
      map[expId] = UNIFIED_CHART_COLORS[idx % UNIFIED_CHART_COLORS.length];
    });
    return map;
  }, [experimentIds]);

  const cards = useMemo(() => {
    return METRIC_CONFIG.map((metric) => {
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

      const bestJobIds = findBestJobIds(chartData, metric.better);
      const validItems = chartData.filter((c) => c.value !== null);

      const sorted = [...validItems].sort((a, b) => {
        const aVal = a.value as number;
        const bVal = b.value as number;
        return metric.better === 'higher' ? bVal - aVal : aVal - bVal;
      });

      const displayItems = sorted.slice(0, Math.min(sorted.length, 3));

      return {
        key: metric.key,
        label: metric.label,
        better: metric.better,
        description: metric.description,
        displayItems,
        bestJobIds,
      };
    });
  }, [experimentMetrics, experimentIds]);

  if (experimentIds.length === 0 || experimentMetrics.every((m) => !m.metricsData)) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2">No metrics data available</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: experimentIds.length <= 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
          lg: 'repeat(3, 1fr)',
        },
        gap: 2.5,
      }}
    >
      <Box
        sx={{
          gridColumn: '1 / -1',
          justifySelf: 'end',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          mb: 0.5,
        }}
      >
        <Star sx={{ fontSize: 14, color: '#f59e0b' }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
          = best · values are means across runs
        </Typography>
      </Box>
      {cards.map((card) => {
        const isSelected = selectedMetric === card.key;
        return (
          <Card
            key={card.key}
            variant="outlined"
            onClick={() => onSelectMetric?.(card.key)}
            sx={{
              cursor: onSelectMetric ? 'pointer' : 'default',
              borderRadius: 2,
              borderColor: isSelected ? 'primary.main' : 'grey.200',
              borderWidth: isSelected ? 2 : 1,
              bgcolor: 'white',
              transition: 'all 0.15s ease',
              '&:hover': onSelectMetric
                ? {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    borderColor: 'primary.light',
                  }
                : {},
            }}
          >
            <CardContent sx={{ p: 2.25 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'grey.900' }}>
                  {card.label}
                </Typography>
                <Chip
                  size="small"
                  icon={card.better === 'higher' ? <TrendingUp /> : <TrendingDown />}
                  label={card.better === 'higher' ? 'Higher is better' : 'Lower is better'}
                  sx={{
                    height: 24,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    bgcolor: card.better === 'higher' ? '#e8f5e9' : '#fff3e0',
                    color: card.better === 'higher' ? '#2e7d32' : '#c57c1c',
                    '& .MuiChip-icon': { fontSize: 14 },
                  }}
                />
              </Stack>

              <Stack spacing={0.75}>
                {card.displayItems.map((item) => {
                  const isBest = card.bestJobIds.includes(item.jobId);
                  return (
                    <Stack key={item.jobId} direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: isBest ? 10 : 8,
                          height: isBest ? 10 : 8,
                          borderRadius: '50%',
                          bgcolor: colorMap[item.jobId] || '#94a3b8',
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          flex: 1,
                          color: isBest ? 'grey.900' : 'grey.700',
                          fontSize: '0.75rem',
                          fontWeight: isBest ? 700 : 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.experimentName}
                      </Typography>
                      <Box
                        sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: 1.5,
                          bgcolor: isBest ? '#fef3c7' : '#f3f4f6',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'grey.600',
                            fontSize: '0.75rem',
                            fontVariantNumeric: 'tabular-nums',
                            fontFamily: '"Roboto Mono", monospace',
                          }}
                        >
                          {typeof item.value === 'number' ? item.value.toFixed(3) : '—'}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: 14,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                        }}
                      >
                        {isBest && <Star sx={{ fontSize: 14, color: '#f59e0b' }} />}
                      </Box>
                    </Stack>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

export default MetricSummaryCards;
