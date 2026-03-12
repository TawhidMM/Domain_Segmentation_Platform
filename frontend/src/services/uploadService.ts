// frontend/src/services/uploadService.ts
import axios from '@/lib/axios';

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB

// Validate that the file is a Space Ranger output zip
const validateSpaceRangerZip = (file: File) => {
  const isZip = file.name.toLowerCase().endsWith('.zip');
  if (!isZip) {
    throw new Error('Gene expression upload must be a .zip (Space Ranger output).');
  }
};

export async function uploadGeneExpressionFile(
  file: File,
  onProgress: (pct: number) => void
): Promise<string> {
  // Validate file format
  validateSpaceRangerZip(file);

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // 1) create upload session
  const formData = new FormData();
  formData.append('filename', file.name);
  formData.append('total_chunks', totalChunks.toString());
  
  const initRes = await axios.post('/datasets/init-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const upload_id = initRes.data.upload_id;

  // 2) upload chunks
  for (let i = 0; i < totalChunks; i++) {
    const chunk = file.slice(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, file.size));
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('upload_id', upload_id);
    formData.append('chunk_index', i.toString());

    await axios.post('/datasets/upload-chunk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    onProgress(Math.round(((i + 1) / totalChunks) * 100));
  }

  // 3) finalize upload
  const finalizeFormData = new FormData();
  finalizeFormData.append('upload_id', upload_id);
  
  const finalizeRes = await axios.post('/datasets/finalize-upload', finalizeFormData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return finalizeRes.data.dataset_id;
}