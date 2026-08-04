/** WebGL support detection.
 *
 * 2-state model:
 *  - `supported`   : WebGL is available.
 *  - `unsupported` : WebGL is not available (blocked, old browser, etc.)
 *
 * If supported but performance is poor, the user can check get.webgl.org and
 * enable hardware acceleration in their browser settings.
 */

export interface WebGLSupportResult {
  supported: boolean;
}

export function checkWebGLSupport(): WebGLSupportResult {
  if (typeof window === 'undefined') {
    return { supported: false };
  }

  const canvas = document.createElement('canvas');
  try {
    return {
      supported: !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl')),
    };
  } catch {
    return { supported: false };
  }
}

/* ------------------------------------------------------------------ */
/* Tiny external-store so multiple guards share one detection result.  */
/* ------------------------------------------------------------------ */

type Listener = () => void;

let dismissedRef = false;
const listeners = new Set<Listener>();

let cachedResult: WebGLSupportResult | null = null;
let cachedSnapshot: WebGLSupportResult & { dismissed: boolean } | null = null;

function buildSnapshot() {
  if (!cachedResult) {
    cachedResult = checkWebGLSupport();
  }
  return {
    ...cachedResult,
    dismissed: dismissedRef,
  };
}

function notify() {
  listeners.forEach((fn) => fn());
}

const store = {
  getSnapshot() {
    if (!cachedSnapshot || cachedSnapshot.dismissed !== dismissedRef) {
      cachedSnapshot = buildSnapshot();
    }
    return cachedSnapshot;
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  dismiss() {
    if (!dismissedRef) {
      dismissedRef = true;
      cachedSnapshot = null;
      notify();
    }
  },

  get dismissed() {
    return dismissedRef;
  },
};

export function useWebGLStore(): WebGLSupportResult & { dismissed: boolean; dismiss: () => void } {
  const snapshot = store.getSnapshot();
  return {
    ...snapshot,
    dismiss: () => store.dismiss(),
  };
}
