import React from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import { GridView } from '@mui/icons-material';
import { X } from 'lucide-react';
import { useComparisonStore } from '@/stores/comparison';
import { useNavigate } from 'react-router-dom';

const FloatingCompareBar: React.FC = () => {
  const { basket } = useComparisonStore();
  const count = basket.length;
  const getCompareUrl = useComparisonStore((state) => state.getCompareUrl);
  const clear = useComparisonStore((state) => state.clear);
  const removeExperiment = useComparisonStore((state) => state.removeExperiment);
  const navigate = useNavigate();

  if (count < 2) {
    return null;
  }

  const handleCompareNow = () => {
    const compareUrl = getCompareUrl();
    if (compareUrl) {
      navigate(compareUrl);
    }
  };

  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        width: '100%',
        backgroundColor: 'white',
        borderTop: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: 3,
        py: 1.5,
        zIndex: 1050,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Left: Icon + Count */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <GridView sx={{ color: 'primary.main', fontSize: 20 }} />
        <Typography
          variant="body2"
          sx={{ color: 'text.primary', fontWeight: 600 }}
        >
          {count} experiment{count !== 1 ? 's' : ''} selected
        </Typography>
      </Box>

      {/* Middle: Scrollable chips */}
      <Box
        sx={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          whiteSpace: 'nowrap',
          mx: 2,
          py: 0.5,
          '&::-webkit-scrollbar': {
            height: 4,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'divider',
            borderRadius: 2,
          },
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {basket.map((exp) => (
            <Chip
              key={exp.id}
              label={exp.experimentName}
              onDelete={() => removeExperiment(exp.id)}
              deleteIcon={
                <X size={14} style={{ color: 'text.secondary' }} />
              }
              size="small"
              sx={{
                height: 28,
                fontSize: '0.75rem',
                fontWeight: 500,
                bgcolor: 'rgba(13, 148, 136, 0.1)',
                color: 'primary.main',
                borderRadius: 1,
                '& .MuiChip-deleteIcon': {
                  color: 'text.secondary',
                  fontSize: 14,
                  '&:hover': {
                    color: 'text.primary',
                  },
                },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Right: Actions */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Button
          onClick={clear}
          size="small"
          sx={{
            textTransform: 'none',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'text.secondary',
            '&:hover': {
              color: 'text.primary',
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          Clear all
        </Button>
        <Button
          onClick={handleCompareNow}
          variant="contained"
          size="small"
          sx={{
            textTransform: 'none',
            fontSize: '0.8125rem',
            fontWeight: 600,
          }}
        >
          Compare Now
        </Button>
      </Box>
    </Box>
  );
};

export default FloatingCompareBar;