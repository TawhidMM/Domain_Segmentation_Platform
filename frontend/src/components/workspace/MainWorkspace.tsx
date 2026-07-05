import React from 'react';
import { Box } from '@mui/material';
import { useApp } from '@/context/AppContext';
import { useDatasetStore } from '@/stores/dataset';
import { usePipelineStore } from '@/stores/pipeline';
import { useUIStore } from '@/store/useUIStore';
import DatasetUpload from '../dataset/DatasetUpload';
import ExperimentBuilder from '@/components/experiment/ExperimentBuilder';
import FocusView from '../visualization/FocusView';

const MainWorkspace: React.FC = () => {
  const { experiments, activeExperimentId } = useApp();
  const uploadedDatasets = useDatasetStore((state) => state.uploadedDatasets);
  const lastCreatedExperiment = usePipelineStore((state) => state.lastCreatedExperiment);
  const currentView = useUIStore((state) => state.currentView);

  // Resolve the actual Experiment object for FocusView (from AppContext's live experiments)
  const experimentForFocus = lastCreatedExperiment
    ? experiments.find((e) => e.id === activeExperimentId) ?? null
    : null;

  const renderContent = () => {
    // Guardrail 1: No datasets loaded
    if (!uploadedDatasets || uploadedDatasets.length === 0) {
      return <DatasetUpload />;
    }

    // Guardrail 2: Active experiment exists (derived from context + snapshot)
    if (experimentForFocus) {
      return <FocusView experiment={experimentForFocus} />;
    }

    // User preference view
    if (currentView === 'upload') {
      return <DatasetUpload />;
    }

    // Default: builder view (shows pipeline or import tracks)
    return <ExperimentBuilder />;
  };

  return (
    <Box
      sx={{
        flex: 1,
        height: '100%',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {renderContent()}
    </Box>
  );
};

export default MainWorkspace;