# Frontend Architecture Report — Domain Segmentation Platform

> **Date:** 2026-06-28  
> **Scope:** `frontend/src/`  
> **Goal:** Provide a complete architectural analysis to guide migration from React Context + hybrid state to Zustand.

---

## 1. Folder Structure

```
frontend/src/
├── App.tsx                        # Root: QueryClientProvider → ThemeProvider → AppProvider → Router
├── main.tsx                       # Entry point
├── index.css / App.css            # Global styles
├── vite-env.d.ts
│
├── context/
│   ├── AppContext.tsx              # ← CENTRAL GOD CONTEXT (610 lines, ~30 state fields)
│   └── ComparisonDatasetContext.tsx# Specialized context for comparison page
│
├── store/
│   └── useWorkspaceStore.ts       # ← ONLY existing Zustand store (persisted to localStorage)
│
├── services/                      # API layer
│   ├── uploadService.ts           # Dataset upload (chunked)
│   ├── experimentService.ts       # Experiments, results, metrics, comparison, export
│   ├── annotationService.ts       # Annotation CRUD
│   ├── importResultService.ts     # Imported result upload + validation
│   ├── toolService.ts             # Tool schemas
│   └── workspaceService.ts        # Dataset validation
│
├── hooks/                         # 17 custom hooks
│   ├── useJobTracking.ts          # Single job polling + result fetch
│   ├── useMultiJobResults.ts      # Parallel static result fetch
│   ├── useMetricsAnalysis.ts      # Best-metric analysis (pure computation)
│   ├── useMultiExperimentBestRuns.ts # Best-run fetch for comparison
│   ├── useDragAndDrop.ts          # DnD state (local)
│   ├── useJobReordering.ts        # URL-based reordering
│   ├── useComparisonBasket.ts     # localStorage basket for comparison
│   ├── useCompareJobsParams.ts    # URL param parsing + redirect
│   ├── useParameterDrafts.ts      # Debounced param sync to AppContext
│   ├── useAnnotationData.ts       # Annotation spatial data fetch
│   ├── useAnnotationHistory.ts    # Undo/redo for annotations
│   ├── useAnnotationBrush.ts      # Brush interaction logic
│   ├── useAnnotationPointerState.ts# Pointer tracking
│   ├── useAnnotationSpatialIndex.ts# KD-tree index
│   ├── useStrokeInterpolation.ts  # Stroke interpolation math
│   ├── use-toast.ts               # Toast notification system
│   └── use-mobile.tsx             # Responsive breakpoint
│
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx          # TopNavBar + LeftPanel + MainWorkspace + FloatingCompareBar
│   ├── navigation/
│   │   ├── LeftPanel.tsx          # Dataset status + experiment list
│   │   └── ExperimentsList*       # (list component, not read)
│   ├── dataset/
│   │   ├── DatasetUpload.tsx      # Upload page with drag-drop
│   │   ├── FileUploadCard.tsx     # Drag-and-drop file card
│   │   └── DatasetUploadTable*    # Uploaded files table
│   ├── experiment/
│   │   └── ExperimentBuilder*     # Experiment parameter builder
│   ├── workspace/
│   │   └── MainWorkspace.tsx      # Route switch by workspaceMode
│   ├── visualization/
│   │   ├── SpatialPlot.tsx        # Plotly scatter plot
│   │   ├── FocusView*             # Focus mode view
│   │   ├── ComparisonView*        # Comparison view
│   │   ├── FloatingCompareBar.tsx # Fixed bottom comparison bar
│   │   ├── CompareJobList.tsx     # Sidebar for compare page
│   │   ├── MetricsTable.tsx       # Metrics display table
│   │   ├── MetricsBarCharts*      # Metrics bar charts
│   │   └── SpatialConsensusVisualization* # Consensus visualization
│   ├── compare/
│   │   └── overlayDomain/         # Overlay domain map
│   ├── annotation-workspace/
│   │   ├── AnnotationSpatialCanvas*# Deck.gl canvas
│   │   ├── LabelManagerPanel*     # Label management
│   │   └── ToolPanel*             # Annotation tools
│   └── ui/                        # shadcn components
│
├── pages/
│   ├── Index.tsx                  # AppLayout wrapper
│   ├── FocusPage.tsx              # Single experiment view (601 lines)
│   ├── ComparePage.tsx            # Multi-experiment comparison (474 lines)
│   ├── AnnotationPage.tsx         # Annotation workspace (616 lines)
│   ├── JobStatus.tsx              # Public job status page (271 lines)
│   └── NotFound.tsx               # 404
│
├── types/
│   ├── index.ts                   # Core domain types (258 lines)
│   └── annotationPlayground.ts    # Annotation-specific types
│
├── config/
│   └── metricsConfig.ts           # Metric definitions + chart config
│
├── lib/
│   ├── axios.ts                   # Axios instance (baseURL, interceptors)
│   ├── utils.ts                   # cn() utility
│   └── colorMaps.ts               # Viridis colormap, domain colors
│
├── utils/
│   ├── dependsOn.ts               # Conditional parameter visibility
│   ├── annotationExport.ts        # CSV/JSON annotation export
│   └── annotationColors.ts       # Label color generation
│
├── data/
│   ├── mockData.ts                # Mock result/summary generators
│   └── toolConfigs.ts             # Static tool configs
│
└── theme/
    └── muiTheme.ts                # MUI theme customization
```

