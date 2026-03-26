import React, { useMemo } from 'react';
import { Box, Card, CardContent, IconButton, Typography, Tooltip } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface MetricBarChartDataItem {
  jobId: string;
  toolName: string;
  value: number | null;
}

interface MetricBarChartProps {
  title: string;
  subtitle: string;
  metricKey: string;
  data: MetricBarChartDataItem[];
  colorByJobId: Record<string, string>;
  bestJobIds: string[];
  onDownload: (metricKey: string) => void;
}

const ToolNameTick: React.FC<{
  x?: number;
  y?: number;
  payload?: { value: string; index: number };
  data: MetricBarChartDataItem[];
  bestJobIds: string[];
}> = ({ x = 0, y = 0, payload, data, bestJobIds }) => {
  const value = payload?.value ?? '';
  const index = payload?.index ?? 0;
  const jobId = data[index]?.jobId ?? '';
  const isBest = bestJobIds.includes(jobId);

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="middle"
        fontSize={isBest ? 12 : 11}
        fontWeight={isBest ? 700 : 500}
        fill={isBest ? '#111827' : '#6b7280'}
      >
        <title>{jobId}</title>
        {value}
      </text>
    </g>
  );
};

const MetricTooltip: React.FC<{ active?: boolean; payload?: any[] }> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload as MetricBarChartDataItem | undefined;
  const value = payload[0]?.value as number | undefined;

  return (
    <Box
      sx={{
        bgcolor: 'white',
        border: '1px solid',
        borderColor: 'grey.200',
        px: 1.5,
        py: 1,
        borderRadius: 1,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        fontSize: '0.75rem',
      }}
    >
      <Typography variant="caption" sx={{ color: 'grey.700', display: 'block' }}>
        {item?.toolName}
      </Typography>
      <Typography variant="caption" sx={{ color: 'grey.500', display: 'block' }}>
        {item?.jobId}
      </Typography>
      <Typography variant="caption" sx={{ color: 'grey.900', fontWeight: 600 }}>
        {value !== undefined ? value.toFixed(3) : '—'}
      </Typography>
    </Box>
  );
};

interface CustomBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: MetricBarChartDataItem;
  bestJobIds: string[];
  colorByJobId: Record<string, string>;
}

const CustomBar: React.FC<CustomBarProps> = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
  bestJobIds,
  colorByJobId,
}) => {
  const isBest = payload && bestJobIds.includes(payload.jobId);
  const jobId = payload?.jobId || '';
  const fill = colorByJobId[jobId] || '#94a3b8';
  const strokeColor = isBest ? '#0f172a' : 'transparent';
  const strokeWidth = isBest ? 2 : 0;
  const opacity = isBest ? 1 : 0.82;


  const normalizedHeight = Math.abs(height);
  const normalizedY = height < 0 ? y + height : y;

  return (
    <g>
      {/* Main bar with colorful fill preserved */}
      <rect
        x={x}
        y={normalizedY}
        width={width}
        height={normalizedHeight}
        fill={fill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
        rx={3}
        ry={3}
      />
      {/* Subtle top marker for best bar */}
      {isBest && (
        <line
          x1={x + width / 2 - 4}
          y1={y - 5}
          x2={x + width / 2 + 4}
          y2={y - 5}
          stroke="#0f172a"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.9}
        />
      )}
    </g>
  );
};

const MetricBarChart: React.FC<MetricBarChartProps> = ({
  title,
  subtitle,
  metricKey,
  data,
  colorByJobId,
  bestJobIds,
  onDownload,
}) => {
  const handleDownloadClick = useMemo(() => {
    return () => onDownload(metricKey);
  }, [onDownload, metricKey]);

  // Custom bar shape handles all rendering with top marker and color preservation

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: 'grey.200',
        bgcolor: 'white',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'grey.900' }}>
              {title}
            </Typography>
            <Typography variant="caption" sx={{ color: 'grey.600', letterSpacing: '0.01em' }}>
              {subtitle}
            </Typography>
          </Box>
          <Tooltip title="Download SVG">
            <IconButton
              size="small"
              onClick={handleDownloadClick}
              sx={{ color: 'grey.600' }}
              aria-label={`Download ${title} SVG`}
            >
              <DownloadIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis
                dataKey="toolName"
                tick={<ToolNameTick data={data} bestJobIds={bestJobIds} />}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <RechartsTooltip content={<MetricTooltip />} />
              <Bar
                dataKey="value"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
                shape={<CustomBar bestJobIds={bestJobIds} colorByJobId={colorByJobId} />}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MetricBarChart;
