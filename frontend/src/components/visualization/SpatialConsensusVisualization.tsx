import React, { useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { ConsensusResponse } from '@/types';
import SpatialConsensusPlot from './SpatialConsensusPlot';
import ViewModeToggle from '@/components/shared/ViewModeToggle';

type ConsensusMode = 'consensus' | 'confidence' | 'combined';

interface Spot {
  x: number;
  y: number;
  consensus_domain: string | number;
  confidence: number;
}

interface SpatialConsensusVisualizationProps {
  data: ConsensusResponse | null;
  isLoading?: boolean;
  domainColors?: Record<string, string>;
}

const SpatialConsensusVisualization: React.FC<SpatialConsensusVisualizationProps> = ({
  data,
  isLoading = false,
  domainColors,
}) => {
  const [mode, setMode] = useState<ConsensusMode>('consensus');

  const spotCount = data?.spots?.length ?? 0;
  const metadataSpotCount = data?.metadata?.num_spots ?? 0;

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      minHeight: 0, 
      gap: 1.5, 
      width: '100%', 
      maxWidth: 1200, 
      mx: 'auto' 
    }}>
      {/* Control Bar */}
      <Paper
        variant="outlined"
        sx={{
          p: 1.25,
          borderColor: 'grey.200',
          bgcolor: '#f8f9fa',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'grey.900' }}>
            View Mode
          </Typography>
          <ViewModeToggle
            value={mode}
            options={[
              { value: 'consensus', label: 'Consensus' },
              { value: 'confidence', label: 'Confidence' },
              { value: 'combined', label: 'Combined' },
            ]}
            onChange={setMode}
            ariaLabel="consensus view mode"
          />
        </Box>

        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {(metadataSpotCount || spotCount).toLocaleString()} spots
        </Typography>
      </Paper>

      {/* Visualization using Plotly scattergl — fills remaining height */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'grey.200',
          overflow: 'hidden',
        }}
      >
        <SpatialConsensusPlot
          spots={data?.spots ?? null}
          mode={mode}
          isLoading={isLoading}
          domainColors={domainColors}
        />
      </Box>

      {/* Info Footer */}
      <Box
        sx={{
          p: 1,
          bgcolor: 'grey.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'grey.100',
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          {mode === 'consensus' && (
            <>
              <strong>Consensus Mode:</strong> Each spot colored by its assigned domain label. Hover to see coordinates
              and domain information.
            </>
          )}
          {mode === 'confidence' && (
            <>
              <strong>Confidence Mode:</strong> Spots colored by confidence scores using Viridis colormap (dark blue =
              low, bright yellow = high). Color bar shows the confidence scale.
            </>
          )}
          {mode === 'combined' && (
            <>
              <strong>Combined Mode:</strong> Domain colors with opacity controlled by confidence. Minimum opacity of 25%
              prevents low-confidence spots from disappearing.
            </>
          )}
          <br />
        </Typography>
      </Box>
    </Box>
  );
};

export default SpatialConsensusVisualization;
