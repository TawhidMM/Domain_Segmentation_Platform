import axios from '@/lib/axios';
import { UploadType, DatasetTechnology } from '@/types/upload';
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
  status: 'processing' | 'ready' | 'failed';
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