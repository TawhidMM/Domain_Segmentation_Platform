import React from 'react';
import PanToolAltIcon from '@mui/icons-material/PanToolAlt';
import BrushIcon from '@mui/icons-material/Brush';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import RedoIcon from '@mui/icons-material/Redo';
import UndoIcon from '@mui/icons-material/Undo';
import { Box, IconButton, Paper, Tooltip } from '@mui/material';

import { AnnotationMode } from '@/types/annotationPlayground';

interface ToolPanelProps {
  mode: AnnotationMode;
  onModeChange: (mode: AnnotationMode) => void;
  canDraw: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const tools: Array<{ mode: AnnotationMode; label: string; icon: React.ReactNode }> = [
  {
    mode: 'pan',
    label: 'Hand (Pan)',
    icon: <PanToolAltIcon fontSize="small" />,
  },
  {
    mode: 'draw',
    label: 'Brush (Draw)',
    icon: <BrushIcon fontSize="small" />,
  },
  {
    mode: 'erase',
    label: 'Eraser (Erase)',
    icon: <CleaningServicesIcon fontSize="small" />,
  },
];

const ToolPanel: React.FC<ToolPanelProps> = ({
  mode,
  onModeChange,
  canDraw,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  return (
    <Paper
      sx={{
        p: 1,
        display: 'flex',
        flexDirection: { xs: 'row', md: 'column' },
        gap: 0.75,
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: { xs: 'auto', md: '75vh' },
      }}
    >
      {tools.map((tool) => {
        const isActive = tool.mode === mode;
        const isDrawToolDisabled = tool.mode === 'draw' && !canDraw;
        const tooltipTitle = isDrawToolDisabled ? 'Create a label to enable draw mode' : tool.label;
        return (
          <Tooltip key={tool.mode} title={tooltipTitle} placement="right" arrow>
            <IconButton
              disabled={isDrawToolDisabled}
              onClick={() => onModeChange(tool.mode)}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                bgcolor: isActive ? 'primary.main' : 'transparent',
                color: isActive ? '#FFFFFF' : 'text.primary',
                border: '1px solid',
                borderColor: isActive ? 'primary.main' : 'divider',
                '&:hover': {
                  bgcolor: isActive ? 'primary.dark' : 'action.hover',
                },
              }}
            >
              {tool.icon}
            </IconButton>
          </Tooltip>
        );
      })}

      <Box sx={{ width: '100%', height: 1, bgcolor: 'divider', my: 0.5 }} />

      <Tooltip title={canUndo ? 'Undo (Ctrl+Z)' : 'Undo'} placement="right" arrow>
        <span>
          <IconButton
            onClick={onUndo}
            disabled={!canUndo}
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              border: '1px solid',
              borderColor: canUndo ? 'primary.main' : 'divider',
              color: canUndo ? 'primary.main' : 'text.disabled',
              '&:hover:not(:disabled)': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <UndoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={canRedo ? 'Redo (Ctrl+Y)' : 'Redo'} placement="right" arrow>
        <span>
          <IconButton
            onClick={onRedo}
            disabled={!canRedo}
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              border: '1px solid',
              borderColor: canRedo ? 'primary.main' : 'divider',
              color: canRedo ? 'primary.main' : 'text.disabled',
              '&:hover:not(:disabled)': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <RedoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Paper>
  );
};

export default ToolPanel;
