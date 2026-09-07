import axios from '@/lib/axios';
import { UploadType, DatasetTechnology } from '@/types/upload';
import { DatasetExtractionStatus, DownloadPhase } from '@/types';
import { tusUpload } from '@/services/tusUpload';

export async function uploadViaTus(
  file: File,
  datasetName: string,
  onProgress: (pct: number) => void
): Promise<string> {
  const { promise } = tusUpload({
    file,
    metadata: {
      upload_type: UploadType.DATASET,
      dataset_name: datasetName,
      technology: DatasetTechnology.VISIUM,
      filename: file.name,
    },
    onProgress,
  });
  return promise;
}


export async function updateDatasetName(datasetId: string, datasetName: string): Promise<void> {
  await axios.patch(`/datasets/${datasetId}/name`, { dataset_name: datasetName });
}


export async function validateDatasetExistence(datasetIds: string[]): Promise<string[]> {
  const response = await axios.post<{ validIds: string[] }>(
            '/datasets/check-existence', 
            { dataset_ids: datasetIds }
          );
           
  return response.data.validIds;
}


export interface DatasetExtractionStatusResponse {
  dataset_id: string;
  status: DatasetExtractionStatus;
  error?: string;
}

export async function getDatasetStatus(datasetId: string): Promise<DatasetExtractionStatusResponse> {
  const response = await axios.get<DatasetExtractionStatusResponse>(
    `/datasets/${datasetId}/status`
  );
  return response.data;
}


export async function deleteDataset(datasetId: string): Promise<void> {
  await axios.delete('/datasets/delete', {
    data: { dataset_id: datasetId }
  });
}


export interface SampleDownloadItem {
  dataset_id: string;
  dataset_name: string;
  status: string;
  task_id: string;
}

export interface SampleDownloadResponse {
  downloads: SampleDownloadItem[];
}

export async function downloadSampleDatasets(
  technology: string
): Promise<SampleDownloadResponse> {
  const response = await axios.post<SampleDownloadResponse>(
    '/datasets/download-samples',
    { technology }
  );
  return response.data;
}


export interface DownloadProgressResponse {
  dataset_id: string;
  phase: DownloadPhase;
  percent?: number;
  downloaded_bytes?: number;
  total_bytes?: number;
  error?: string;
}

export async function getDownloadProgress(
  datasetId: string,
  taskId: string
): Promise<DownloadProgressResponse> {
  const response = await axios.post<DownloadProgressResponse>(
    '/datasets/download-progress',
    { dataset_id: datasetId, task_id: taskId }
  );
  return response.data;
}
