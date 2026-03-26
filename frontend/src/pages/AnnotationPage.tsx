import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Container, Paper, Typography } from '@mui/material';
import { grey } from '@mui/material/colors';

import AnnotationSpatialCanvas from '@/components/annotation-workspace/AnnotationSpatialCanvas';
import LabelManagerPanel from '@/components/annotation-workspace/LabelManagerPanel';
import ToolPanel from '@/components/annotation-workspace/ToolPanel';
import { useAnnotationBrush } from '@/hooks/useAnnotationBrush';
import { useAnnotationHistory } from '@/hooks/useAnnotationHistory';
import { useAnnotationData } from '@/hooks/useAnnotationData';
import { useAnnotationSpatialIndex } from '@/hooks/useAnnotationSpatialIndex';
import { AnnotationLabel, AnnotationMode } from '@/types/annotationPlayground';
import { buildAnnotationCsvContent, buildAnnotationCsvRows, downloadCsvFile } from '@/utils/annotationExport';
import { getLabelColorFromPalette } from '@/utils/annotationColors';

const UNLABELED_COLOR: [number, number, number] = [200, 200, 200];
const INITIAL_LABELS: AnnotationLabel[] = [];

const AnnotationPage: React.FC = () => {
  const { coordinateBuffer, spots, imageMetadata, annotationBuffer, loading, error } = useAnnotationData();
  const { kdTree } = useAnnotationSpatialIndex(spots);

  const [brushRadius, setBrushRadius] = useState<number>(20);
  const [spotOpacity, setSpotOpacity] = useState<number>(100);
  const [activeLabelId, setActiveLabelId] = useState<number | null>(null);
  const [labels, setLabels] = useState<AnnotationLabel[]>(INITIAL_LABELS);
  const [mode, setMode] = useState<AnnotationMode>('pan');
  const [annotationVersion, setAnnotationVersion] = useState(0);
  const versionRafRef = useRef<number | null>(null);
  const hasPendingVersionRef = useRef(false);

  const requestRenderUpdate = useCallback(() => {
    hasPendingVersionRef.current = true;

    if (versionRafRef.current !== null) {
      return;
    }

    versionRafRef.current = window.requestAnimationFrame(() => {
      versionRafRef.current = null;
      if (!hasPendingVersionRef.current) {
        return;
      }

      hasPendingVersionRef.current = false;
      setAnnotationVersion((version) => version + 1);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (versionRafRef.current !== null) {
        window.cancelAnimationFrame(versionRafRef.current);
      }
    };
  }, []);

  const { undoStack, redoStack, recordStroke, executeUndo, executeRedo } = useAnnotationHistory({
    annotationBuffer,
    onAnnotationMutated: requestRenderUpdate,
  });

  const {
    currentPoint,
    cursorScreenPosition,
    brushCursorWorldPosition,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
  } = useAnnotationBrush({
    spots,
    kdTree,
    annotationBuffer,
    brushRadius,
    activeLabelId: activeLabelId ?? 0,
    mode,
    enabled: !loading && !error && (mode !== 'draw' || activeLabelId !== null),
    onAnnotationMutated: requestRenderUpdate,
    onStrokeComplete: recordStroke,
  });

  const handleToolModeChange = useCallback(
    (nextMode: AnnotationMode) => {
      if (nextMode === 'draw' && labels.length === 0) {
        return;
      }

      setMode(nextMode);
    },
    [labels.length],
  );

  const handleUndo = useCallback(() => {
    executeUndo();
  }, [executeUndo]);

  const handleRedo = useCallback(() => {
    executeRedo();
  }, [executeRedo]);

  // Handle keyboard shortcuts (Ctrl+Z for undo, Ctrl+Y or Ctrl+Shift+Z for redo)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          handleUndo();
        } else if ((event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
          event.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleAddLabel = useCallback((labelName: string) => {
    setLabels((previousLabels) => {
      const currentMaxId = previousLabels.reduce((maxId, label) => Math.max(maxId, label.id), 0);
      const nextId = currentMaxId + 1;

      const nextLabel: AnnotationLabel = {
        id: nextId,
        name: labelName,
        color: getLabelColorFromPalette(nextId),
      };

      setActiveLabelId(nextId);
      return [...previousLabels, nextLabel];
    });

    // Move into draw mode automatically when the first label is created.
    setMode('draw');
  }, []);

  const handleRenameLabel = useCallback((labelId: number, nextName: string) => {
    const normalizedName = nextName.trim();
    if (!normalizedName) {
      return;
    }

    setLabels((previousLabels) =>
      previousLabels.map((label) => {
        if (label.id !== labelId) {
          return label;
        }

        return {
          ...label,
          name: normalizedName,
        };
      }),
    );
  }, []);

  const handleRemoveLabel = useCallback(
    (labelId: number) => {
      setLabels((previousLabels) => {
        const nextLabels = previousLabels.filter((label) => label.id !== labelId);
        if (nextLabels.length === previousLabels.length) {
          return previousLabels;
        }

        if (activeLabelId === labelId) {
          setActiveLabelId(nextLabels[0]?.id ?? null);
        }

        return nextLabels;
      });

      let mutated = false;
      for (let i = 0; i < annotationBuffer.length; i += 1) {
        if ((annotationBuffer[i] ?? 0) !== labelId) {
          continue;
        }

        annotationBuffer[i] = 0;
        mutated = true;
      }

      if (mutated) {
        requestRenderUpdate();
      }
    },
    [activeLabelId, annotationBuffer, requestRenderUpdate],
  );

  useEffect(() => {
    if (mode !== 'draw') {
      return;
    }

    if (labels.length === 0 || activeLabelId === null) {
      setMode('pan');
    }
  }, [activeLabelId, labels.length, mode]);

  const handleExportCsv = useCallback(() => {
    const rows = buildAnnotationCsvRows(spots, annotationBuffer, labels);
    const csvContent = buildAnnotationCsvContent(rows);
    downloadCsvFile(csvContent, 'annotation_export.csv');
  }, [annotationBuffer, labels, spots]);

  const labelColors = useMemo(() => {
    const nextLabelColors: Record<number, [number, number, number]> = {
      0: UNLABELED_COLOR,
    };

    for (const label of labels) {
      nextLabelColors[label.id] = label.color;
    }

    return nextLabelColors;
  }, [labels]);

  const formattedSpotCount = useMemo(() => spots.length.toLocaleString(), [spots.length]);
  const formattedCoordinates = useMemo(() => {
    if (!currentPoint) {
      return 'n/a';
    }

    return `${currentPoint.x.toFixed(1)}, ${currentPoint.y.toFixed(1)}`;
  }, [currentPoint]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={34} sx={{ mb: 1.5 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Loading annotation workspace...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Box sx={{ textAlign: 'center', maxWidth: 560 }}>
          <Typography variant="h6" sx={{ color: 'error.main', mb: 0.75 }}>
            Unable to load annotation workspace
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {error}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F1F5F9', display: 'flex', flexDirection: 'column' }}>
      <Container
        maxWidth="xl"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          py: 2,
          pb: 0,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            pb: 1.25,
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
              Annotation Workspace
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                px: 0.8,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'rgba(15, 23, 42, 0.05)',
                whiteSpace: 'nowrap',
              }}
            >
              {formattedSpotCount} spots
            </Typography>
          </Box>
          <Button variant="contained" onClick={handleExportCsv} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
            Export CSV
          </Button>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: '72px minmax(0, 1fr) 300px' },
            alignItems: 'stretch',
            flexGrow: 1,
            minHeight: 0,
            pb: 1.5,
          }}
        >
          <ToolPanel
            mode={mode}
            onModeChange={handleToolModeChange}
            canDraw={labels.length > 0}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />

          <Paper sx={{ p: 2, minHeight: 0, height: '100%', position: 'relative' }}>
            <AnnotationSpatialCanvas
              spots={spots}
              coordinateBuffer={coordinateBuffer}
              imageMetadata={imageMetadata}
              annotationBuffer={annotationBuffer}
              annotationVersion={annotationVersion}
              labelColors={labelColors}
              spotOpacity={spotOpacity / 100}
              brushConfig={{ brushRadius, activeLabelId, mode }}
              brushCursorWorldPosition={brushCursorWorldPosition}
              cursorScreenPosition={cursorScreenPosition}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
            />
          </Paper>

          <LabelManagerPanel
            labels={labels}
            activeLabelId={activeLabelId}
            brushRadius={brushRadius}
            spotOpacity={spotOpacity}
            onBrushRadiusChange={setBrushRadius}
            onSpotOpacityChange={setSpotOpacity}
            onActiveLabelChange={setActiveLabelId}
            onAddLabel={handleAddLabel}
            onRenameLabel={handleRenameLabel}
            onRemoveLabel={handleRemoveLabel}
          />
        </Box>
      </Container>

      <Box
        sx={{
          bgcolor: grey["A700"],
          color: '#FFFFFF',
          borderTop: '1px solid rgb(189, 241, 182)',
          px: { xs: 1.5, md: 2.5 },
          py: 0.75,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography sx={{ fontSize: 12, fontFamily: 'monospace' }}>Coordinates: {formattedCoordinates}</Typography>
          <Typography sx={{ fontSize: 12, fontFamily: 'monospace' }}>Active Tool: {mode}</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default AnnotationPage;
