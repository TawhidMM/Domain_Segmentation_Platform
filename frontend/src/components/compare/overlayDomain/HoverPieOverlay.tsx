import React, { useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { AnimatePresence, motion, MotionValue, useSpring } from 'framer-motion';
import { OverlayDomainExperiment, OverlayDomainSpot } from './useOverlayDomainData';

interface HoverPieOverlayProps {
  hoveredSpot: OverlayDomainSpot | null;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  orderedExperiments: OverlayDomainExperiment[];
  domainColorMap: Record<number, string>;
}

function buildConicGradient(domains: number[], domainColorMap: Record<number, string>): string {
  if (domains.length === 0) {
    return '#CBD5E1';
  }

  const segmentAngle = 360 / domains.length;
  const stops = domains.map((domain, index) => {
    const start = (index * segmentAngle).toFixed(2);
    const end = ((index + 1) * segmentAngle).toFixed(2);
    const color = domainColorMap[domain] ?? '#94A3B8';
    return `${color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${stops.join(', ')})`;
}

const HoverPieOverlay: React.FC<HoverPieOverlayProps> = ({
  hoveredSpot,
  mouseX,
  mouseY,
  orderedExperiments,
  domainColorMap,
}) => {
  const smoothMouseX = useSpring(mouseX, { stiffness: 500, damping: 45, mass: 0.25 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 500, damping: 45, mass: 0.25 });

  const pieGradient = useMemo(() => {
    if (!hoveredSpot) {
      return '#CBD5E1';
    }

    return buildConicGradient(hoveredSpot.domainsInOrder, domainColorMap);
  }, [domainColorMap, hoveredSpot]);

  return (
    <AnimatePresence>
      {hoveredSpot && (
        <Box
          component={motion.div}
          key={hoveredSpot.spotId}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          style={{ x: smoothMouseX, y: smoothMouseY }}
          sx={{
            position: 'absolute',
            left: 18,
            top: 18,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 1.5,
              minWidth: 220,
              borderRadius: 2,
              border: '1px solid #DDE6F1',
              bgcolor: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(2px)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: pieGradient,
                  border: '2px solid #E2E8F0',
                  flexShrink: 0,
                }}
              />

              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  Spot {hoveredSpot.spotId}
                </Typography>
                <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {orderedExperiments.map((experiment, index) => {
                    const domain = hoveredSpot.domainsInOrder[index] ?? -1;
                    const color = domainColorMap[domain] ?? '#94A3B8';

                    return (
                      <Box key={experiment.experimentId} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: color, flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ color: '#0F172A' }}>
                          {experiment.experimentName} domain {domain >= 0 ? domain : 'N/A'}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}
    </AnimatePresence>
  );
};

export default HoverPieOverlay;
