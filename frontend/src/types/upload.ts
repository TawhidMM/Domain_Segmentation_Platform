// Mirrors backend UploadType enum
export const UploadType = {
  DATASET: 'dataset',
  PRE_COMPUTED_RESULT: 'pre_computed_result',
} as const;

export type UploadType = (typeof UploadType)[keyof typeof UploadType];

// Mirrors backend DatasetTechnology enum
export const DatasetTechnology = {
  VISIUM: 'visium',
} as const;

export type DatasetTechnology = (typeof DatasetTechnology)[keyof typeof DatasetTechnology];