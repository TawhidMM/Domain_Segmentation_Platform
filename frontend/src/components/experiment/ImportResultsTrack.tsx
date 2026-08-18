import React, { useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { v4 as uuid4 } from 'uuid';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CheckCircle, CloudUpload, Error as ErrorIcon, HourglassTop } from '@mui/icons-material';
import { useDatasetStore } from '@/stores/dataset';
import type { Experiment } from '@/types';
import { useImportResultsStore, type StagedResultItem } from '@/stores/import-results';
import { useExperimentsStore } from '@/stores/experiments';
import { useUIStore } from '@/stores/ui/uiStore.ts';
import FileUploadCard from '@/components/dataset/FileUploadCard';
import EntityList from '@/components/shared/EntityList';
import ImportedResultRow from './ImportedResultRow';
import {
  ImportValidationPayload,
  uploadResultBundleViaTus,
} from '@/services/importResultService';
import {
  ImportResultRequestPayload,
  submitImportedResult,
} from '@/services/experimentService';

interface ImportResultsTrackProps {
  availableDatasets?: Array<{ id: string; name: string }>;
}

interface UploadFilePreview {
  id: string;
  name: string;
  uploadProgress: number;
  status: 'PENDING' | 'UPLOADING' | 'SUCCESS' | 'ERROR';
  error?: string;
}

interface ConfigurationPanelProps {
  selectedDatasetId: string;
  availableDatasets: Array<{ id: string; name: string }>;
  uploadedFiles: UploadFilePreview[];
  uploaderEnabled: boolean;
  isSubmitting: boolean;
  onSelectedDatasetChange: (value: string) => void;
  onFileSelect: (files: File[]) => void;
}

interface StickyActionsFooterProps {
  canSubmit: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

interface SubmitFeedback {
  severity: 'success' | 'error' | 'info';
  message: string;
}

const ResultConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  selectedDatasetId,
  availableDatasets,
  uploadedFiles,
  uploaderEnabled,
  isSubmitting,
  onSelectedDatasetChange,
  onFileSelect,
}) => {
  const uploaderDisabled = !uploaderEnabled || !selectedDatasetId;
  const uploaderInteractionLocked = isSubmitting;

  const selectedDatasetName = useMemo(
    () => availableDatasets.find((dataset) => dataset.id === selectedDatasetId)?.name ?? null,
    [availableDatasets, selectedDatasetId]
  );

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: 'text.primary' }}>
          Import Pre-computed Results
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Upload a validated bundle zip and map it to an existing biological dataset.
        </Typography>
      </Box>

      <FormControl fullWidth>
        <InputLabel id="import-target-dataset-label">Target Dataset Mapping</InputLabel>
        <Select
          labelId="import-target-dataset-label"
          value={selectedDatasetId}
          label="Target Dataset Mapping"
          onChange={(event) => onSelectedDatasetChange(event.target.value as string)}
        >
          {availableDatasets.map((dataset) => (
            <MenuItem key={dataset.id} value={dataset.id}>
              {dataset.name}
            </MenuItem>
          ))}
          {availableDatasets.length === 0 && (
            <MenuItem disabled>No datasets available for configuration</MenuItem>
          )}
        </Select>
      </FormControl>

      <Box
        sx={{
          width: '100%',
          maxWidth: 720,
          opacity: uploaderDisabled ? 0.5 : 1,
          transition: 'all 240ms ease-in-out',
          pointerEvents: uploaderDisabled || uploaderInteractionLocked ? 'none' : 'auto',
          display: 'block',
        }}
      >
        {selectedDatasetName && (
          <Box
            sx={{
              mb: 2,
              px: 2,
              py: 1,
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'rgba(13, 148, 136, 0.25)',
              backgroundColor: 'rgba(13, 148, 136, 0.04)',
              display: 'inline-block',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.dark' }}>
              Staging results for: {selectedDatasetName}
            </Typography>
          </Box>
        )}

        <FileUploadCard
          title="Upload Result Bundle"
          description="Drag and drop or select the zip bundle containing predictions.csv and embeddings.csv."
          acceptedFormats={['.zip']}
          disabled={uploaderDisabled}
          readOnly={uploaderInteractionLocked}
          required
          multiple={false}
          uploadedFiles={uploadedFiles}
          onFileSelect={onFileSelect}
        />
      </Box>
    </Stack>
  );
};

