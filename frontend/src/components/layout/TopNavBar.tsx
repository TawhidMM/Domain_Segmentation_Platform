import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Chip } from '@mui/material';
import { Settings, HelpOutline, AccountCircle } from '@mui/icons-material';

const TopNavBar: React.FC = () => {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: 'white',
        borderBottom: '1px solid',
        borderColor: 'divider',
        height: 56,
      }}
    >
      <Toolbar sx={{ minHeight: '56px !important', px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              background: 'linear-gradient(135deg, #0D9488 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>
              ST
            </Typography>
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              fontSize: '1rem',
            }}
          >
            SpatialDomain
          </Typography>
          <Chip
            label="v1.0"
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              bgcolor: 'rgba(13, 148, 136, 0.1)',
              color: 'primary.main',
              fontWeight: 500,
            }}
          />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" sx={{ color: 'text.secondary' }}>
            <HelpOutline fontSize="small" />
          </IconButton>
          <IconButton size="small" sx={{ color: 'text.secondary' }}>
            <Settings fontSize="small" />
          </IconButton>
          <IconButton size="small" sx={{ color: 'text.secondary' }}>
            <AccountCircle fontSize="small" />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopNavBar;
