import { useWebGLStore } from '@/lib/webglSupport';

export type { WebGLSupportResult } from '@/lib/webglSupport';

export function useHardwareAcceleration() {
  return useWebGLStore();
}
