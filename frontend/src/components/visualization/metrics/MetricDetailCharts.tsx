import React, { useMemo, useRef, useLayoutEffect, useState } from 'react';
import { Box, Typography, Chip, Stack, Alert, Paper } from '@mui/material';
import MetricBarChart from '@/components/visualization/MetricBarChart';
import BoxPlot from '@/components/visualization/BoxPlot';
import { METRIC_CONFIG, UNIFIED_CHART_COLORS } from '@/config/metricsConfig';
import { AllExperimentRunMetrics } from '@/hooks/useMultiExperimentBestRuns';
import { calculateStats, findBestJobIds } from '@/utils/metricsUtils';

const MIN_BAR_ITEM = 56;
const MIN_BOX_ITEM = 88;

type ChartLayout = 'side-by-side' | 'stacked-full-width' | 'stacked-scroll';

function getChartLayout(containerWidth: number, experimentCount: number): ChartLayout {
  if (containerWidth / 2 >= experimentCount * MIN_BOX_ITEM) return 'side-by-side';
  if (containerWidth >= experimentCount * MIN_BOX_ITEM) return 'stacked-full-width';
  return 'stacked-scroll';
}

interface MetricDetailChartsProps {
  experimentMetrics: Array<{
    experimentId: string;
    toolName: string;
    totalRuns: number;
    metricsData: AllExperimentRunMetrics | null;
  }>;
  experimentIds: string[];
  selectedMetric: string;
}

const MetricDetailCharts: React.FC<MetricDetailChartsProps> = ({
  experimentMetrics,
  experimentIds,
  selectedMetric,
}) => {
  const metricConfig = METRIC_CONFIG.find((m) => m.key === selectedMetric);
  const metricKey = metricConfig?.key ?? '';
  const metricBetter = (metricConfig?.better ?? 'higher') as 'higher' | 'lower';

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    experimentIds.forEach((expId, idx) => {
      map[expId] = UNIFIED_CHART_COLORS[idx % UNIFIED_CHART_COLORS.length];
    });
    return map;
  }, [experimentIds]);

  const chartData = useMemo(() => {
    return experimentIds.map((expId) => {
      const exp = experimentMetrics.find((m) => m.experimentId === expId);
      if (!exp?.metricsData?.runs) {
        return { jobId: expId, toolName: exp?.toolName || expId, value: null };
      }
      const values = exp.metricsData.runs
        .map((run) => run.metrics[metricKey as keyof typeof run.metrics])
        .filter((v): v is number => typeof v === 'number' && !isNaN(v));
      if (values.length === 0) {
        return { jobId: expId, toolName: exp?.toolName || expId, value: null };
      }
      const { mean } = calculateStats(values);
      return { jobId: expId, toolName: exp?.toolName || expId, value: mean };
    });
  }, [experimentMetrics, experimentIds, metricKey]);

  const boxPlotData = useMemo(() => {
    return experimentIds
      .map((expId) => {
        const exp = experimentMetrics.find((m) => m.experimentId === expId);
        if (!exp?.metricsData?.runs || exp.metricsData.runs.length <= 1) {
          return null;
        }
        const values = exp.metricsData.runs
          .map((run) => run.metrics[metricKey as keyof typeof run.metrics])
          .filter((v): v is number => typeof v === 'number' && !isNaN(v));
        if (values.length === 0) return null;
        return {
          experimentId: expId,
          toolName: exp?.toolName || expId,
          values,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [experimentMetrics, experimentIds, metricKey]);

  const bestJobIds = useMemo(() => findBestJobIds(chartData, metricBetter), [chartData, metricBetter]);
  const hasMultipleRuns = boxPlotData.length > 0;

  const gridRef = useRef<HTMLDivElement>(null!);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const experimentCount = experimentIds.length;
  const layout: ChartLayout =
    containerWidth > 0 && hasMultipleRuns
      ? getChartLayout(containerWidth, experimentCount)
      : hasMultipleRuns
      ? 'side-by-side'
      : 'stacked-full-width';

  if (!metricConfig) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Select a metric to view charts.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      {/* Charts grid */}
      <Box
        ref={gridRef}
        sx={{
          display: 'grid',
          gridTemplateColumns: hasMultipleRuns && layout === 'side-by-side' ? '1fr 1fr' : '1fr',
          gap: 3,
          alignItems: 'stretch',
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Bar chart */}
        <Box
          sx={{
            overflowX: layout === 'stacked-scroll' ? 'auto' : undefined,
            minWidth: 0,
            height: '100%',
            minHeight: 0,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2,
              borderColor: 'grey.200',
              bgcolor: 'white',
              p: 2.5,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'grey.900', mb: 1.5 }}>
              {metricConfig.label} — Average ({metricConfig.better === 'higher' ? '↑ higher' : '↓ lower'} is better)
            </Typography>
            <Box sx={{
                flex: 1,
                minHeight: 0,
                width: '100%'
            }}>
              <Box
                sx={{
                  height: '100%',
                  minWidth: layout === 'stacked-scroll' ? experimentCount * MIN_BAR_ITEM : undefined,
                  width: layout === 'stacked-scroll' ? undefined : '100%',
                }}
              >
                <MetricBarChart
                  title=""
                  subtitle=""
                  metricKey={metricConfig.key}
                  data={chartData}
                  colorByJobId={colorMap}
                  bestJobIds={bestJobIds}
                  onDownload={() => {}}
                />
              </Box>
            </Box>
          </Paper>
        </Box>

        {hasMultipleRuns && (
          <Box
            sx={{
              overflowX: layout === 'stacked-scroll' ? 'auto' : undefined,
              minWidth: 0,
              height: '100%',
              minHeight: 0,
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                borderColor: 'grey.200',
                bgcolor: 'white',
                p: 2.5,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'grey.900', mb: 1.5 }}>
                {metricConfig.label} — Distribution ({metricConfig.better === 'higher' ? '↑ higher' : '↓ lower'} is better)
              </Typography>
              <Box
                sx={{
                  overflowX: layout === 'stacked-scroll' ? 'auto' : undefined,
                  flex: 1,
                  minHeight: 0,
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    minWidth: layout === 'stacked-scroll' ? experimentCount * MIN_BOX_ITEM : undefined,
                    width: layout === 'stacked-scroll' ? undefined : '100%',
                  }}
                >
                  <BoxPlot
                    scroll={layout === 'stacked-scroll'}
                    metricLabel={metricConfig.label}
                    direction={metricConfig.better as 'higher' | 'lower'}
                    experimentData={boxPlotData}
                    showTitle={false}
                  />
                </Box>
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MetricDetailCharts;
