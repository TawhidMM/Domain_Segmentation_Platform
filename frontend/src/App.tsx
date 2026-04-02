import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { muiTheme } from '@/theme/muiTheme';
import { AppProvider } from '@/context/AppContext';
import Index from "./pages/Index";
import FocusPage from "./pages/FocusPage";
import ComparePage from "./pages/ComparePage";
import AnnotationPage from "./pages/AnnotationPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <AppProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/experiment/:experimentId" element={<FocusPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/annotation-workspace" element={<AnnotationPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
