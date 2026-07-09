import React from 'react';
import { Box } from '@mui/material';
import { useApp } from '@/context/AppContext';
import { useDatasetStore } from '@/stores/dataset';
import { usePipelineStore } from '@/stores/pipeline';
import { useUIStore } from '@/store/useUIStore';
import DatasetUpload from '../dataset/DatasetUpload';
import ExperimentBuilder from '@/components/experiment/ExperimentBuilder';
import ExperimentDetailView from '@/components/experiment/ExperimentDetailView';
import ComparisonView from '@/components/visualization/ComparisonView';

const MainWorkspace: React.FC = () => {
  const { experiments, activeExperimentId } = useApp();
  const uploadedDatasets = useDatasetStore((state) => state.uploadedDatasets);
  const lastCreatedExperiment = usePipelineStore((state) => state.lastCreatedExperiment);
  const workspaceMode = useUIStore((state) => state.currentView);

  // Resolve the actual Experiment object for ExperimentDetailView (from AppContext's live experiments)
  const experimentForFocus = lastCreatedExperiment
    ? experiments.find((e) => e.id === activeExperimentId) ?? null
    : null;

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

      case 'comparison':
        return <ComparisonView />;

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