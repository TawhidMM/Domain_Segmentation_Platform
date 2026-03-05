import React, { useState, useCallback } from 'react';
import { Box, Paper, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import SpatialConsensusPlot from './SpatialConsensusPlot';

interface Spot {
  x: number;
  y: number;
  consensus_domain: string | number;
  confidence: number;
}

interface ConsensusResponse {
  metadata: {
    reference_tool: string;
    num_experiments: number;
  };
  spots: Spot[];
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
  const [mode, setMode] = useState<'consensus' | 'confidence' | 'combined'>('consensus');

  const handleModeChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newMode: string | null) => {
      if (newMode !== null && (newMode === 'consensus' || newMode === 'confidence' || newMode === 'combined')) {
        setMode(newMode);
      }
    },
    [],
  );

  const spotCount = data?.spots?.length ?? 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Control Bar */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderColor: 'grey.200',
          bgcolor: '#f8f9fa',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'grey.900', minWidth: 80 }}>
            View Mode
          </Typography>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            aria-label="consensus view mode"
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontSize: '0.875rem',
                px: 1.5,
                py: 0.75,
                border: '1px solid',
                borderColor: 'grey.300',
                color: 'grey.700',
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  borderColor: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                },
              },
            }}
          >
            <ToggleButton value="consensus">Consensus</ToggleButton>
            <ToggleButton value="confidence">Confidence</ToggleButton>
            <ToggleButton value="combined">Combined</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {spotCount.toLocaleString()} spots • Plotly scattergl
        </Typography>
      </Paper>

      {/* Visualization using Plotly scattergl */}
      <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'grey.200', overflow: 'hidden' }}>
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
          p: 1.5,
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
          <strong>Interactions:</strong> Zoom, pan, and hover over points for details. Double-click to reset view.
        </Typography>
      </Box>
    </Box>
  );
};

export default SpatialConsensusVisualization;
