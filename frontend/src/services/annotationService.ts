import axios from '@/lib/axios';
import { AnnotationDataResponse, AnnotationFileResponse, AnnotationJsonRow } from '@/types/annotationPlayground';

const ANNOTATION_REQUEST = {
  experiment_id: '23ce568f-c4e8-4018-9a4a-027fc68ba51c',
  dataset_id: '20260305_102956_eeea',
  token: 'annotation-workspace-token',
};

export async function fetchAnnotationData(): Promise<AnnotationDataResponse> {
  const response = await axios.post('/experiments/spatial-data', ANNOTATION_REQUEST);
  return response.data as AnnotationDataResponse;
}

export async function fetchSpatialData(datasetId: string): Promise<AnnotationDataResponse> {
  const response = await axios.post('/datasets/spatial-data', {
    dataset_id: datasetId,
  });
  return response.data as AnnotationDataResponse;
}

export async function createAnnotation(datasetId: string, labels: AnnotationJsonRow[]): Promise<AnnotationFileResponse> {
  const response = await axios.post('/annotations', {
    dataset_id: datasetId,
    labels,
  });
  return response.data as AnnotationFileResponse;
}

export async function fetchAnnotationFile(
  datasetId: string,
  annotationId: string,
): Promise<AnnotationFileResponse> {
  const response = await axios.post('/get-annotation', {
    dataset_id: datasetId,
    annotation_id: annotationId,
  });
  return response.data as AnnotationFileResponse;
}
