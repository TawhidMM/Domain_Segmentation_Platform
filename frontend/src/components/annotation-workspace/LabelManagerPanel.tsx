import React, { useMemo, useState } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Slider,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import { AnnotationLabel } from '@/types/annotationPlayground';

interface LabelManagerPanelProps {
  labels: AnnotationLabel[];
  activeLabelId: number | null;
  brushRadius: number;
  spotOpacity: number;
  onBrushRadiusChange: (radius: number) => void;
  onSpotOpacityChange: (opacity: number) => void;
  onActiveLabelChange: (labelId: number) => void;
  onAddLabel: (labelName: string) => void;
  onRenameLabel: (labelId: number, labelName: string) => void;
  onRemoveLabel: (labelId: number) => void;
}

const brushMarks = [
  { value: 5, label: '5' },
  { value: 100, label: '100' },
];

const opacityMarks = [
  { value: 0, label: '0%' },
  { value: 100, label: '100%' },
];

const LabelManagerPanel: React.FC<LabelManagerPanelProps> = ({
  labels,
  activeLabelId,
  brushRadius,
  spotOpacity,
  onBrushRadiusChange,
  onSpotOpacityChange,
  onActiveLabelChange,
  onAddLabel,
  onRenameLabel,
  onRemoveLabel,
}) => {
  const [showAddLabelForm, setShowAddLabelForm] = useState(false);
  const [labelNameInput, setLabelNameInput] = useState('');
  const [editingLabelId, setEditingLabelId] = useState<number | null>(null);
  const [editingNameDraft, setEditingNameDraft] = useState('');

  const normalizedLabelName = useMemo(() => labelNameInput.trim(), [labelNameInput]);
  const normalizedEditingNameDraft = useMemo(() => editingNameDraft.trim(), [editingNameDraft]);
  const suggestedNextLabelName = useMemo(() => {
    let maxNewLabelNumber = 0;
    for (const label of labels) {
      const match = /^Label\s+(\d+)$/.exec(label.name.trim());
      if (!match) {
        continue;
      }

      const parsedValue = Number.parseInt(match[1] ?? '0', 10);
      if (Number.isNaN(parsedValue)) {
        continue;
      }

      maxNewLabelNumber = Math.max(maxNewLabelNumber, parsedValue);
    }

    return `Label ${maxNewLabelNumber + 1}`;
  }, [labels]);

  const handleAddLabelSubmit = () => {
    const nextLabelName = normalizedLabelName || suggestedNextLabelName;

    onAddLabel(nextLabelName);
    setLabelNameInput('');
    setShowAddLabelForm(false);
  };

  const handleToggleAddLabelForm = () => {
    setShowAddLabelForm((prev) => {
      const nextValue = !prev;
      if (nextValue) {
        setLabelNameInput(suggestedNextLabelName);
      } else {
        setLabelNameInput('');
      }

      return nextValue;
    });
  };

  const handleStartEditLabel = (labelId: number, currentName: string) => {
    setEditingLabelId(labelId);
    setEditingNameDraft(currentName);
  };

  const handleCommitEditLabel = (labelId: number) => {
    if (normalizedEditingNameDraft) {
      onRenameLabel(labelId, normalizedEditingNameDraft);
    }

    setEditingLabelId(null);
    setEditingNameDraft('');
  };

  const handleCancelEditLabel = (currentName: string) => {
    setEditingNameDraft(currentName);
    setEditingLabelId(null);
    setEditingNameDraft('');
  };

  return (
    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Labels
        </Typography>
      </Box>

      <Button
        variant="outlined"
        onClick={handleToggleAddLabelForm}
        sx={{ textTransform: 'none' }}
      >
        + Add Label
      </Button>

      {showAddLabelForm && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            size="small"
            label="Label Name"
            placeholder="e.g. Tumor Border"
            value={labelNameInput}
            onChange={(event) => setLabelNameInput(event.target.value)}
          />
          <Button
            variant="contained"
            onClick={handleAddLabelSubmit}
            sx={{ textTransform: 'none' }}
          >
            Create Label
          </Button>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {labels.map((label) => {
          const isActive = label.id === activeLabelId;
          const isEditing = editingLabelId === label.id;
          return (
            <Box
              key={label.id}
              role="button"
              tabIndex={0}
              onClick={() => onActiveLabelChange(label.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onActiveLabelChange(label.id);
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
                py: 0.75,
                borderRadius: 1,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: isActive ? 'primary.main' : 'divider',
                bgcolor: isEditing
                  ? 'rgba(15, 23, 42, 0.06)'
                  : (isActive ? 'rgba(30, 136, 229, 0.08)' : 'transparent'),
              }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: `rgb(${label.color[0]}, ${label.color[1]}, ${label.color[2]})`,
                  border: '1px solid rgba(15, 23, 42, 0.24)',
                  flexShrink: 0,
                }}
              />
              {isEditing ? (
                <Box
                  component="input"
                  autoFocus
                  value={editingNameDraft}
                  onClick={(event: React.MouseEvent<HTMLInputElement>) => event.stopPropagation()}
                  onMouseDown={(event: React.MouseEvent<HTMLInputElement>) => event.stopPropagation()}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEditingNameDraft(event.target.value)}
                  onBlur={() => handleCommitEditLabel(label.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      (event.currentTarget as HTMLInputElement).blur();
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault();
                      handleCancelEditLabel(label.name);
                    }
                  }}
                  sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    width: '100%',
                    bgcolor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                    px: 0,
                    py: 0,
                    m: 0,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    lineHeight: '20px',
                    color: 'text.primary',
                    borderBottom: '1px solid',
                    borderColor: 'rgba(15, 23, 42, 0.24)',
                  }}
                />
              ) : (
                <Typography
                  sx={{ fontSize: 13, flexGrow: 1, lineHeight: '20px', cursor: 'text' }}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleStartEditLabel(label.id, label.name);
                  }}
                >
                  {label.name}
                </Typography>
              )}
              {isActive && !isEditing && <Typography sx={{ fontSize: 11, fontWeight: 700 }}>active</Typography>}

              <Tooltip title="Remove label" placement="top" arrow>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveLabel(label.id);
                  }}
                  sx={{ ml: 0.25 }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          );
        })}
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Brush Settings
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Brush Size: {brushRadius}
        </Typography>
        <Slider
          min={5}
          max={100}
          step={1}
          value={brushRadius}
          marks={brushMarks}
          valueLabelDisplay="auto"
          onChange={(_event, value) => {
            if (typeof value !== 'number') {
              return;
            }

            onBrushRadiusChange(value);
          }}
        />

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.25 }}>
          Spot Opacity: {spotOpacity}%
        </Typography>
        <Slider
          min={0}
          max={100}
          step={1}
          value={spotOpacity}
          marks={opacityMarks}
          valueLabelDisplay="auto"
          onChange={(_event, value) => {
            if (typeof value !== 'number') {
              return;
            }

            onSpotOpacityChange(value);
          }}
        />
      </Box>
    </Paper>
  );
};

export default LabelManagerPanel;
