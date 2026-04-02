import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Container, Paper, Typography } from '@mui/material';
import { grey } from '@mui/material/colors';
import { useLocation, useNavigate } from 'react-router-dom';

import AnnotationSpatialCanvas from '@/components/annotation-workspace/AnnotationSpatialCanvas';
import LabelManagerPanel from '@/components/annotation-workspace/LabelManagerPanel';
import ToolPanel from '@/components/annotation-workspace/ToolPanel';
import { useApp } from '@/context/AppContext';
import { useAnnotationBrush } from '@/hooks/useAnnotationBrush';
import { useAnnotationHistory } from '@/hooks/useAnnotationHistory';
import { useAnnotationData } from '@/hooks/useAnnotationData';
import { useAnnotationSpatialIndex } from '@/hooks/useAnnotationSpatialIndex';
import {
  AnnotationLabel,
  AnnotationMode,
  AnnotationJsonRow,
} from '@/types/annotationPlayground';
import {
  buildAnnotationCsvContent,
  buildAnnotationCsvRows,
  buildAnnotationJsonRows,
  downloadCsvFile,
} from '@/utils/annotationExport';
import { getLabelColorFromPalette } from '@/utils/annotationColors';
import { createAnnotation, fetchAnnotationFile } from '@/services/annotationService';

const UNLABELED_COLOR: [number, number, number] = [200, 200, 200];
const INITIAL_LABELS: AnnotationLabel[] = [];

const AnnotationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setDatasetAnnotation } = useApp();

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const datasetId = query.get('dataset_id');
  const annotationId = query.get('annotation_id');
  const returnTo = query.get('return_to') ?? '/';

  const { coordinateBuffer, spots, imageMetadata, annotationBuffer, loading, error } = useAnnotationData(datasetId);
  const { kdTree } = useAnnotationSpatialIndex(spots);

  const [brushRadius, setBrushRadius] = useState<number>(20);
  const [spotOpacity, setSpotOpacity] = useState<number>(100);
  const [activeLabelId, setActiveLabelId] = useState<number | null>(null);
  const [labels, setLabels] = useState<AnnotationLabel[]>(INITIAL_LABELS);
  const [mode, setMode] = useState<AnnotationMode>('pan');
  const [annotationVersion, setAnnotationVersion] = useState(0);
  const [annotationFileLoading, setAnnotationFileLoading] = useState<boolean>(Boolean(annotationId));
  const [annotationFileError, setAnnotationFileError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!datasetId || !annotationId) {
      setAnnotationFileLoading(false);
      return;
    }

    let mounted = true;

    const loadAnnotationFile = async () => {
      setAnnotationFileLoading(true);
      setAnnotationFileError(null);

      try {
        const payload = await fetchAnnotationFile(datasetId, annotationId);
        if (!mounted) {
          return;
        }

        const annotationRows = payload.labels ?? [];
        const indexByBarcode = new Map<string, number>();
        for (let i = 0; i < spots.length; i += 1) {
          indexByBarcode.set(spots[i].barcode, i);
        }

        const nextBuffer = new Uint8Array(spots.length);
        const nextLabelsMap = new Map<number, AnnotationLabel>();

        for (const row of annotationRows) {
          const spotIndex = indexByBarcode.get(row.barcode);
          if (spotIndex === undefined) {
            continue;
          }

          const labelId = row.label_id ?? 0;
          nextBuffer[spotIndex] = labelId;

          if (labelId === 0 || nextLabelsMap.has(labelId)) {
            continue;
          }

          nextLabelsMap.set(labelId, {
            id: labelId,
            name: row.label_name ?? `Label ${labelId}`,
            color: getLabelColorFromPalette(labelId),
          });
        }

        annotationBuffer.set(nextBuffer);
        requestRenderUpdate();

        const nextLabels = Array.from(nextLabelsMap.values()).sort((a, b) => a.id - b.id);
        setLabels(nextLabels);
        setActiveLabelId(nextLabels[0]?.id ?? null);
      } catch (error) {
        if (!mounted) {
          return;
        }

        const messageFromResponse =
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          typeof (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail === 'string'
            ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
            : null;

        setAnnotationFileError(messageFromResponse ?? 'Failed to load saved annotation');
      } finally {
        if (mounted) {
          setAnnotationFileLoading(false);
        }
      }
    };

    void loadAnnotationFile();

    return () => {
      mounted = false;
    };
  }, [annotationBuffer, annotationId, datasetId, requestRenderUpdate, spots]);

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

  const handleSaveAnnotation = useCallback(() => {
    if (!datasetId) {
      return;
    }

    const payloadLabels: AnnotationJsonRow[] = buildAnnotationJsonRows(spots, annotationBuffer, labels);

    void (async () => {
      try {
        const savedAnnotation = await createAnnotation(datasetId, payloadLabels);
        setDatasetAnnotation(datasetId, savedAnnotation.annotation_id);

        const returnQuery = new URLSearchParams({
          dataset_id: datasetId,
          annotation_id: savedAnnotation.annotation_id,
        });
        const separator = returnTo.includes('?') ? '&' : '?';

        navigate(`${returnTo}${separator}${returnQuery.toString()}`);
      } catch (error) {
        console.error('Failed to save annotation:', error);
      }
    })();
  }, [annotationBuffer, datasetId, labels, navigate, returnTo, setDatasetAnnotation, spots]);

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

  if (annotationFileLoading) {
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
            Loading saved annotation...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (annotationFileError) {
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
            Unable to load saved annotation
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {annotationFileError}
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

  if (!datasetId) {
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
            Missing dataset_id
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Open this page from the Dataset Annotation List so the target dataset can be loaded.
          </Typography>
          <Button variant="contained" onClick={() => navigate(returnTo)}>
            Back to annotation list
          </Button>
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
                fontFamily: 'monospace',
              }}
            >
              {datasetId}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button variant="outlined" onClick={handleExportCsv} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
              Export CSV
            </Button>
            <Button variant="contained" onClick={handleSaveAnnotation} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
                {annotationId ? 'Update Annotation' : 'Save Annotation'}
            </Button>
          </Box>
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
