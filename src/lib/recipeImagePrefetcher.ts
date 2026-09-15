/**
 * NutriAI - Recipe Image Proactive Prefetcher
 * Camada de pré-carregamento de imagens de pratos e receitas para exibição instantânea no modo offline.
 */

import { QUICK_DISH_PHOTOS, DEFAULT_FALLBACK_IMAGE } from './quickDishesData';

const RECIPE_IMAGE_CACHE_NAME = 'recipe-food-images-cache';

// Cache em memória para evitar chamadas de pré-carregamento duplicadas na mesma sessão
const prefetchedUrlsSet = new Set<string>();

/**
 * Sanitiza e filtra URLs válidas
 */
function sanitizeImageUrls(urls: (string | null | undefined)[]): string[] {
  const result: string[] = [];
  for (const u of urls) {
    if (typeof u === 'string') {
      const trimmed = u.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        if (!prefetchedUrlsSet.has(trimmed)) {
          result.push(trimmed);
          prefetchedUrlsSet.add(trimmed);
        }
      }
    }
  }
  return result;
}

/**
 * Pré-carrega um conjunto de URLs de imagens no Service Worker e no Cache Storage
 */
export async function prefetchRecipeImages(urls: (string | null | undefined)[]): Promise<{
  success: boolean;
  totalRequested: number;
  newlyPrefetched: number;
}> {
  const cleanUrls = sanitizeImageUrls(urls);
  if (cleanUrls.length === 0) {
    return { success: true, totalRequested: 0, newlyPrefetched: 0 };
  }

  // 1. Delegar para o Service Worker se ativo
  let swHandled = false;
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PREFETCH_RECIPE_IMAGES',
        payload: { urls: cleanUrls }
      });
      swHandled = true;
    }
  } catch (err) {
    console.warn('[RecipeImagePrefetcher] Aviso ao despachar para o Service Worker:', err);
  }

  // 2. Cache redundante direto via Window Cache Storage (garante que funciona mesmo em dev ou antes do SW assumir)
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cache = await window.caches.open(RECIPE_IMAGE_CACHE_NAME);
      
      // Executa prefetch concorrente em lote no navegador
      const batchSize = 6;
      for (let i = 0; i < cleanUrls.length; i += batchSize) {
        const batch = cleanUrls.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (url) => {
            try {
              const matched = await cache.match(url);
              if (matched) return;

              let response: Response | undefined;
              try {
                response = await fetch(url, {
                  mode: 'cors',
                  credentials: 'omit',
                  headers: {
                    Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                  }
                });
              } catch {
                try {
                  response = await fetch(url, { mode: 'no-cors' });
                } catch {
                  // Ignore individual image download error
                }
              }

              if (response && (response.status === 200 || response.type === 'opaque')) {
                await cache.put(url, response.clone());
              }
            } catch {
              // Ignore single image caching error
            }
          })
        );
      }
    }
  } catch (err) {
    console.warn('[RecipeImagePrefetcher] Fallback de cache direto falhou:', err);
  }

  return {
    success: true,
    totalRequested: urls.length,
    newlyPrefetched: cleanUrls.length
  };
}

/**
 * Pré-carrega imagens a partir de uma lista de pratos (QuickDishes ou receitas)
 */
export async function prefetchDishes(
  dishes: Array<{
    image?: string;
    imageUrl?: string;
    fallbackImage?: string;
  }>
): Promise<void> {
  if (!Array.isArray(dishes) || dishes.length === 0) return;

  const urlsToPrefetch: string[] = [];
  for (const d of dishes) {
    if (d.image) urlsToPrefetch.push(d.image);
    if (d.imageUrl) urlsToPrefetch.push(d.imageUrl);
    if (d.fallbackImage) urlsToPrefetch.push(d.fallbackImage);
  }

  if (urlsToPrefetch.length > 0) {
    await prefetchRecipeImages(urlsToPrefetch);
  }
}

/**
 * Pré-aquece proativamente todas as fotos curadas do catálogo de pratos saudáveis
 */
export async function prefetchCuratedRecipeCatalog(): Promise<void> {
  try {
    const urls: string[] = [DEFAULT_FALLBACK_IMAGE];

    Object.values(QUICK_DISH_PHOTOS).forEach((photoList) => {
      if (Array.isArray(photoList)) {
        photoList.forEach((p) => {
          if (p) urls.push(p);
        });
      }
    });

    await prefetchRecipeImages(urls);
  } catch (err) {
    console.warn('[RecipeImagePrefetcher] Erro ao pré-aquecer catálogo:', err);
  }
}

// Inicializa escuta de eventos do Service Worker para telemetria
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'RECIPE_IMAGES_PREFETCHED') {
      // Dispara evento customizado para qualquer componente que queira reagir
      window.dispatchEvent(
        new CustomEvent('app:recipe-images-prefetched', {
          detail: event.data.payload
        })
      );
    }
  });
}
