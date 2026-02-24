import React from 'react';
import { Box, Button } from '@mui/material';
import { GridView } from '@mui/icons-material';
import { X } from 'lucide-react';
import { useComparisonBasket } from '@/hooks/useComparisonBasket';
import { useNavigate } from 'react-router-dom';

const FloatingCompareBar: React.FC = () => {
  const { basket, count, getCompareUrl, clear } = useComparisonBasket();
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
        position: 'fixed',
        bottom: 24,
        right: 24,
        backgroundColor: '#1F2937',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: 3,
        py: 1.5,
        zIndex: 1000,
        animation: 'slideUpRight 0.3s ease-in-out',
        '@keyframes slideUpRight': {
          from: {
            transform: 'translateY(120px) translateX(120px)',
            opacity: 0,
          },
          to: {
            transform: 'translateY(0) translateX(0)',
            opacity: 1,
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <GridView sx={{ color: '#10B981', flexShrink: 0, fontSize: 20 }} />
        <Box sx={{ color: 'white' }}>
          <Box sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{count} jobs selected</Box>
          <Box sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Ready to compare</Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Button
          onClick={handleCompareNow}
          sx={{
            textTransform: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            px: 2.5,
            py: 0.75,
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: '#059669',
            },
            transition: 'background-color 0.2s',
          }}
        >
          Compare Now
        </Button>
        <Button
          onClick={clear}
          sx={{
            minWidth: 'auto',
            p: 0.5,
            backgroundColor: 'transparent',
            color: '#9CA3AF',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
              backgroundColor: '#374151',
              color: 'white',
            },
            transition: 'all 0.2s',
          }}
        >
          <X size={18} style={{ color: 'currentColor' }} />
        </Button>
      </Box>
    </Box>
  );
};

export default FloatingCompareBar;
