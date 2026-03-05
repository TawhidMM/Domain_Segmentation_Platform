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
        borderColor: '#e5e7eb',
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: '#fafafa',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: '#d1d5db',
          backgroundColor: '#f5f5f5',
        },
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
          gap: 1,
          px: 2,
          py: 1.25,
          textAlign: 'left',
          textTransform: 'none',
          color: 'text.primary',
          bgcolor: 'transparent',
          borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
          '&:hover': {
            bgcolor: 'transparent',
          },
        }}
      >
        {/* Toggle Icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 20, color: 'text.secondary' }}>
          {isExpanded ? (
            <ChevronDown size={16} strokeWidth={2.5} />
          ) : (
            <ChevronRight size={16} strokeWidth={2.5} />
          )}
        </Box>

        {/* Dataset Icon and ID */}
        <Database size={14} style={{ flexShrink: 0, color: '#6b7280' }} />
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              fontSize: '13px',
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
            bgcolor: '#eef4ff',
            color: '#3b82f6',
            px: 1.25,
            py: 0.5,
            borderRadius: '999px',
            minWidth: 32,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '11px' }}>
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