---

## 2. STATE MANAGEMENT

### 2.1 React Context (AppContext) — THE GOD CONTEXT

**File:** `frontend/src/context/AppContext.tsx`  
**Size:** 610 lines, ~30 state items exposed via `useApp()`  
**Pattern:** `useState` + `useCallback` for everything, no `useReducer`

#### Everything Exposed by AppContext:

| Category | State Field | Type | Description |
|----------|------------|------|-------------|
| **Dataset Upload** | `dataset` | `Dataset` | Contains queue, spatial coords, tissue image, summary |
| | `successfulDatasets` | `UploadedDataset[]` | **Read from Zustand store** (useWorkspaceStore) |
| | `uploadGeneExpression` | fn | Enqueues files, triggers processing |
| | `retryUploadQueueItem` | fn | Resets queue item status |
| | `updateDatasetName` | fn | Updates name in Zustand + local queue |
| | `removeUploadedDataset` | fn | Removes from queue + Zustand + drafts + selections |
| | `isDatasetReady` | fn | Checks `successfulDatasets.length > 0` |
| | `uploadSpatialCoordinates` | fn | Sets file, may generate mock summary |
| | `uploadTissueImage` | fn | Sets file |
| **Experiments** | `experiments` | `Experiment[]` | Full experiment list |
| | `activeExperimentId` | `string \| null` | Currently focused experiment |
| | `createExperiment` | fn | Creates + sets active + switches to focus mode |
| | `setActiveExperiment` | fn | Sets active ID + switches mode |
| | `removeExperiment` | fn | Removes from list + comparison set |
| | `submitExperiments` | fn | POSTs to backend, updates status |
| | `refreshExperimentResult` | fn | Fetches result + metrics from backend |
| **Workspace Mode** | `workspaceMode` | `WorkspaceMode` | 'upload' \| 'builder' \| 'focus' \| 'comparison' |
| | `setWorkspaceMode` | fn | Switches active workspace tab |
| | `startNewExperiment` | fn | **Clears sessionStorage** + resets params → 'builder' |
| **Comparison** | `comparisonExperimentIds` | `string[]` | IDs toggled for comparison (max 4) |
| | `toggleComparisonExperiment` | fn | Add/remove from comparison (max 4) |
| | `clearComparisonExperiments` | fn | Empty comparison set |
| **Multi-Dataset Params** | `parameterDrafts` | `Record<dId, Record<key, val>>` | Per-dataset parameter overrides |
| | `selectedDatasetIds` | `string[]` | Selected datasets for bulk edit |
| | `focusDatasetId` | `string \| null` | Currently focused dataset for params |
| | `datasetAnnotationMap` | `Record<dId, aId>` | Map of dataset → annotation ID |
| | `updateParameterDraft` | fn | Debounced sync (via useParameterDrafts hook) |
| | `setSelectedDatasetIds` | fn | Selection setter |
| | `setFocusDatasetId` | fn | Focus setter |
| | `resetParameterDrafts` | fn | Resets ALL param state |
| | `setDatasetAnnotation` | fn | Sets annotation for dataset |
| | `clearDatasetAnnotation` | fn | Clears annotation for dataset |

