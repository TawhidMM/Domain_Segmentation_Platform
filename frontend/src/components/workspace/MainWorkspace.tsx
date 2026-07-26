import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Box } from '@mui/material';
import { useDatasetStore } from '@/stores/dataset';
import { useExperimentsStore } from '@/stores/experiments';
import { useUIStore } from '@/stores/ui/uiStore.ts';
import DatasetUpload from '../dataset/DatasetUpload';
import ExperimentBuilder from '@/components/experiment/ExperimentBuilder';
import ExperimentDetailView from '@/components/experiment/ExperimentDetailView';

const MainWorkspace: React.FC = () => {
  const uploadedDatasets = useDatasetStore(
    useShallow((state) => state.datasets.filter((d) => d.status === 'SUCCESS'))
  );

  const experiments = useExperimentsStore((state) => state.experiments);
  const activeExperimentId = useExperimentsStore((state) => state.activeExperimentId);

  const workspaceMode = useUIStore((state) => state.currentView);

  // Resolve the actual Experiment object for focus view
  // Shows in focus mode if in focus mode AND there's an active experiment
  const experimentForFocus = experiments.find((e) => e.id === activeExperimentId) ?? null;

  const renderContent = () => {
    // Hard Safety Guardrail: If data doesn't exist, force the Upload interface
    if (!uploadedDatasets || uploadedDatasets.length === 0) {
      return <DatasetUpload />;
    }

    // Authoritative State Machine Core Routing
    switch (workspaceMode) {
      case 'upload':
        return <DatasetUpload />;

      case 'builder':
        return <ExperimentBuilder />;

      case 'focus':
        // Render detail view if data exists; otherwise fallback gracefully
        return experimentForFocus ? (
          <ExperimentDetailView experiment={experimentForFocus} />
        ) : (
          <DatasetUpload />
        );

      // Removed 'comparison' mode - use /compare route instead
      // The FloatingCompareBar handles selection and navigation

      default:
        return <DatasetUpload />;
    }
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