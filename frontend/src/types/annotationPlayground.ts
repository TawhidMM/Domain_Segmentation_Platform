export interface AnnotationSpatialSpot {
  spotId: string;
  barcode: string;
  x: number;
  y: number;
  originalColor: [number, number, number];
  radius?: number;
}

export interface SpatialImageMetadata {
  url: string;
  bounds: [number, number, number, number];
}

export interface AnnotationLabel {
  id: number;
  name: string;
  color: [number, number, number];
}

export interface AnnotationJsonRow {
  barcode: string;
  label_id: number | null;
  label_name: string | null;
}

export interface AnnotationFileResponse {
  annotation_id: string;
  dataset_id: string;
  labels: AnnotationJsonRow[];
}

export interface AnnotationDataResponse {
  experiment_id: string;
  dataset_id: string;
  image_url: string | null;
  image_bounds: [number, number, number, number] | null;
  spots: Array<{
    id?: string | number;
    spot_id?: string | number;
    barcode?: string;
    x: number;
    y: number;
    color?: [number, number, number];
    rgb?: [number, number, number];
  }>;
}

export type AnnotationMode = 'pan' | 'draw' | 'erase';
