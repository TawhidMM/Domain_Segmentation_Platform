// Workspace navigation view — the authoritative routing contract for the app.
// Consumed by components, context, and multiple stores (ui, pipeline, bootstrap).
export const WorkspaceView = {
  UPLOAD: 'upload',
  BUILDER: 'builder',
  FOCUS: 'focus',
} as const;

export type WorkspaceView = (typeof WorkspaceView)[keyof typeof WorkspaceView];


// Sub-tab within the BUILDER view (pipeline configuration vs. import results).
export const WorkspaceTab = {
  PIPELINE: 'pipeline',
  IMPORT: 'import',
} as const;

export type WorkspaceTab = (typeof WorkspaceTab)[keyof typeof WorkspaceTab];
