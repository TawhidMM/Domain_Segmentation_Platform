import React from 'react';
import { Typography } from '@mui/material';
import EntityList from '@/components/shared/EntityList';
import DatasetAnnotationRow from './DatasetAnnotationRow';

export interface AnnotationDatasetItem {
  id: string;
  name: string;
  annotationId?: string;
}

interface DatasetAnnotationTableProps {
  items: AnnotationDatasetItem[];
  onAnnotate: (datasetId: string, annotationId?: string) => void;
}

const DatasetAnnotationTable: React.FC<DatasetAnnotationTableProps> = ({ items, onAnnotate }) => {
  if (items.length === 0) {
    return null;
  }

  const completedCount = items.filter((item) => Boolean(item.annotationId)).length;

  return (
    <EntityList
      title="Dataset Annotation List"
      maxHeight={420}
      headerRight={
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {completedCount}/{items.length} annotated
        </Typography>
      }
    >
      {items.map((item) => (
        <DatasetAnnotationRow
          key={item.id}
          datasetId={item.id}
          datasetName={item.name}
          annotationId={item.annotationId}
          onAnnotate={onAnnotate}
        />
      ))}
    </EntityList>
  );
};

export default DatasetAnnotationTable;