const StagedResultsPanel: React.FC<{
  items: StagedResultItem[];
  onRemove: (stageId: string) => void;
}> = ({ items, onRemove }) => {
  return (
    <EntityList
      title={`Staged Results (${items?.length ?? 0})`}
      maxHeight={420}
      panelSx={{
        backgroundColor: 'background.paper',
      }}
    >
      {items?.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary', px: 1, py: 1 }}>
          Successful uploads will appear here.
        </Typography>
      )}
      {items?.map((item) => <ImportedResultRow key={item.stageId} item={item} onRemove={onRemove} />)}
    </EntityList>
  );
};

const ValidationStatusPanel: React.FC<{
  status: ImportValidationPayload | null;
}> = ({ status }) => {
  if (!status) {
    return null;
  }

  const severity = !status
    ? 'info'
    : status.status === 'success'
    ? 'success'
    : status.status === 'failed'
    ? 'error'
    : 'info';

  const icon = !status ? <HourglassTop /> : status.status === 'success' ? <CheckCircle /> : <ErrorIcon />;

  return (
    <Alert icon={icon} severity={severity as 'info' | 'success' | 'error'} sx={{ alignItems: 'center' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {status?.message ?? 'Uploading and validating result bundle...'}
        </Typography>
        {status?.error_type && (
          <Chip
            label={status.error_type}
            size="small"
            sx={{ width: 'fit-content', fontWeight: 600 }}
            color="error"
            variant="outlined"
          />
        )}
      </Box>
    </Alert>
  );
};

const StickyActionsFooter: React.FC<StickyActionsFooterProps> = ({ canSubmit, isSubmitting, onBack, onSubmit }) => {
  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        borderTop: '1px solid',
        borderColor: 'divider',
        py: 2.5,
        backgroundColor: 'background.paper',
        zIndex: 10,
        mt: 4,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Button variant="outlined" onClick={onBack} sx={{ px: 3, py: 1, fontWeight: 600, textTransform: 'none' }}>
          Back
        </Button>

        <Button
          variant="contained"
          disabled={!canSubmit || isSubmitting}
          onClick={onSubmit}
          startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <CloudUpload />}
          sx={{ px: 4, py: 1, fontWeight: 600, textTransform: 'none' }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Imported Experiment'}
        </Button>
      </Box>
    </Box>
  );
};

const ImportResultsTrack: React.FC<ImportResultsTrackProps> = ({ availableDatasets }) => {
  const successfulDatasets = useDatasetStore(
    useShallow((state) => state.datasets.filter((d) => d.status === 'SUCCESS'))
  );
  const setWorkspaceView = useUIStore((state) => state.setWorkspaceView);

  // Import Results Store — single source of truth for import workflow state
  const experimentName = useImportResultsStore((state) => state.experimentName);
  const selectedDatasetId = useImportResultsStore((state) => state.selectedDatasetId);
  const stagedItems = useImportResultsStore((state) => state.stagedItems);
  const submittedDatasetIds = useImportResultsStore((state) => state.submittedDatasetIds);
  const setToolName = useImportResultsStore((state) => state.setToolName);
  const setSelectedDatasetId = useImportResultsStore((state) => state.setSelectedDatasetId);
  const addStagedItem = useImportResultsStore((state) => state.addStagedItem);
  const removeStagedItem = useImportResultsStore((state) => state.removeStagedItem);
  const addSubmittedDatasetId = useImportResultsStore((state) => state.addSubmittedDatasetId);
  const addExperiment = useExperimentsStore((state) => state.addExperiment);
  const setActiveExperiment = useExperimentsStore((state) => state.setActiveExperiment);

  const datasetOptions = useMemo(
    () =>
      (availableDatasets?.length
        ? availableDatasets
        : successfulDatasets.map((dataset) => ({
            id: dataset.datasetId as string,
            name: dataset.datasetName,
          }))).filter((dataset) => Boolean(dataset.id)),
    [availableDatasets, successfulDatasets]
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadFilePreview[]>([]);
  const [validationStatus, setValidationStatus] = useState<ImportValidationPayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<SubmitFeedback | null>(null);

  const visibleDatasetOptions = useMemo(
    () =>
      datasetOptions.filter(
        (dataset) =>
          !stagedItems.some((item) => item.datasetId === dataset.id) &&
          !submittedDatasetIds.includes(dataset.id)
      ),
    [datasetOptions, stagedItems, submittedDatasetIds]
  );

  const handleDatasetChange = useCallback((datasetId: string) => {
    setSelectedDatasetId(datasetId);
    setSelectedFile(null);
    setUploadedFiles([]);
    setValidationStatus(null);
    setSubmitFeedback(null);
  }, [setSelectedDatasetId]);

  const handleUploadProgress = useCallback((progress: number) => {
    setUploadedFiles((previous) =>
      previous.map((filePreview) =>
        filePreview.status === 'ERROR'
          ? filePreview
          : {
              ...filePreview,
              status: 'UPLOADING',
              uploadProgress: progress,
            }
      )
    );
  }, []);

  const handleRemoveStagedItem = useCallback((stageId: string) => {
    removeStagedItem(stageId);
  }, [removeStagedItem]);

  const handleFileSelect = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file || !selectedDatasetId || !experimentName.trim()) {
        return;
      }

      if (!/\.zip$/i.test(file.name)) {
        setSelectedFile(null);
        setUploadedFiles([
          {
            id: uuid4(),
            name: file.name,
            uploadProgress: 0,
            status: 'ERROR',
            error: 'Only .zip files are supported.',
          },
        ]);
        return;
      }

      setSelectedFile(file);
      setSubmitFeedback(null);
      setUploadedFiles([
        {
          id: uuid4(),
          name: file.name,
          uploadProgress: 0,
          status: 'PENDING',
        },
      ]);
      setValidationStatus(null);

      setIsSubmitting(true);

      try {
        const uploadResult = await uploadResultBundleViaTus(file, selectedDatasetId, {
          onProgress: handleUploadProgress,
          onUploadComplete: () => {
            setValidationStatus({
              status: 'processing',
              message: 'Upload finished. Validating the result bundle...',
            });
          },
        });

        const { stageId, validation } = uploadResult;

        setUploadedFiles((previous) =>
          previous.map((filePreview) => ({
            ...filePreview,
            status: validation.status === 'failed' ? 'ERROR' : 'SUCCESS',
            uploadProgress: 100,
            error: validation.status === 'failed' ? validation.message : undefined,
          }))
        );
        setValidationStatus(validation);

        if (validation.status === 'success') {
          const datasetName = datasetOptions.find((dataset) => dataset.id === selectedDatasetId)?.name ?? selectedDatasetId;
          addStagedItem({
            stageId,
            datasetId: selectedDatasetId,
            datasetName,
            fileName: file.name,
          });

          setSelectedDatasetId('');
          setSelectedFile(null);
          setUploadedFiles([]);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to upload result bundle.';
        setValidationStatus({
          status: 'failed',
          error_type: 'INTERNAL_SYSTEM_ERROR',
          message,
        });
        setUploadedFiles((previous) =>
          previous.map((filePreview) => ({
            ...filePreview,
            status: 'ERROR',
            error: message,
          }))
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [datasetOptions, handleUploadProgress, selectedDatasetId, experimentName, addStagedItem, setSelectedDatasetId]
  );

  const handleSubmit = useCallback(async () => {
    if (stagedItems.length === 0 || isSubmitting) {
      return;
    }

    const payload: ImportResultRequestPayload = {
      results: stagedItems.map((item) => ({
        dataset_id: item.datasetId,
        stage_id: item.stageId,
      })),
      experiment_name: experimentName.trim(),
    };

    setIsSubmitting(true);
    setSubmitFeedback(null);

    try {
      console.log('Submitting imported experiment with payload:', payload);
      const response = await submitImportedResult(payload);

      const jobUrl = `${window.location.origin}/experiment/${response.experiment_id}?t=${response.access_token}`;
      window.open(jobUrl, '_blank');

      const experiment: Experiment = {
        id: uuid4(),
        toolId: experimentName.trim(),
        experimentName: `Imported: ${experimentName.trim()}`,
        datasetIds: stagedItems.map((item) => item.datasetId),
        experimentId: response.experiment_id,
        accessToken: response.access_token,
        parameters: {},
        numberOfRuns: stagedItems.length,
        seedList: [],
        status: 'queued',
        createdAt: new Date(),
        completedAt: null,
        result: null,
        metrics: null,
      };
      addExperiment(experiment);
      setActiveExperiment(experiment.id);
      setWorkspaceView('focus');

      setSubmitFeedback({
        severity: 'success',
        message: `Imported experiment queued: ${response.experiment_id}`,
      });

      const newlySubmitted = stagedItems.map((item) => item.datasetId).filter(
        (datasetId) => !submittedDatasetIds.includes(datasetId)
      );
      newlySubmitted.forEach((datasetId) => addSubmittedDatasetId(datasetId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit imported experiment.';
      setSubmitFeedback({
        severity: 'error',
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, stagedItems, experimentName, submittedDatasetIds, addSubmittedDatasetId, addExperiment, setActiveExperiment, setWorkspaceView]);

  const handleBack = useCallback(() => {
    setWorkspaceView('upload');
  }, [setWorkspaceView]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pt: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Typography
          component="a"
          href="/how-to-use#uploading-precomputed-results"
          target="_blank"
          rel="noopener"
          variant="caption"
          sx={{
            color: 'primary.main',
            textDecoration: 'none',
            cursor: 'pointer',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          How to Import Pre-computed Results ?
        </Typography>
      </Box>

      <TextField
        label="Tool Name"
        value={experimentName}
        onChange={(event) => setToolName(event.target.value)}
        fullWidth
        placeholder="my tool"
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 4,
          alignItems: 'flex-start',
        }}
      >
        <Box sx={{ flex: 1.2, width: '100%' }}>
          <ResultConfigurationPanel
            selectedDatasetId={selectedDatasetId}
            availableDatasets={visibleDatasetOptions}
            uploadedFiles={uploadedFiles}
            uploaderEnabled={Boolean(experimentName.trim())}
            isSubmitting={isSubmitting}
            onSelectedDatasetChange={setSelectedDatasetId}
            onFileSelect={handleFileSelect}
          />

          <Divider sx={{ borderStyle: 'dashed', my: 3 }} />

          <ValidationStatusPanel status={validationStatus} />

          {submitFeedback && (
            <Alert severity={submitFeedback.severity} sx={{ mt: 2, alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {submitFeedback.message}
              </Typography>
            </Alert>
          )}
        </Box>

        <Box
          sx={{
            flex: 0.8,
            width: '100%',
            minWidth: { md: 340 },
            position: { md: 'sticky' },
            top: { md: 24 },
          }}
        >
          <StagedResultsPanel items={stagedItems} onRemove={handleRemoveStagedItem} />
        </Box>
      </Box>

      <StickyActionsFooter
        canSubmit={stagedItems.length > 0 && Boolean(experimentName.trim())}
        isSubmitting={isSubmitting}
        onBack={handleBack}
        onSubmit={handleSubmit}
      />
    </Box>
  );
};

export default ImportResultsTrack;