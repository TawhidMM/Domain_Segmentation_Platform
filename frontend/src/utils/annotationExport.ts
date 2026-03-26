import { AnnotationLabel, AnnotationSpatialSpot } from '@/types/annotationPlayground';

export interface AnnotationCsvRow {
  barcode: string;
  label_id: number | null;
  label_name: string;
  x: number;
  y: number;
}

function escapeCsvCell(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export function buildAnnotationCsvRows(
  spots: AnnotationSpatialSpot[],
  annotationBuffer: Uint8Array,
  labels: AnnotationLabel[],
): AnnotationCsvRow[] {
  const labelNameById = new Map<number, string>();
  for (const label of labels) {
    labelNameById.set(label.id, label.name);
  }

  return spots.map((spot, index) => {
    const rawLabelId = annotationBuffer[index] ?? 0;
    const labelId = rawLabelId === 0 ? null : rawLabelId;
    const labelName = rawLabelId === 0 ? 'Unlabeled' : (labelNameById.get(rawLabelId) ?? `Label ${rawLabelId}`);

    return {
      barcode: spot.barcode,
      label_id: labelId,
      label_name: labelName,
      x: spot.x,
      y: spot.y,
    };
  });
}

export function buildAnnotationCsvContent(rows: AnnotationCsvRow[]) {
  const header = 'barcode,label_id,label_name,x,y';
  const body = rows.map((row) => {
    const labelIdCell = row.label_id === null ? 'null' : String(row.label_id);
    return [
      escapeCsvCell(row.barcode),
      labelIdCell,
      escapeCsvCell(row.label_name),
      String(row.x),
      String(row.y),
    ].join(',');
  });

  return [header, ...body].join('\n');
}

export function downloadCsvFile(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(objectUrl);
}