**Key Observation:** `successfulDatasets` is the only field that reads from the Zustand store (`useWorkspaceStore`). Everything else is `useState` inside AppContext. There is NO `useReducer`.

### 2.2 React Context (ComparisonDatasetContext)

**File:** `frontend/src/context/ComparisonDatasetContext.tsx`  
**Size:** 107 lines  
**Scope:** Only wraps `<ComparePageContent>`  
**State:** `datasets`, `selectedDataset`, `isLoading`, `error` — all `useState`  
**API Call:** `fetchComparisonDatasets(experiments)` on mount/experiments change  
**Dependency:** Receives `experiments` array as a prop

This is already well-separated from AppContext and only used on the compare page.

### 2.3 Zustand Store (useWorkspaceStore)

**File:** `frontend/src/store/useWorkspaceStore.ts`  
**Size:** 86 lines  
**State:** `uploadedDatasets: UploadedDataset[]`  
**Actions:** `setUploadedDatasets`, `upsertUploadedDataset`, `updateUploadedDatasetName`, `removeUploadedDataset`, `clearWorkspace`, `validateDatasetsWithBackend`  
**Persistence:** `localStorage` via `zustand/middleware/persist`  
**Key:** `workspace-state-v1`

This is the ONLY Zustand store. It handles dataset metadata persistence across sessions.

### 3.4 React Query

**File:** `frontend/src/App.tsx`  
**Setup:** `QueryClientProvider` wraps the entire app with a `QueryClient`  
**Usage:** ZERO! The `queryClient` is created but **no `useQuery` or `useMutation` hooks are used anywhere** in the codebase. All data fetching is done via raw `useEffect` + service calls or custom hooks that call services directly.

### 3.5 useState Usage (Outside AppContext)

- **FocusPage.tsx:** ~15 useState calls for rotation, mirror, export state, experimentData, selectedRunId, expandedDatasets, status, result, metrics, isLoading, isPolling, error, errorCode
- **ComparePage.tsx:** consensusData, consensusLoading, consensusError, activeTab, isExportingMetrics
- **CompareJobList.tsx:** expandedDatasets
- **SpatialPlot.tsx:** histologyMode, overlayOpacity, loadedHistologyUrl, histologySize, histologyStatus
- **AnnotationPage.tsx:** brushRadius, spotOpacity, activeLabelId, labels, mode, annotationVersion, annotationFileLoading, annotationFileError
- **useJobTracking.ts:** status, result, metrics, isLoading, isPolling, error, errorCode
- **useMultiJobResults.ts:** `{ [jobId]: JobResultState }`
- **useMultiExperimentBestRuns.ts:** `{ [expId]: ExperimentBestRunData }`, `{ [expId]: ExperimentMetricsData }`
- **useDragAndDrop.ts:** draggedJobId, dragOverJobId
- **useComparisonBasket.ts:** basket, isInitialized (synced to localStorage)
- **useAnnotationBrush.ts:** isDrawing, cursorScreenPosition, currentPoint, previousPoint, currentStrokeChanges
- **useAnnotationHistory.ts:** undoStack, redoStack
- **useAnnotationPointerState.ts:** isDrawing, currentMouseWorld, previousMouseWorld, cursorScreenPosition, interpolatedWorldPath
- **useAnnotationData.ts:** spots, coordinateBuffer, imageMetadata, annotationBuffer, loading, error

### 3.6 Props Drilling

Identified instances:

