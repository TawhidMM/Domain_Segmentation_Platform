import React from 'react';
import EntityList from '@/components/shared/EntityList';
import DatasetUploadRow from './DatasetUploadRow';
import type { UploadedDataset } from '@/stores/dataset';

interface DatasetUploadTableProps {
  items: UploadedDataset[];
  onUpdateName: (datasetId: string, name: string) => void;
  onRetry: (queueItemId: string) => void;
  onDelete: (datasetId: string) => void;
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
    <EntityList title="Uploaded Dataset" maxHeight={400} panelSx={{ mt: 4 }}>
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
