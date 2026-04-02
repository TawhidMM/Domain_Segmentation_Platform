import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';

interface TitledScrollablePanelProps {
  title: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  maxHeight?: number;
  panelSx?: SxProps<Theme>;
}

const EntityList: React.FC<TitledScrollablePanelProps> = ({
  title,
  children,
  headerRight,
  maxHeight = 400,
  panelSx,
}) => {
  return (
    <Paper
      sx={[
        {
          p: 3,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'grey.50',
          display: 'flex',
          flexDirection: 'column',
          maxHeight,
          overflow: 'hidden',
        },
        ...(Array.isArray(panelSx) ? panelSx : panelSx ? [panelSx] : []),
      ]}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, flexShrink: 0 }}>
          {title}
        </Typography>
        {headerRight}
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          overflowY: 'auto',
          flex: 1,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '3px',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
        }}
      >
        {children}
      </Box>
    </Paper>
  );
};

export default EntityList;