| Path | Props Drilled | Depth |
|------|---------------|-------|
| `DatasetUpload -> FileUploadCard` | `uploadedFiles`, `onFileSelect` | 1 level |
| `DatasetUpload -> DatasetUploadTable` | `items`, `onUpdateName`, `onRetry`, `onDelete` | 1 level |
| `FocusPage -> SpatialPlot` | `result`, `metrics`, `rotation`, `mirrorX`, `mirrorY`, `jobId`, `accessToken` | 1 level |
| `FocusPage -> DatasetExplorer` | `datasets`, `selectedRunId`, `expandedDatasets`, `onRunSelect`, `onDatasetToggle` | 1 level |
| `MainWorkspace -> FocusView` | `experiment` | 1 level |
| `AnnotationPage -> AnnotationSpatialCanvas` | ~12 props (spots, coordinateBuffer, imageMetadata, annotationBuffer, annotationVersion, labelColors, etc.) | 1 level |
| `AnnotationPage -> LabelManagerPanel` | ~8 props (labels, activeLabelId, brushRadius, spotOpacity, callbacks) | 1 level |
| `AnnotationPage -> ToolPanel` | ~7 props (mode, onModeChange, canDraw, canUndo, canRedo, onUndo, onRedo) | 1 level |
| `ComparePage -> CompareJobList` | `experiments`, `onRemoveExperiment` | 1 level |
| `ComparePage -> MetricsTable` | `experimentMetrics`, `experimentIds` | 1 level |

**Assessment:** Props drilling is limited to 1-2 levels. The bigger issue is that components reach into AppContext directly (summarized below).

---

## 4. COMPONENTS THAT DEPEND ON AppContext

| Component | What it reads from AppContext |
|-----------|------------------------------|
| `MainWorkspace` | `workspaceMode`, `experiments`, `activeExperimentId` |
| `LeftPanel` | `dataset`, `isDatasetReady`, `startNewExperiment`, `experiments`, `setWorkspaceMode` |
| `DatasetUpload` | `dataset`, `uploadGeneExpression`, `removeUploadedDataset`, `retryUploadQueueItem`, `updateDatasetName` |
| `AnnotationPage` | `setDatasetAnnotation` (only for saving annotation) |
| `useParameterDrafts` (hook) | `parameterDrafts`, `selectedDatasetIds`, `focusDatasetId`, `updateParameterDraft` |

**Components NOT depending on AppContext (self-contained):**
- `FocusPage` (uses `useComparisonBasket` + direct service calls)
- `ComparePage` (uses custom hooks + `ComparisonDatasetContext`)
- `JobStatus` (uses `useJobTracking` hook)
- `SpatialPlot` (stateless, receives all data via props)
- `MetricsTable` (stateless, receives all data via props)
- `CompareJobList` (uses `ComparisonDatasetContext`)
- `FloatingCompareBar` (uses `useComparisonBasket`)
- `FileUploadCard` (pure props, no context)
- All annotation workspace components (canvas, panels)

---

## 5. DATA FLOW PER FEATURE

### 5.1 Dataset Upload

```
Origin: FileUploadCard (drag/drop or file input)
  → onFileSelect callback
  → DatasetUpload.uploadGeneExpression (from AppContext)
  → AppContext: files enqueued → processUploadQueue (sequential)
    → uploadService.uploadGeneExpressionFile (chunked upload)
    → On success: upsertUploadedDataset → Zustand store (persisted)
    → Dataset state updated with queue status
  → Consumers: DatasetUploadTable renders uploadedDatasets from Zustand
  → LeftPanel: isDatasetReady() checks uploadedDatasets.length
```

### 5.2 Experiment Builder

```
Origin: LeftPanel "New Experiment" button
  → AppContext.startNewExperiment() → clears sessionStorage, resets params, mode = 'builder'
  → ExperimentBuilder renders tool selection + parameter forms
  → useParameterDrafts hook syncs to AppContext.parameterDrafts (debounced)
  → On "Create": AppContext.createExperiment() → experiments[] + mode = 'focus'
```

### 5.3 Pipeline Execution

```
Origin: AppContext.submitExperiments(email)
  → Maps experiments + parameterDrafts + datasetAnnotationMap
  → axios.post('/experiments/submit', datasetConfigs)
  → Updates experiment status to 'queued' + stores jobId/accessToken
  → Returns { experimentId, accessToken } for redirect
```

### 5.4 Results Viewing

