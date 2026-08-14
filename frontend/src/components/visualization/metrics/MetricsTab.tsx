import React, { useState, useMemo } from 'react';
import { Box, Typography, Button, Stack, Skeleton, Tabs, Tab, Chip, Paper } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import MetricSummaryCards from './MetricSummaryCards';
import MetricDetailCharts from './MetricDetailCharts';
import MetricsTable from '@/components/visualization/MetricsTable';
import { METRIC_CONFIG, UNIFIED_CHART_COLORS } from '@/config/metricsConfig';
import { AllExperimentRunMetrics } from '@/hooks/useMultiExperimentBestRuns';

export type MetricsView = 'overview' | 'table' | 'charts';

interface MetricsTabProps {
  experimentMetrics: Array<{
    experimentId: string;
    toolName: string;
    totalRuns: number;
    metricsData: AllExperimentRunMetrics | null;
  }>;
  experimentIds: string[];
  onDownloadAll: () => void;
  isExporting?: boolean;
}

const MetricsTab: React.FC<MetricsTabProps> = ({
  experimentMetrics,
  experimentIds,
  onDownloadAll,
  isExporting = false,
}) => {
  const [view, setView] = useState<MetricsView>('overview');
  const [selectedMetric, setSelectedMetric] = useState<string>(METRIC_CONFIG[0]?.key || '');

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    experimentIds.forEach((expId, idx) => {
      map[expId] = UNIFIED_CHART_COLORS[idx % UNIFIED_CHART_COLORS.length];
    });
    return map;
  }, [experimentIds]);

  const isLoading = experimentMetrics.some((m) => !m.metricsData && experimentIds.length > 0);
  const hasAnyData = experimentMetrics.some((m) => m.metricsData !== null);

  const renderContent = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={400} />
        </Box>
      );
    }

    if (!hasAnyData) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">No metrics data available for the selected experiments.</Typography>
        </Box>
      );
    }

    switch (view) {
      case 'overview':
        return (
          <MetricSummaryCards
            experimentMetrics={experimentMetrics}
            experimentIds={experimentIds}
            onSelectMetric={(key) => {
              setSelectedMetric(key);
              setView('charts');
            }}
            selectedMetric={selectedMetric}
          />
        );
      case 'table':
        return (
          <MetricsTable
            experimentMetrics={experimentMetrics}
            experimentIds={experimentIds}
          />
        );
      case 'charts':
        return (
          <MetricDetailCharts
            experimentMetrics={experimentMetrics}
            experimentIds={experimentIds}
            selectedMetric={selectedMetric}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Paper
        elevation={0}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: 3,
          py: 1.5,
          mb: 3,
          borderRadius: 0,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'grey.900' }}>
              Compare Metrics
            </Typography>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {experimentIds.map((expId, idx) => {
                const exp = experimentMetrics.find((m) => m.experimentId === expId);
                const toolName = exp?.toolName || `Experiment ${idx + 1}`;
                return (
                  <Chip
                    key={expId}
                    size="small"
                    label={toolName}
                    sx={{
                      bgcolor: colorMap[expId] || '#94a3b8',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 24,
                    }}
                  />
                );
              })}
            </Stack>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={onDownloadAll}
              disabled={isExporting || !hasAnyData}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {isExporting ? 'Exporting...' : 'Download Metrics'}
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="space-between" mt={1.5} flexWrap="wrap" gap={1}>
          <Tabs
            value={view}
            onChange={(_, newValue) => setView(newValue)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8125rem',
                minHeight: 36,
                px: 2,
              },
            }}
          >
            <Tab label="Overview" value="overview" />
            <Tab label="Table" value="table" />
            <Tab label="Charts" value="charts" />
          </Tabs>

          {view === 'charts' && (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {METRIC_CONFIG.map((m) => {
                const isActive = selectedMetric === m.key;
                const count = experimentIds.filter((expId) => {
                  const exp = experimentMetrics.find((em) => em.experimentId === expId);
                  if (!exp?.metricsData?.runs) return false;
                  return exp.metricsData.runs.some((run) => {
                    const v = run.metrics[m.key as keyof typeof run.metrics];
                    return typeof v === 'number' && !isNaN(v);
                  });
                }).length;

                return (
                  <Chip
                    key={m.key}
                    label={`${m.label} (${count})`}
                    onClick={() => setSelectedMetric(m.key)}
                    color={isActive ? 'primary' : 'default'}
                    variant={isActive ? 'filled' : 'outlined'}
                    sx={{
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.8125rem',
                      height: 28,
                    }}
                  />
                );
              })}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Box sx={{ flex: 1, overflow: 'auto', px: 0.5 }}>{renderContent()}</Box>
    </Box>
  );
};

export default MetricsTab;
