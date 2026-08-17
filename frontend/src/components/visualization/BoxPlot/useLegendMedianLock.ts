import { useCallback } from 'react';

export function useLegendMedianLock(chartRef: { current: any }) {
  return useCallback(
    (params: { name?: string; selected?: Record<string, boolean> }) => {
      if (!chartRef.current || params.name !== 'Median') {
        return;
      }

      const isSelected = params.selected?.Median ?? true;
      if (!isSelected) {
        chartRef.current.dispatchAction({ type: 'legendSelect', name: 'Median' });
      }
    },
    [chartRef]
  );
}
