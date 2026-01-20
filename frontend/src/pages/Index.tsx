import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { muiTheme } from '@/theme/muiTheme';
import { AppProvider } from '@/context/AppContext';
import AppLayout from '@/components/layout/AppLayout';

const Index: React.FC = () => {
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AppProvider>
        <AppLayout />
      </AppProvider>
    </ThemeProvider>
  );
};

export default Index;
