import React from 'react';
import { Paper, Typography, Box, Radio } from '@mui/material';
import { ToolSchema } from '@/types';

interface ToolCardProps {
  tool: ToolSchema;
  selected: boolean;
  onSelect: () => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, selected, onSelect }) => {
  return (
    <Paper
      onClick={onSelect}
      sx={{
        p: 2.5,
        cursor: 'pointer',
        border: '2px solid',
        borderColor: selected ? 'primary.main' : 'transparent',
        backgroundColor: selected ? 'rgba(13, 148, 136, 0.05)' : 'white',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: selected ? 'primary.main' : 'primary.light',
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Radio
          checked={selected}
          sx={{
            p: 0,
            '&.Mui-checked': {
              color: 'primary.main',
            },
          }}
        />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            {tool.label}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
            {tool.description}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default ToolCard;
