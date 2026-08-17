import type { EChartsOption } from 'echarts';
import {
  AXIS_LABEL_COLOR,
  AXIS_LINE_COLOR,
  AXIS_TEXT_COLOR,
  DATA_ZOOM_BORDER_COLOR,
  DATA_ZOOM_FILLER_COLOR,
  DATA_ZOOM_HANDLE_COLOR,
  FONT_STACK,
  GRID_BACKGROUND_END,
  GRID_BACKGROUND_START,
  GRID_LINE_COLOR,
  LEGEND_TEXT_COLOR,
  MONOSPACE_FONT,
  TITLE_COLOR,
  TOOLTIP_BACKGROUND,
  TOOLTIP_BORDER_COLOR,
  TOOLTIP_TEXT_COLOR,
} from './BoxPlot.constants';
import { buildBoxSeries, buildDataPointsSeries, buildMeanSeries, buildMedianSeries, buildSingleRunSeries } from './boxPlotSeries';
import { buildLegendData } from './boxPlotLegend';
import type { PreparedBoxPlotDatum } from './BoxPlot.types';

interface BuildBoxPlotOptionParams {
  prepared: PreparedBoxPlotDatum[];
  categories: string[];
  metricLabel: string;
  direction: 'higher' | 'lower';
  showTitle: boolean;
  scroll: boolean;
}

export function buildBoxPlotOption({
  prepared,
  categories,
  metricLabel,
  direction,
  showTitle,
  scroll,
}: BuildBoxPlotOptionParams): EChartsOption {
  const hasSingleRun = prepared.some((d) => d.type === 'point');
  const colors = prepared.map((item) => (item.type === 'box' ? item.color : item.color));

  const titleOption = showTitle
    ? {
        text: `${metricLabel} Distribution ${direction === 'higher' ? '↑' : '↓'}`,
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 14,
          fontWeight: 700,
          color: TITLE_COLOR,
          fontFamily: FONT_STACK,
        },
      }
    : {};

  const tooltipFormatter = (params: {
    name: string;
    componentSubType?: string;
    value: number[];
    data?: {
      stats?: {
        mean?: number;
        median?: number;
        whiskerMin?: number;
        whiskerMax?: number;
        min?: number;
        max?: number;
        q1?: number;
        q3?: number;
      };
    };
  }) => {
    if (params.componentSubType === 'boxplot') {
      const s = params.data?.stats;
      const fmt = (v: number | undefined) => (typeof v === 'number' ? v.toFixed(4) : 'N/A');
      return `<strong>${params.name}</strong><br/>
        Whisker Min: ${fmt(s?.whiskerMin)}<br/>
        Q1: ${fmt(s?.q1)}<br/>
        Median: ${fmt(s?.median)} ─ <br/>
        Mean: ${fmt(s?.mean)} - - <br/>
        Q3: ${fmt(s?.q3)}<br/>
        Whisker Max: ${fmt(s?.whiskerMax)}<br/>
        Min/Max: ${fmt(s?.min)} / ${fmt(s?.max)}`;
    }
    return params.name;
  };

  return {
    ...(showTitle ? { title: titleOption } : {}),
    tooltip: {
      trigger: 'item',
      backgroundColor: TOOLTIP_BACKGROUND,
      borderColor: TOOLTIP_BORDER_COLOR,
      borderWidth: 1,
      textStyle: {
        color: TOOLTIP_TEXT_COLOR,
        fontFamily: FONT_STACK,
        fontSize: 12,
      },
      formatter: tooltipFormatter,
    },
    grid: {
      left: 70,
      right: 30,
      top: 90,
      bottom: 60,
      containLabel: false,
      backgroundColor: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: GRID_BACKGROUND_START },
          { offset: 1, color: GRID_BACKGROUND_END },
        ],
      },
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        fontSize: 12,
        color: AXIS_TEXT_COLOR,
        fontFamily: FONT_STACK,
        fontWeight: 500,
      },
      axisLine: {
        lineStyle: {
          color: AXIS_LINE_COLOR,
          width: 2,
        },
      },
      splitLine: {
        show: false,
      },
      axisTick: {
        lineStyle: {
          color: AXIS_LINE_COLOR,
        },
      },
    },
    yAxis: {
      type: 'value',
      scale: true,
      boundaryGap: ['10%', '10%'],
      nameGap: 15,
      nameTextStyle: {
        color: TITLE_COLOR,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: FONT_STACK,
      },
      axisLabel: {
        fontSize: 11,
        color: AXIS_LABEL_COLOR,
        fontFamily: MONOSPACE_FONT,
        formatter: (value: number) => value.toFixed(3),
      },
      axisLine: {
        lineStyle: {
          color: AXIS_LINE_COLOR,
          width: 2,
        },
      },
      splitLine: {
        lineStyle: {
          color: GRID_LINE_COLOR,
          type: 'dashed',
          dashOffset: 5,
        },
      },
      axisTick: {
        lineStyle: {
          color: AXIS_LINE_COLOR,
        },
      },
    },
    series: [
      buildBoxSeries(prepared, colors),
      buildMedianSeries(),
      buildDataPointsSeries(prepared),
      buildMeanSeries(prepared),
      ...(hasSingleRun ? [buildSingleRunSeries(prepared, colors)] : []),
    ],
    legend: {
      data: buildLegendData(hasSingleRun),
      top: 13,
      right: 12,
      orient: 'horizontal',
      textStyle: {
        color: LEGEND_TEXT_COLOR,
        fontSize: 12,
        fontFamily: FONT_STACK,
      },
      itemGap: 14,
      itemWidth: 22,
      itemHeight: 11,
      padding: [2, 6],
    },
    ...(scroll
      ? {
          dataZoom: [
            {
              type: 'slider' as const,
              xAxisIndex: 0,
              start: 0,
              end: 100,
              height: 12,
              bottom: 0,
              borderColor: DATA_ZOOM_BORDER_COLOR,
              fillerColor: DATA_ZOOM_FILLER_COLOR,
              handleStyle: { color: DATA_ZOOM_HANDLE_COLOR },
            },
            {
              type: 'inside' as const,
              xAxisIndex: 0,
              start: 0,
              end: 100,
            },
          ],
        }
      : {}),
  } as EChartsOption;
}
