export const bootManager = {
  dismissHtmlLoader: () => {
    if (typeof window !== 'undefined') {
      const loader = document.getElementById('initial-loading');
      if (loader) {
        loader.style.opacity = '0';
        loader.style.transition = 'opacity 0.4s ease';
        setTimeout(() => loader.remove(), 400);
      }
      (window as any).__NUTRI_DISMISS_HTML_LOADER = () => {
        const l = document.getElementById('initial-loading');
        if (l) l.remove();
      };
    }
  },
  setStage: (stage: string, message?: string) => {
    console.log(`[BootManager] Stage: ${stage}${message ? ' - ' + message : ''}`);
  }
};

export function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue?: T, label?: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (fallbackValue !== undefined) {
        resolve(fallbackValue);
      } else {
        reject(new Error(`Operation timed out after ${ms}ms`));
      }
    }, ms);

    promise.then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
