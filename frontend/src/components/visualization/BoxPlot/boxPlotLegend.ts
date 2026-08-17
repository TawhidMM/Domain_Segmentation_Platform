import {
  BOX_BORDER_COLOR,
  BOX_FILL_COLOR,
  MEAN_COLOR,
  POINT_COLOR,
} from './BoxPlot.constants';

export function buildLegendData(hasSingleRun: boolean): Array<{
  name: string;
  icon?: string;
  itemStyle?: { color: string };
}> {
  return [
    { name: 'Distribution', icon: 'rectangle', itemStyle: { color: BOX_FILL_COLOR } },
    { name: 'Data Points', icon: 'circle', itemStyle: { color: POINT_COLOR } },
    {
      name: 'Median',
      icon: 'path://M-10,-1 L10,-1 L10,1 L-10,1 Z',
      itemStyle: { color: MEAN_COLOR },
    },
    {
      name: 'Mean',
      icon: 'path://M-10,-1 L-3,-1 L-3,1 L-10,1 Z M3,-1 L10,-1 L10,1 L3,1 Z',
      itemStyle: { color: MEAN_COLOR },
    },
    ...(hasSingleRun
      ? [{ name: 'Single Run', icon: 'diamond', itemStyle: { color: BOX_BORDER_COLOR } }]
      : []),
  ];
}
