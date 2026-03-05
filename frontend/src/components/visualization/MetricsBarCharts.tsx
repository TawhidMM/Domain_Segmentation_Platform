import React, { useMemo, useCallback } from 'react';
import { Box, Button, Typography } from '@mui/material';
import MetricBarChart from './MetricBarChart';
import { METRIC_CONFIG } from '@/config/metricsConfig';
import { useMetricsAnalysis } from '@/hooks/useMetricsAnalysis';
import { ExperimentMetrics, ExperimentResult } from '@/types';
import { exportComparisonMetricSvg } from '@/services/experimentService';
import { toast } from 'sonner';

interface MetricsBarChartsProps {
  metrics: Array<{
    id: string;
    metrics: ExperimentMetrics | null;
    result: ExperimentResult | null;
  }>;
  jobIds: string[];
  comparisonPayload: string;
  onDownloadAll: () => void;
}

const CHART_COLORS = [
  '#4f46e5',
  '#0ea5e9',
  '#14b8a6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
];

const MetricsBarCharts: React.FC<MetricsBarChartsProps> = ({ metrics, jobIds, comparisonPayload, onDownloadAll }) => {
  const { isBestValue } = useMetricsAnalysis({ jobs: metrics });

  const jobMap = useMemo(() => {
    const map: Record<string, { toolName: string; jobId: string; metrics: ExperimentMetrics | null }> = {};
    jobIds.forEach((jobId, index) => {
      const job = metrics.find((j) => j.id === jobId);
      const toolName = job?.result?.toolName || `Experiment ${index + 1}`;
      map[jobId] = { toolName, jobId, metrics: job?.metrics || null };
    });
    return map;
  }, [metrics, jobIds]);

  const colorByJobId = useMemo(() => {
    const colors: Record<string, string> = {};
    jobIds.forEach((jobId, index) => {
      colors[jobId] = CHART_COLORS[index % CHART_COLORS.length];
    });
    return colors;
  }, [jobIds]);

  const chartDataByMetric = useMemo(() => {
    const data: Record<string, Array<{ jobId: string; toolName: string; value: number | null }>> = {};
    METRIC_CONFIG.forEach((metric) => {
      data[metric.key] = jobIds.map((jobId) => {
        const job = jobMap[jobId];
        return {
          jobId,
          toolName: job?.toolName || jobId,
          value: job?.metrics?.[metric.key as keyof ExperimentMetrics] ?? null,
        };
      });
    });
    return data;
  }, [jobIds, jobMap]);

  const downloadHandlers = useMemo(() => {
    const handlers: Record<string, () => Promise<void>> = {};
    METRIC_CONFIG.forEach((metric) => {
      handlers[metric.key] = async () => {
        try {
          const blob = await exportComparisonMetricSvg(comparisonPayload, metric.key);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${metric.key}_comparison.svg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Failed to export metric SVG:', error);
          toast.error('Failed to export SVG. Please try again.');
        }
      };
    });
    return handlers;
  }, [comparisonPayload]);

  const handleDownload = useCallback(
    (metricKey: string) => {
      const handler = downloadHandlers[metricKey];
      if (handler) {
        handler();
      }
    },
    [downloadHandlers]
  );

  const metricCards = useMemo(() => {
    return METRIC_CONFIG.map((metric) => {
      const subtitle = metric.better === 'higher' ? '(higher is better)' : '(lower is better)';
      const bestJobIds = jobIds.filter((jobId) => isBestValue(metric.key, jobId));

      return (
        <MetricBarChart
          key={metric.key}
          title={metric.label}
          subtitle={subtitle}
          metricKey={metric.key}
          data={chartDataByMetric[metric.key] || []}
          colorByJobId={colorByJobId}
          bestJobIds={bestJobIds}
          onDownload={handleDownload}
        />
      );
    });
  }, [chartDataByMetric, colorByJobId, handleDownload, isBestValue, jobIds]);

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'grey.900' }}>
          Metric Charts
        </Typography>
        <Button variant="contained" onClick={onDownloadAll} sx={{ textTransform: 'none' }}>
          Download All Metrics (ZIP)
        </Button>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2.5,
        }}
      >
        {metricCards}
      </Box>
    </Box>
  );
};

export default MetricsBarCharts;
