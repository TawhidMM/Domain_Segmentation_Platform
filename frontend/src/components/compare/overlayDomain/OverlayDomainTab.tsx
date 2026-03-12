import React, { useCallback, useState } from 'react';
import { Alert, Box, CircularProgress, Paper, Typography } from '@mui/material';
import { useMotionValue } from 'framer-motion';
import OverlayDomainCanvas from './OverlayDomainCanvas';
import HoverPieOverlay from './HoverPieOverlay';
import OverlayLegend from './OverlayLegend';
import {
  OverlayDomainSpot,
  OverlayDomainToolSelection,
  useOverlayDomainData,
} from './useOverlayDomainData';

interface OverlayDomainTabProps {
  tools: OverlayDomainToolSelection[];
}

const OVERLAY_SPOT_RADIUS = 8;

const OverlayDomainTab: React.FC<OverlayDomainTabProps> = ({ tools }) => {
  const { loading, error, spots, domainIds, domainColorMap, orderedExperiments } = useOverlayDomainData(tools);
  const [hoveredSpot, setHoveredSpot] = useState<OverlayDomainSpot | null>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMousePositionChange = useCallback(
    (position: { x: number; y: number }) => {
      mouseX.set(position.x);
      mouseY.set(position.y);
    },
    [mouseX, mouseY],
  );

  if (tools.length < 2) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Select at least two experiments to build the overlay domain map.
        </Typography>
      </Paper>
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          py: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Building overlay domain map...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
      {error && <Alert severity="error">{error}</Alert>}

      {spots.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No common spots were found across the selected experiments.
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 300px' },
            gap: 2,
            alignItems: 'stretch',
            minHeight: 520,
            flex: 1,
          }}
        >
          <Box sx={{ position: 'relative', minHeight: 520 }}>
            <OverlayDomainCanvas
              spots={spots}
              domainColorMap={domainColorMap}
              spotRadius={OVERLAY_SPOT_RADIUS}
              onHoveredSpotChange={setHoveredSpot}
              onMousePositionChange={handleMousePositionChange}
            />
            <HoverPieOverlay
              hoveredSpot={hoveredSpot}
              mouseX={mouseX}
              mouseY={mouseY}
              orderedExperiments={orderedExperiments}
              domainColorMap={domainColorMap}
            />
          </Box>

          <OverlayLegend
            domainIds={domainIds}
            domainColorMap={domainColorMap}
            orderedExperiments={orderedExperiments}
          />
        </Box>
      )}
    </Box>
  );
};

export default OverlayDomainTab;
