import React, { useMemo } from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import MetricBarChart from './MetricBarChart';
import BoxPlot from './BoxPlot';
import { METRIC_CONFIG, UNIFIED_CHART_COLORS } from '@/config/metricsConfig';
import { AllExperimentRunMetrics } from '@/hooks/useMultiExperimentBestRuns';
import { calculateStats, findBestJobIds } from '@/utils/metricsUtils';

interface MetricsBarChartsProps {
  experimentMetrics: Array<{
    experimentId: string;
    toolName: string;
    totalRuns: number;
    metricsData: AllExperimentRunMetrics | null;
  }>;
  experimentIds: string[];
  onDownloadAll: () => void;
  isLoading?: boolean;
}

const MetricsBarCharts: React.FC<MetricsBarChartsProps> = ({
  experimentMetrics,
  experimentIds,
  onDownloadAll,
  isLoading = false,
}) => {
  // Check if any experiment has multiple runs
  const hasMultipleRuns = useMemo(() => {
    return experimentMetrics.some((exp) => (exp.totalRuns ?? 0) > 1);
  }, [experimentMetrics]);

  // Build bar chart data (using average for multi-run experiments)
  const chartDataByMetric = useMemo(() => {
    const data: Record<string, Array<{ jobId: string; toolName: string; value: number | null }>> = {};

    METRIC_CONFIG.forEach((metric) => {
      data[metric.key] = experimentIds.map((expId) => {
        const exp = experimentMetrics.find((m) => m.experimentId === expId);
        if (!exp?.metricsData?.runs) {
          return {
            jobId: expId,
            toolName: exp?.toolName || expId,
            value: null,
          };
        }

        const values = exp.metricsData.runs
          .map((run) => run.metrics[metric.key as keyof typeof run.metrics])
          .filter((v): v is number => typeof v === 'number' && !isNaN(v));

        if (values.length === 0) {
          return {
            jobId: expId,
            toolName: exp?.toolName || expId,
            value: null,
          };
        }

        const { mean } = calculateStats(values);
        return {
          jobId: expId,
          toolName: exp?.toolName || expId,
          value: mean,
        };
      });
    });

    return data;
  }, [experimentIds, experimentMetrics]);

  // Build box plot data (for experiments with multiple runs)
  const boxPlotDataByMetric = useMemo(() => {
    const data: Record<string, Array<{ experimentId: string; toolName: string; values: number[] }>> = {};

    METRIC_CONFIG.forEach((metric) => {
      data[metric.key] = experimentIds
        .map((expId) => {
          const exp = experimentMetrics.find((m) => m.experimentId === expId);
          if (!exp?.metricsData?.runs || (exp.totalRuns ?? 0) <= 1) {
            return null;
          }

          const values = exp.metricsData.runs
            .map((run) => run.metrics[metric.key as keyof typeof run.metrics])
            .filter((v): v is number => typeof v === 'number' && !isNaN(v));

          return {
            experimentId: expId,
            toolName: exp?.toolName || expId,
            values,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    });

    return data;
  }, [experimentIds, experimentMetrics]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'grey.900' }}>
          {hasMultipleRuns ? 'Metrics Comparison (Averages & Distributions)' : 'Average Metrics'}
        </Typography>
        <Button variant="contained" onClick={onDownloadAll} sx={{ textTransform: 'none' }}>
          Download Metrics
        </Button>
      </Box>

      {/* Metrics Grid - Bar Charts and Box Plots Side by Side */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {METRIC_CONFIG.map((metric) => {
          const subtitle = metric.better === 'higher' ? '(higher is better)' : '(lower is better)';
          const chartData = chartDataByMetric[metric.key] || [];
          const boxData = boxPlotDataByMetric[metric.key] || [];
          
          const colorMap: Record<string, string> = {};
          experimentIds.forEach((expId, idx) => {
            colorMap[expId] = UNIFIED_CHART_COLORS[idx % UNIFIED_CHART_COLORS.length];
          });

          // Determine best job ID based on metric direction using utility function
          const bestJobIds = findBestJobIds(chartData, metric.better);

          return (
            <Box
              key={`metric-${metric.key}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: hasMultipleRuns && boxData.length > 0 ? '1fr 1fr' : '1fr',
                gap: 3,
                alignItems: 'center',
              }}
            >
              {/* Bar Chart */}
              <MetricBarChart
                title={metric.label}
                subtitle={subtitle}
                metricKey={metric.key}
                data={chartData}
                colorByJobId={colorMap}
                bestJobIds={bestJobIds}
                onDownload={() => {}}
              />

              {/* Box Plot (only if multiple runs) */}
              {hasMultipleRuns && boxData.length > 0 && (
                <BoxPlot
                  metricKey={metric.key}
                  metricLabel={metric.label}
                  direction={metric.better as 'higher' | 'lower'}
                  experimentData={boxData}
                  height={380}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default MetricsBarCharts;
