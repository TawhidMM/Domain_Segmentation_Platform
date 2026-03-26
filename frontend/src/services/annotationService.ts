import axios from '@/lib/axios';
import { AnnotationDataResponse } from '@/types/annotationPlayground';

const ANNOTATION_REQUEST = {
  experiment_id: '23ce568f-c4e8-4018-9a4a-027fc68ba51c',
  dataset_id: '20260305_102956_eeea',
  token: 'annotation-workspace-token',
};

export async function fetchAnnotationData(): Promise<AnnotationDataResponse> {
  const response = await axios.post('/experiments/spatial-data', ANNOTATION_REQUEST);
  return response.data as AnnotationDataResponse;
}
