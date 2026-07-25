import * as tus from 'tus-js-client';

export interface TusUploadOptions {
  file: File;
  metadata: Record<string, string>;
  onProgress?: (pct: number) => void;
}

export interface TusUploadHandle {
  promise: Promise<string>;
  abort: () => void;
}

export function tusUpload({ file, metadata, onProgress }: TusUploadOptions): TusUploadHandle {
  let upload: tus.Upload | null = null;

  const promise = new Promise<string>((resolve, reject) => {
    upload = new tus.Upload(file, {
      endpoint: '/uploads/',
      metadata,
      chunkSize: 5 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      onProgress: (bytesSent, bytesTotal) => {
        onProgress?.(Math.round((bytesSent / bytesTotal) * 100));
      },
      onSuccess: () => {
        if (!upload?.url) {
          reject(new Error('Upload finished but no URL returned'));
          return;
        }
        const parts = new URL(upload.url).pathname.split('/').filter(Boolean);
        const id = parts[parts.length - 1];
        resolve(id);
      },
      onError: (error) => {
        reject(new Error(error.message || 'Upload failed'));
      },
    });
    upload.start();
  });

  return {
    promise,
    abort: () => {
      if (upload) upload.abort(true);
    },
  };
}