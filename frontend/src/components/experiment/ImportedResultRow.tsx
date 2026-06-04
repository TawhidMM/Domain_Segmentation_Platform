import React from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { DeleteOutline, FolderZip } from '@mui/icons-material';
import type { StagedResultItem } from './ImportResultsTrack';

interface ImportedResultRowProps {
  item: StagedResultItem;
  onRemove: (stageId: string) => void;
}

const ImportedResultRow: React.FC<ImportedResultRowProps> = ({ item, onRemove }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: 3,
        py: 2,
        borderRadius: 2,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }} noWrap>
          {item.datasetName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'text.secondary' }}>
          <FolderZip sx={{ fontSize: 16 }} />
          <Typography variant="caption" sx={{ fontFamily: 'monospace' }} noWrap>
            {item.fileName}
          </Typography>
        </Box>
      </Box>

      <Tooltip title="Remove configuration bundle">
        <IconButton size="small" onClick={() => onRemove(item.stageId)} color="default">
          <DeleteOutline fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default ImportedResultRow;