```
Origin: FocusPage or JobStatus page
  → FocusPage: direct service calls (fetchExperimentDetails, fetchRunStatus, fetchExperimentResult)
    → State managed locally with ~15 useState calls
    → Polls every 5s, renders SpatialPlot on completion
  → JobStatus: useJobTracking hook
    → Manages all state internally (status, result, metrics, polling)
    → Also renders SpatialPlot
```

**NOTABLE:** FocusPage and JobStatus duplicate similar job-tracking logic. FocusPage does it inline (~75 lines of useEffect), JobStatus delegates to `useJobTracking` hook.

### 5.5 Comparison

```
Origin: FocusPage "Add to Compare" button
  → useComparisonBasket.addJob(jobId, token) → localStorage
  → FloatingCompareBar reads basket → "Compare Now" navigates to /compare?jobs=...&tokens=...
  → ComparePage: useCompareJobsParams parses URL, validates, redirects if invalid
  → ComparisonDatasetProvider fetches available datasets
  → useMultiExperimentBestRuns fetches best-run results for each experiment
  → Tab-based UI: Plots, Metrics, Consensus, Domain Comparison, Overlay Domain Map
```

---

## 6. API LAYER (SERVICES)

| Service File | Functions | Used By |
|-------------|-----------|---------|
| `uploadService.ts` | `uploadGeneExpressionFile` | `AppContext.processUploadQueue` |
| `experimentService.ts` | `fetchExperimentResult`, `fetchExperimentMetrics`, `fetchExperimentDetails`, `fetchJobStatus`, `fetchRunStatus`, `exportExperiment`, `exportExperimentUmap`, `exportComparisonMetrics`, `downloadCompareMetricBoxplots`, `exportComparisonMetricSvg`, `fetchConsensusData`, `fetchDomainComparisonData`, `fetchOverlayDomainMapData`, `fetchBestRunResult`, `fetchAllExperimentRunMetrics`, `fetchComparisonDatasets`, `submitImportedResult` | AppContext, FocusPage (direct), useJobTracking, useMultiJobResults, useMultiExperimentBestRuns, ComparePage |
| `annotationService.ts` | `fetchAnnotationData`, `fetchSpatialData`, `createAnnotation`, `fetchAnnotationFile` | `useAnnotationData`, AnnotationPage |
| `importResultService.ts` | `initializeResultUpload`, `uploadResultChunk`, `finalizeResultUpload`, `fetchImportResultStatus`, `pollImportResultStatus`, `uploadResultBundle` | (not yet connected to UI) |
| `toolService.ts` | `fetchToolSchemas`, `fetchToolSchema` | ExperimentBuilder (likely) |
| `workspaceService.ts` | `validateWorkspaceDataset` | `useWorkspaceStore.validateDatasetsWithBackend` |

### Duplicated API Logic

1. **Job polling:** `FocusPage` has inline polling logic (useEffect + setInterval, lines 87-146) that duplicates `useJobTracking` hook logic (lines 150-197). Both fetch status, poll every 5s, fetch result + metrics on completion.

2. **Result fetching:** `useJobTracking.fetchResult` (lines 98-147) and `useMultiJobResults` (lines 50-117) both call `fetchExperimentResult` + `fetchExperimentMetrics` in parallel with similar error handling.

3. **`fetchExperimentResult` + `fetchExperimentMetrics`** are called together in 4 places:
   - `AppContext.refreshExperimentResult` (line 459)
   - `useJobTracking.fetchResult` (line 108)
   - `useMultiJobResults` (line 70)
   - `FocusPage` inline (line 100)

---

## 7. PERSISTENCE

### 7.1 localStorage

| Key | Store | Type | What it stores |
|-----|-------|------|---------------|
| `workspace-state-v1` | `useWorkspaceStore` (Zustand) | JSON | `{ uploadedDatasets: UploadedDataset[] }` |
| `comparison_basket` | `useComparisonBasket` | JSON | `[{ id: string, token: string }]` |

### 7.2 sessionStorage

| Key | Used In | Context | What it stores |
|-----|---------|---------|---------------|
| `experiment-builder-state-v1` | `AppContext.startNewExperiment` | Cleared on new experiment | (not used elsewhere — likely legacy) |
| `select-tool-workflow-state-v1` | `AppContext.startNewExperiment` | Cleared on new experiment | (not used elsewhere — likely legacy) |

