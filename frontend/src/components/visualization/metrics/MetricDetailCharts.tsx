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
    <Box>
      {/* Metric selector chips */}
      {/*<Stack direction="row" spacing={1} mb={3} flexWrap="wrap" useFlexGap>*/}
      {/*  {METRIC_CONFIG.map((m) => {*/}
      {/*    const isActive = m.key === selectedMetric;*/}
      {/*    const count = experimentIds.filter((expId) => {*/}
      {/*      const exp = experimentMetrics.find((em) => em.experimentId === expId);*/}
      {/*      if (!exp?.metricsData?.runs) return false;*/}
      {/*      return exp.metricsData.runs.some((run) => {*/}
      {/*        const v = run.metrics[m.key as keyof typeof run.metrics];*/}
      {/*        return typeof v === 'number' && !isNaN(v);*/}
      {/*      });*/}
      {/*    }).length;*/}

      {/*    return (*/}
      {/*      <Chip*/}
      {/*        key={m.key}*/}
      {/*        label={`${m.label} (${count})`}*/}
      {/*        onClick={() => {}}*/}
      {/*        color={isActive ? 'primary' : 'default'}*/}
      {/*        variant={isActive ? 'filled' : 'outlined'}*/}
      {/*        sx={{*/}
      {/*          fontWeight: isActive ? 700 : 500,*/}
      {/*          fontSize: '0.8125rem',*/}
      {/*          height: 32,*/}
      {/*        }}*/}
      {/*      />*/}
      {/*    );*/}
      {/*  })}*/}
      {/*</Stack>*/}

      {/* Best callout */}
      {/*{bestJobIds.length > 0 && (*/}
      {/*  <Alert*/}
      {/*    severity="success"*/}
      {/*    sx={{*/}
      {/*      mb: 3,*/}
      {/*      bgcolor: '#f0fdf4',*/}
      {/*      border: '1px solid',*/}
      {/*      borderColor: '#bbf7d0',*/}
      {/*      '& .MuiAlert-icon': { color: '#16a34a' },*/}
      {/*    }}*/}
      {/*  >*/}
      {/*    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>*/}
      {/*      <Typography variant="body2" sx={{ fontWeight: 700, color: '#14532d' }}>*/}
      {/*        Best {metricConfig.label}:*/}
      {/*      </Typography>*/}
      {/*      {bestJobIds.map((jobId, idx) => {*/}
      {/*        const exp = experimentMetrics.find((m) => m.experimentId === jobId);*/}
      {/*        const toolName = exp?.toolName || jobId;*/}
      {/*        const item = chartData.find((c) => c.jobId === jobId);*/}
      {/*        return (*/}
      {/*          <Chip*/}
      {/*            key={jobId}*/}
      {/*            size="small"*/}
      {/*            label={`${toolName}${item && typeof item.value === 'number' ? ` · ${item.value.toFixed(3)}` : ''}`}*/}
      {/*            sx={{*/}
      {/*              bgcolor: colorMap[jobId] || '#94a3b8',*/}
      {/*              color: 'white',*/}
      {/*              fontWeight: 600,*/}
      {/*              fontSize: '0.75rem',*/}
      {/*            }}*/}
      {/*          />*/}
      {/*        );*/}
      {/*      })}*/}
      {/*      <Typography variant="caption" sx={{ color: '#166534', ml: 0.5 }}>*/}
      {/*        ({metricConfig.better === 'higher' ? 'higher' : 'lower'} is better)*/}
      {/*      </Typography>*/}
      {/*    </Box>*/}
      {/*  </Alert>*/}
      {/*)}*/}

      {/* Charts grid */}
      <Box
        ref={gridRef}
        sx={{
          display: 'grid',
          gridTemplateColumns: hasMultipleRuns && layout === 'side-by-side' ? '1fr 1fr' : '1fr',
          gap: 3,
          alignItems: 'start',
        }}
      >
        {/* Bar chart */}
        <Box
          sx={{
            overflowX: layout === 'stacked-scroll' ? 'auto' : undefined,
            minWidth: 0,
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
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'grey.900', mb: 1.5 }}>
              {metricConfig.label} — Average ({metricConfig.better === 'higher' ? '↑ higher' : '↓ lower'} is better)
            </Typography>
            <Box
              sx={{
                overflowX: layout === 'stacked-scroll' ? 'auto' : undefined,
              }}
            >
              <Box
                sx={{
                  height: 320,
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
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'grey.900', mb: 1.5 }}>
                {metricConfig.label} — Distribution ({metricConfig.better === 'higher' ? '↑ higher' : '↓ lower'} is better)
              </Typography>
              <Box
                sx={{
                  overflowX: layout === 'stacked-scroll' ? 'auto' : undefined,
                }}
              >
                <Box
                  sx={{
                    height: 320,
                    minWidth: layout === 'stacked-scroll' ? experimentCount * MIN_BOX_ITEM : undefined,
                    width: layout === 'stacked-scroll' ? undefined : '100%',
                  }}
                >
                  <BoxPlot
                    scroll={layout === 'stacked-scroll'}
                    metricKey={metricConfig.key}
                    metricLabel={metricConfig.label}
                    direction={metricConfig.better as 'higher' | 'lower'}
                    experimentData={boxPlotData}
                    height={320}
                    showTitle={false}
                  />
                </Box>
              </Box>
            </Paper>
          </Box>
        )}

        {!hasMultipleRuns && (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', textAlign: 'center', mt: 1 }}
          >
            Distribution view requires at least 2 runs per experiment. The bar chart above shows the
            average across available runs.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default MetricDetailCharts;
