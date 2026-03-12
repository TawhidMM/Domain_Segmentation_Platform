import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { OverlayDomainExperiment } from './useOverlayDomainData';

interface OverlayLegendProps {
  domainIds: number[];
  domainColorMap: Record<number, string>;
  orderedExperiments: OverlayDomainExperiment[];
}

const OverlayLegend: React.FC<OverlayLegendProps> = ({
  domainIds,
  domainColorMap,
  orderedExperiments,
}) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'white',
        borderColor: '#DDE6F1',
        height: '100%',
        minHeight: 520,
        overflowY: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Domain Colors
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {domainIds.map((domainId) => (
              <Box
                key={domainId}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: domainColorMap[domainId] ?? '#64748B',
                    flexShrink: 0,
                  }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Domain {domainId}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Slice Order
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {orderedExperiments.map((experiment, index) => (
              <Typography key={experiment.experimentId} variant="caption" sx={{ color: 'text.secondary' }}>
                Slice {index + 1} {experiment.experimentName}
              </Typography>
            ))}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default OverlayLegend;
