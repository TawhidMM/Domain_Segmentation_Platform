import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useApp } from '@/context/AppContext';
import FileUploadCard from '@/components/dataset/FileUploadCard';
import EntityList from '@/components/shared/EntityList';
import ImportedResultRow from './ImportedResultRow';
import {
  ImportValidationPayload,
  uploadResultBundle,
} from '@/services/importResultService';
import {
  ImportResultRequestPayload,
  submitImportedResult,
} from '@/services/experimentService';

const IMPORT_RESULTS_STORAGE_KEY = 'import-results-workflow-state-v1';

export interface StagedResultItem {
  stageId: string;
  datasetId: string;
  datasetName: string;
  fileName: string;
}

interface PersistedImportState {
  toolName: string;
  selectedDatasetId: string;
  experimentTitle?: string;
}

interface ImportResultsTrackProps {
  availableDatasets?: Array<{ id: string; name: string }>;
  onStepChange?: (step: number) => void;
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
      title={`Staged Bundles (${items.length})`}
      maxHeight={420}
      panelSx={{
        backgroundColor: 'background.paper',
      }}
    >
      {items.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', px: 1, py: 1 }}>
          Successful uploads will appear here.
        </Typography>
      ) : (
        items.map((item) => <ImportedResultRow key={item.stageId} item={item} onRemove={onRemove} />)
      )}
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

const StickyActionsFooter: React.FC<StickyActionsFooterProps> = ({ canSubmit, isSubmitting, onSubmit }) => {
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
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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

const ImportResultsTrack: React.FC<ImportResultsTrackProps> = ({ availableDatasets, onStepChange }) => {
  const { successfulDatasets } = useApp();

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

  const [toolName, setToolName] = useState('my tool');
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [stagedItems, setStagedItems] = useState<StagedResultItem[]>([]);
  const [submittedDatasetIds, setSubmittedDatasetIds] = useState<string[]>([]);
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

  useEffect(() => {
    const savedState = window.sessionStorage.getItem(IMPORT_RESULTS_STORAGE_KEY);
    if (!savedState) {
      return;
    }

    try {
      const parsed = JSON.parse(savedState) as PersistedImportState;
      setToolName(parsed.toolName ?? parsed.experimentTitle ?? 'my tool');
      setSelectedDatasetId(parsed.selectedDatasetId ?? '');
    } catch {
      window.sessionStorage.removeItem(IMPORT_RESULTS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const toPersist: PersistedImportState = {
      toolName,
      selectedDatasetId,
    };

    window.sessionStorage.setItem(IMPORT_RESULTS_STORAGE_KEY, JSON.stringify(toPersist));
  }, [toolName, selectedDatasetId]);

  useEffect(() => {
    onStepChange?.(0);
  }, [onStepChange]);

  const handleDatasetChange = useCallback((datasetId: string) => {
    setSelectedDatasetId(datasetId);
    setSelectedFile(null);
    setUploadedFiles([]);
    setValidationStatus(null);
    setSubmitFeedback(null);
  }, []);

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
    setStagedItems((previous) => previous.filter((item) => item.stageId !== stageId));
  }, []);

  const handleFileSelect = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file || !selectedDatasetId || !toolName.trim()) {
        return;
      }

      if (!/\.zip$/i.test(file.name)) {
        setSelectedFile(null);
        setUploadedFiles([
          {
            id: crypto.randomUUID(),
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
          id: crypto.randomUUID(),
          name: file.name,
          uploadProgress: 0,
          status: 'PENDING',
        },
      ]);
      setValidationStatus(null);

      setIsSubmitting(true);

      try {
        const uploadResult = await uploadResultBundle(file, selectedDatasetId, {
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
          setStagedItems((previous) => [
            ...previous,
            {
              stageId,
              datasetId: selectedDatasetId,
              datasetName,
              fileName: file.name,
            },
          ]);

          window.sessionStorage.removeItem(IMPORT_RESULTS_STORAGE_KEY);
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
    [datasetOptions, handleUploadProgress, selectedDatasetId, toolName]
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
      tool_name: toolName.trim(),
    };

    setIsSubmitting(true);
    setSubmitFeedback(null);

    try {
      console.log('Submitting imported experiment with payload:', payload);
      const response = await submitImportedResult(payload);

      const jobUrl = `${window.location.origin}/experiment/${response.experiment_id}?t=${response.access_token}`;
      window.open(jobUrl, '_blank');
      
      setSubmitFeedback({
        severity: 'success',
        message: `Imported experiment queued: ${response.experiment_id}`,
      });
      setSubmittedDatasetIds((previous) => [
        ...previous,
        ...stagedItems.map((item) => item.datasetId).filter((datasetId) => !previous.includes(datasetId)),
      ]);
      setStagedItems([]);
      setValidationStatus(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit imported experiment.';
      setSubmitFeedback({
        severity: 'error',
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, stagedItems, toolName]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pt: 1 }}>
      <TextField
        label="Tool Name"
        value={toolName}
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
            uploaderEnabled={Boolean(toolName.trim())}
            isSubmitting={isSubmitting}
            onSelectedDatasetChange={handleDatasetChange}
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

      <StickyActionsFooter canSubmit={stagedItems.length > 0 && !isSubmitting} isSubmitting={isSubmitting} onSubmit={handleSubmit} />
    </Box>
  );
};

export default ImportResultsTrack;
