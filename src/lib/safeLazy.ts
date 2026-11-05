import { lazy, ComponentType, LazyExoticComponent } from 'react';

export function safeLazy<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T } | { [key: string]: T }>,
  exportName?: string
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await importFn();
      if (exportName && 'default' in module === false && exportName in module) {
        return { default: (module as any)[exportName] };
      }
      return module as { default: T };
    } catch (error) {
      console.warn('Failed to load dynamic chunk, reloading application...', error);
      const reloadFlagKey = 'app_chunk_reload_attempted';
      if (!sessionStorage.getItem(reloadFlagKey)) {
        sessionStorage.setItem(reloadFlagKey, 'true');
        window.location.reload();
      }
      return {
        default: (() => null) as unknown as T
      };
    }
  });
}