Both sessionStorage keys are **only cleared**, never read or written in the current codebase. They appear to be artifacts from a previous version.

---

## 8. AppContext RESPONSIBILITY BREAKDOWN

The AppContext currently conflates **6 distinct responsibilities**:

### Group 1: Dataset Upload & Management
- `dataset`, `successfulDatasets`, `uploadGeneExpression`, `retryUploadQueueItem`, `updateDatasetName`, `removeUploadedDataset`, `isDatasetReady`, `uploadSpatialCoordinates`, `uploadTissueImage`

### Group 2: Experiment Management
- `experiments`, `activeExperimentId`, `createExperiment`, `setActiveExperiment`, `removeExperiment`, `submitExperiments`, `refreshExperimentResult`

### Group 3: Workspace Navigation
- `workspaceMode`, `setWorkspaceMode`, `startNewExperiment`

### Group 4: Comparison
- `comparisonExperimentIds`, `toggleComparisonExperiment`, `clearComparisonExperiments`

### Group 5: Multi-Dataset Parameter Drafts
- `parameterDrafts`, `selectedDatasetIds`, `focusDatasetId`, `datasetAnnotationMap`, `updateParameterDraft`, `setSelectedDatasetIds`, `setFocusDatasetId`, `resetParameterDrafts`, `setDatasetAnnotation`, `clearDatasetAnnotation`

### Group 6: Upload Queue Processing (Internal)
- `isQueueProcessingRef`, `uploadQueueRef`, `processUploadQueue`

**These should be separated into at least 3-4 independent stores.**

---

## 9. REFACTORING CANDIDATES

### 9.1 State to Move to Zustand

| Current Location | State | Target Store | Rationale |
|-----------------|-------|-------------|-----------|
| AppContext | `dataset` (upload queue) | `useUploadStore` | Upload is a distinct concern, needs concurrent processing |
| AppContext | `experiments[]` | `useExperimentStore` | Experiments are the core domain entity |
| AppContext | `activeExperimentId` | `useExperimentStore` | Belongs with experiments |
| AppContext | `workspaceMode` | `useUIStore` | Pure UI state |
| AppContext | `parameterDrafts` | `useParameterStore` | Distinct from experiments, cross-cutting |
| AppContext | `selectedDatasetIds`, `focusDatasetId` | `useParameterStore` | Belongs with parameter drafts |
| AppContext | `datasetAnnotationMap` | `useAnnotationStore` | Distinct concern |
| AppContext | `comparisonExperimentIds` | `useComparisonStore` | Belongs with comparison feature |
| useJobTracking | `status, result, metrics, isLoading, isPolling, error` | Keep local (or React Query) | Component-specific, not shared |
| useMultiExperimentBestRuns | `bestRunState, metricsState` | Keep local | Comparison page specific |
| FocusPage | `experimentData, selectedRunId, rotation, mirrorX, mirrorY, etc.` | Keep local | Page-specific UI state |

### 9.2 State to Remain in React Query (once implemented)
- Experiment results (cacheable, keyed by runId + token)
- Experiment metrics (cacheable)
- Tool schemas (rarely changes)
- Job status (polling-based, React Query `refetchInterval` perfect for this)
- Spatial data for annotations
- Comparison datasets
- Consensus data

### 9.3 Components Suitable for Local State Only
- `SpatialPlot`: histologyMode, overlayOpacity — purely local UI state
- `CompareJobList`: expandedDatasets — local UI state
- `FileUploadCard`: all state derived from props
- `MetricsTable`: all state derived from props
- `FloatingCompareBar`: all state from `useComparisonBasket` hook (local + localStorage)
- Annotation hooks: brush state, history state — all local to AnnotationPage

### 9.4 Unnecessary Prop Drilling
No deep prop drilling (max 2 levels). However:
- `AnnotationPage` passes ~12 props to `AnnotationSpatialCanvas` — acceptable for a canvas component
- `MainWorkspace` passes full `experiment` object to `FocusView` — acceptable for a workspace router

### 9.5 Duplicated State

