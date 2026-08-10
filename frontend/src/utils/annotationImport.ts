import { AnnotationLabel, AnnotationSpatialSpot } from '@/types/annotationPlayground';
import { getLabelColorFromPalette } from '@/utils/annotationColors';

export interface AnnotationImportResult {
  annotationBuffer: Uint8Array;
  labels: AnnotationLabel[];
  changes: Map<number, number>;
  stats: {
    matched: number;
    skippedUnknownBarcode: number;
    unlabeled: number;
  };
}

export interface AnnotationJsonImportRow {
  barcode: string;
  label_id: number | null;
  label_name: string | null;
}

function looksLikeHeader(row: string[]): boolean {
  if (row.length < 2) return false;
  const first = row[0]?.trim().toLowerCase() ?? '';
  const second = row[1]?.trim().toLowerCase() ?? '';
  if (first === 'barcode') return true;
  if (/^(annotation|label|category|class)$/.test(second)) return true;
  return false;
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const char = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ',') {
      current.push(cell);
      cell = '';
      i += 1;
      continue;
    }

    if (char === '\n') {
      current.push(cell);
      cell = '';
      rows.push(current);
      current = [];
      i += 1;
      continue;
    }

    if (char === '\r') {
      i += 1;
      continue;
    }

    cell += char;
    i += 1;
  }

  if (cell || current.length > 0) {
    current.push(cell);
    rows.push(current);
  }

  return rows;
}

export function parseAnnotationCsv(
  content: string,
  spots: AnnotationSpatialSpot[],
): AnnotationImportResult {
  const rawRows = parseCsv(content);
  const dataRows = rawRows.filter((row) => row.some((cell) => cell.trim() !== ''));

  let startIndex = 0;
  if (dataRows.length > 0 && looksLikeHeader(dataRows[0])) {
    startIndex = 1;
  }

  const indexByBarcode = new Map<string, number>();
  for (let i = 0; i < spots.length; i += 1) {
    indexByBarcode.set(spots[i].barcode, i);
  }

  const nextBuffer = new Uint8Array(spots.length);
  const nameToId = new Map<string, number>();
  const labels: AnnotationLabel[] = [];
  let nextLabelId = 1;

  const changes = new Map<number, number>();
  let matched = 0;
  let skippedUnknownBarcode = 0;
  let unlabeled = 0;

  for (let r = startIndex; r < dataRows.length; r += 1) {
    const row = dataRows[r];
    if (row.length < 2) continue;

    const barcode = row[0].trim();
    const annotationCell = row[1].trim();
    const spotIndex = indexByBarcode.get(barcode);
    if (spotIndex === undefined) {
      skippedUnknownBarcode += 1;
      continue;
    }

    const oldValue = nextBuffer[spotIndex] ?? 0;
    let labelId = 0;

    const normalizedAnnotation = annotationCell.toLowerCase();
    if (annotationCell !== '' && !['unlabeled', 'null', 'none', 'na', 'n/a'].includes(normalizedAnnotation)) {
      let id = nameToId.get(annotationCell);
      if (id === undefined) {
        id = nextLabelId;
        nextLabelId += 1;
        nameToId.set(annotationCell, id);
        labels.push({
          id,
          name: annotationCell,
          color: getLabelColorFromPalette(id),
        });
      }
      labelId = id;
    }

    if (labelId === 0) {
      unlabeled += 1;
    }

    nextBuffer[spotIndex] = labelId;
    changes.set(spotIndex, oldValue);
    matched += 1;
  }

  return {
    annotationBuffer: nextBuffer,
    labels,
    changes,
    stats: {
      matched,
      skippedUnknownBarcode,
      unlabeled,
    },
  };
}

export function parseAnnotationJson(
  rows: AnnotationJsonImportRow[],
  spots: AnnotationSpatialSpot[],
): AnnotationImportResult {
  const indexByBarcode = new Map<string, number>();
  for (let i = 0; i < spots.length; i += 1) {
    indexByBarcode.set(spots[i].barcode, i);
  }

  const nextBuffer = new Uint8Array(spots.length);
  const labelsMap = new Map<number, AnnotationLabel>();
  const changes = new Map<number, number>();
  let matched = 0;
  let skippedUnknownBarcode = 0;
  let unlabeled = 0;

  for (const row of rows) {
    const spotIndex = indexByBarcode.get(row.barcode);
    if (spotIndex === undefined) {
      skippedUnknownBarcode += 1;
      continue;
    }

    const oldValue = nextBuffer[spotIndex] ?? 0;
    const labelId = row.label_id ?? 0;

    if (labelId === 0) {
      unlabeled += 1;
    } else if (!labelsMap.has(labelId)) {
      labelsMap.set(labelId, {
        id: labelId,
        name: row.label_name ?? `Label ${labelId}`,
        color: getLabelColorFromPalette(labelId),
      });
    }

    nextBuffer[spotIndex] = labelId;
    changes.set(spotIndex, oldValue);
    matched += 1;
  }

  const labels = Array.from(labelsMap.values()).sort((a, b) => a.id - b.id);

  return {
    annotationBuffer: nextBuffer,
    labels,
    changes,
    stats: {
      matched,
      skippedUnknownBarcode,
      unlabeled,
    },
  };
}