import React from 'react';
import { Box, Button, Collapse, Paper, Typography } from '@mui/material';
import { ChevronDown, ChevronRight, Database } from 'lucide-react';
import RunsList from './RunsList';
import { DatasetGroup } from '@/types';

export interface DatasetItemProps {
  dataset: DatasetGroup;
  isExpanded: boolean;
  selectedRunId: string | null;
  onToggle: () => void;
  onRunSelect: (runId: string) => void;
}

const DatasetItem: React.FC<DatasetItemProps> = ({
  dataset,
  isExpanded,
  selectedRunId,
  onToggle,
  onRunSelect,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      {/* Dataset Header */}
      <Button
        fullWidth
        onClick={onToggle}
        sx={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          textAlign: 'left',
          textTransform: 'none',
          color: 'text.primary',
          bgcolor: isExpanded ? 'action.selected' : 'transparent',
          borderBottom: isExpanded ? '1px solid' : 'none',
          borderBottomColor: 'divider',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        {/* Toggle Icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 24 }}>
          {isExpanded ? (
            <ChevronDown size={18} strokeWidth={2} />
          ) : (
            <ChevronRight size={18} strokeWidth={2} />
          )}
        </Box>

        {/* Dataset Icon and ID */}
        <Database size={16} style={{ flexShrink: 0 }} />
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {dataset.dataset_id}
          </Typography>
        </Box>

        {/* Run Count Badge */}
        <Box
          sx={{
            bgcolor: 'primary.light',
            color: 'primary.main',
            px: 1,
            py: 0.5,
            borderRadius: 0.75,
            minWidth: 28,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
            {dataset.runs.length}
          </Typography>
        </Box>
      </Button>

      {/* Dataset Runs - Collapsible Content */}
      <Collapse in={isExpanded} timeout="auto">
        <RunsList
          runs={dataset.runs}
          datasetId={dataset.dataset_id}
          selectedRunId={selectedRunId}
          onRunSelect={onRunSelect}
        />
      </Collapse>
    </Paper>
  );
};

export default DatasetItem;