| State | Duplicated In | Issue |
|-------|---------------|-------|
| Job status + result | AppContext (`experiments[].status/result`) + FocusPage local state + useJobTracking | Multiple sources of truth for job results |
| Dataset list | AppContext (`dataset.datasetUploadQueue`) + Zustand (`uploadedDatasets`) | Partial overlap — queue items vs. successful datasets |
| Parameter drafts | AppContext + useParameterDrafts hook (debounce layer) | Acceptable pattern (hook as middleware) |

---

## 10. MIGRATION ROADMAP: React Context → Zustand

### Phase 1: Foundation (no breaking changes)

**Step 1.1: Extract Upload State** → `useUploadStore`
- Move `dataset.datasetUploadQueue`, `uploadGeneExpression`, `retryUploadQueueItem` logic
- Keep `processUploadQueue` internal to the store
- Keep `successfulDatasets` reading from existing Zustand store
- Replace `useApp()` calls in `DatasetUpload` with new store

**Step 1.2: Extract Experiment State** → `useExperimentStore`
- Move `experiments[]`, `activeExperimentId`, `createExperiment`, `setActiveExperiment`, `removeExperiment`, `submitExperiments`, `refreshExperimentResult`
- These do NOT need localStorage persistence (ephemeral session state)

**Step 1.3: Extract UI State** → `useUIStore`
- Move `workspaceMode`, `setWorkspaceMode`, `startNewExperiment`
- `startNewExperiment` will orchestrate multiple store resets

### Phase 2: Parameter Management

**Step 2.1: Create** → `useParameterStore`
- Move `parameterDrafts`, `selectedDatasetIds`, `focusDatasetId`, `datasetAnnotationMap`
- Move all associated actions
- `useParameterDrafts` hook becomes a thin layer over the Zustand store

**Step 2.2: Create** → `useComparisonStore`
- Move `comparisonExperimentIds`, `toggleComparisonExperiment`, `clearComparisonExperiments`
- This is small and could be merged into `useExperimentStore` if preferred

### Phase 3: Replace Custom Hook State with Zustand

