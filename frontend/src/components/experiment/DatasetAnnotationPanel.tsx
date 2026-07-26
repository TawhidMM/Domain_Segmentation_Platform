import React, { useMemo } from 'react';
import { Alert, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useDatasetStore } from '@/stores/dataset';
import { useApp } from '@/context/AppContext';
import { checkDependsOn } from '@/utils/dependsOn';
import DatasetAnnotationTable from './DatasetAnnotationTable';
import type { Experiment } from '@/types';
import type { AnnotationDatasetItem } from './DatasetAnnotationTable';

interface DatasetAnnotationPanelProps {
  experiment: Experiment;
  onAnnotationStatusChange?: (annotated: boolean) => void;
}

const DatasetAnnotationPanel: React.FC<DatasetAnnotationPanelProps> = ({ experiment, onAnnotationStatusChange }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const uploadedDatasets = useDatasetStore(
    useShallow((state) => state.datasets.filter((d) => d.status === 'SUCCESS'))
  );

  const { datasetAnnotationMap } = useApp();

  const annotationRequirement = experiment.requirements?.manual_annotation;
  const shouldRequireAnnotation = Boolean(
    annotationRequirement?.is_required && checkDependsOn(annotationRequirement.depends_on, experiment.parameters)
  );

  const allRequiredDatasetsAnnotated = useMemo(() => {
    if (!shouldRequireAnnotation) {
      return true;
    }

    if (experiment.datasetIds.length === 0) {
      return false;
    }

    return experiment.datasetIds.every((datasetId) => Boolean(datasetAnnotationMap[datasetId]));
  }, [datasetAnnotationMap, experiment.datasetIds, shouldRequireAnnotation]);

  React.useEffect(() => {
    onAnnotationStatusChange?.(allRequiredDatasetsAnnotated);
  }, [allRequiredDatasetsAnnotated, onAnnotationStatusChange]);

  const annotationDatasetItems = useMemo<AnnotationDatasetItem[]>(
    () =>
      experiment.datasetIds.map((datasetId) => ({
        id: datasetId,
        name: uploadedDatasets.find((dataset) => dataset.datasetId === datasetId)?.datasetName ?? datasetId,
        annotationId: datasetAnnotationMap[datasetId],
      })),
    [datasetAnnotationMap, experiment.datasetIds, uploadedDatasets]
  );

  const handleAnnotateDataset = (datasetId: string, annotationId?: string) => {
    const queryParams: Record<string, string> = {
      dataset_id: datasetId,
      return_to: `${location.pathname}${location.search}`,
    };

    if (annotationId) {
      queryParams.annotation_id = annotationId;
    }

    const query = new URLSearchParams(queryParams);
    navigate(`/annotation-workspace?${query.toString()}`);
  };

  if (!shouldRequireAnnotation) {
    return null;
  }

  return (
    <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert severity="warning">
        This experiment requires manual annotation before submission. Annotate every dataset below, then submit.
      </Alert>
      <DatasetAnnotationTable
        items={annotationDatasetItems}
        onAnnotate={handleAnnotateDataset}
      />
    </Box>
  );
};

export default DatasetAnnotationPanel;
