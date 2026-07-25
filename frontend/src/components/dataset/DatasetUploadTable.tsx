import React from 'react';
import EntityList from '@/components/shared/EntityList';
import DatasetUploadRow from './DatasetUploadRow';
import type { DatasetItem } from '@/types';

interface DatasetUploadTableProps {
  items: DatasetItem[];
  onUpdateName: (datasetId: string, name: string) => void;
  onRetry: (queueItemId: string) => void;
  onDelete: (idOrDatasetId: string) => void;
}

const DatasetUploadTable: React.FC<DatasetUploadTableProps> = ({
  items,
  onUpdateName,
  onRetry,
  onDelete,
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <EntityList title="Uploaded Datasets" maxHeight={400}>
      {items.map((item) => (
        <DatasetUploadRow
          key={item.id}
          item={item}
          onUpdateName={onUpdateName}
          onRetry={onRetry}
          onDelete={onDelete}
        />
      ))}
    </EntityList>
  );
};

export default DatasetUploadTable;