**Step 3.1: Create** → `useAnnotationStore` (optional)
- `datasetAnnotationMap` could move here rather than parameter store
- Or remain in parameter store (it's coupled to dataset selection)

**Step 3.2: Remove AppContext**
- After all stores are created, AppContext becomes a thin wrapper
- Each component reads directly from Zustand stores
- `useApp()` hook is deprecated — migrate consumers one by one

### Phase 4: Adopt React Query

**Step 4.1: Replace polling with React Query**
- `useJobTracking` → `useQuery` with `refetchInterval: 5000`
- `useMultiJobResults` → `useQueries` (parallel)
- `useMultiExperimentBestRuns` → `useQuery` per experiment

**Step 4.2: Replace manual data fetching**
- `FocusPage` inline fetches → `useQuery`
- `ComparePage` consensus fetch → `useQuery`
- `ComparisonDatasetContext` → `useQuery` (remove context entirely)
- `useAnnotationData` → `useQuery`

**Step 4.3: Add mutations**
- `submitExperiments` → `useMutation`
- `createAnnotation` → `useMutation`
- Upload → `useMutation` with progress tracking

### Phase 5: Cleanup

**Step 5.1: Remove redundant code**
- Delete `JobStatus.tsx` (superseded by FocusPage) OR refactor FocusPage to use `useJobTracking`
- Remove unused sessionStorage keys
- Remove mock data paths once real API is stable

**Step 5.2: Remove AppContext provider from component tree**
- Unwrap from `App.tsx`
- Keep only `QueryClientProvider`, theme providers, router

**Step 5.3: Remove ComparisonDatasetContext**
- Replace with React Query's `useQuery` for comparison datasets

---

## 11. PROPOSED STORE STRUCTURE (Final State)

```typescript
// --- Core Domain Stores ---

// useUploadStore (Zustand)
interface UploadStore {
  uploadQueue: DatasetUploadQueueItem[];
  uploadSpatialCoordinates: File | null;
  uploadTissueImage: File | null;
  summary: { spotCount: number; geneCount: number } | null;
  
  // Actions
  enqueueFiles: (files: File[]) => void;
  retryUpload: (queueItemId: string) => void;
  removeUploadedDataset: (id: string) => void;
  updateDatasetName: (datasetId: string, name: string) => void;
  setSpatialCoordinates: (file: File) => void;
  setTissueImage: (file: File) => void;
}
// Persisted: NO (ephemeral queue state)

// useExperimentStore (Zustand)
interface ExperimentStore {
  experiments: Experiment[];
  activeExperimentId: string | null;
  
  // Actions
  createExperiment: (toolId, params, label, runs, datasetIds, requirements) => void;
  setActiveExperiment: (id: string | null) => void;
  removeExperiment: (id: string) => void;
  updateExperimentStatus: (id: string, status, updates?) => void;
}
// Persisted: Maybe? Could survive page refreshes.

// useUIStore (Zustand)
interface UIStore {
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  startNewExperiment: () => void; // orchestrates resets
}
// Persisted: NO

// useParameterStore (Zustand)
interface ParameterStore {
  parameterDrafts: Record<string, Record<string, any>>;
  selectedDatasetIds: string[];
  focusDatasetId: string | null;
  datasetAnnotationMap: Record<string, string>;
  
  // Actions
  updateParameterDraft: (datasetIds, key, value) => void;
  setSelectedDatasetIds: (ids) => void;
  setFocusDatasetId: (id) => void;
  resetParameterDrafts: () => void;
  setDatasetAnnotation: (datasetId, annotationId) => void;
  clearDatasetAnnotation: (datasetId) => void;
}
// Persisted: Possibly (drafts could survive refresh)

// useComparisonStore (Zustand) — or merge into useExperimentStore
interface ComparisonStore {
  comparisonExperimentIds: string[];
  toggleComparisonExperiment: (id: string) => void;
  clearComparisonExperiments: () => void;
}
// Persisted: NO

// --- Existing Store (keep) ---

// useWorkspaceStore (Zustand + persist)
// Keep as-is. Already clean and separated.
interface WorkspaceStore {
  uploadedDatasets: UploadedDataset[];
  // actions...
}
// Persisted: YES (localStorage)

// --- React Query (server state) ---

// Experiment results, job status, metrics — all go to React Query
// FocusPage, ComparePage, JobStatus become Query consumers
```

---

## 12. RISKS & MITIGATIONS

| Risk | Mitigation |
|------|-----------|
| **Breaking AppContext-dependent components** | Phase approach, keep AppProvider as compatibility layer |
| **`submitExperiments` orchestration touches 5 state groups** | Implement as a thunk/action that coordinates across stores |
| **`startNewExperiment` resets multiple stores** | Can be a single action in UIStore that calls reset methods on other stores |
| **Upload queue processing uses refs + effects** | Extract into store-internal async processing (Zustand `set` + custom middleware) |
| **Comparison basket uses localStorage directly** | Keep `useComparisonBasket` hook as-is (clean pattern), or migrate to Zustand + persist |
| **FocusPage has 15+ local state items** | Refactor to use React Query first, then split UI state into page-level hook |

---

## 13. RECOMMENDED MIGRATION ORDER

```
Week 1:   useUploadStore (Phase 1.1) + useExperimentStore (Phase 1.2)  
          → Components: DatasetUpload, LeftPanel, MainWorkspace

Week 2:   useUIStore (Phase 1.3) + useParameterStore (Phase 2.1)  
          → Components: MainWorkspace, ExperimentBuilder, LeftPanel
          → Hook: useParameterDrafts

Week 3:   useComparisonStore (Phase 2.2) + Deprecate AppContext  
          → Migrate all remaining useApp() consumers
          → Remove AppProvider from component tree

Week 4:   React Query adoption (Phase 4)  
          → Replace useJobTracking, useMultiJobResults, useMultiExperimentBestRuns
          → Remove ComparisonDatasetContext
          → Refactor FocusPage to use React Query + useJobTracking

Week 5:   Cleanup (Phase 5)  
          → Remove JobStatus.tsx, unused sessionStorage keys, mock data paths
          → Finalize store interfaces
          → Write migration tests
```

---

*End of Report*