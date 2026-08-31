/**
 * Utility for exporting and sharing DOM elements as high-resolution images
 * Compatible with Mobile (iOS Safari, Android Chrome), Desktop, Tailwind v4,
 * and Iframe Sandbox environments.
 */
import { toPng, toBlob } from 'html-to-image';

export interface ExportResult {
  success: boolean;
  dataUrl?: string;
  blobUrl?: string;
  blob?: Blob;
  error?: string;
  shared?: boolean;
}

export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write failed:', err);
  }
  return false;
}

export async function shareFileOrBlob(
  blob: Blob,
  fileName: string = 'card.png',
  title: string = 'NutriAI Card',
  text: string = 'Confira minha análise no NutriAI!'
): Promise<{ success: boolean; method: 'share' | 'clipboard' | 'download' }> {
  const file = new File([blob], fileName, { type: 'image/png' });

  // 1. Try Native Web Share with file (Mobile iOS/Android)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text,
          files: [file],
        });
        return { success: true, method: 'share' };
      } else {
        // Share text and url
        await navigator.share({
          title,
          text: `${text}\n${window.location.href}`,
        });
        return { success: true, method: 'share' };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled share dialog - still considered handled
        return { success: true, method: 'share' };
      }
      console.warn('Navigator share fallback:', err);
    }
  }

  // 2. Try copying image to clipboard
  const copied = await copyBlobToClipboard(blob);
  if (copied) {
    return { success: true, method: 'clipboard' };
  }

  // 3. Fallback: direct download
  const blobUrl = URL.createObjectURL(blob);
  downloadBlobUrl(blobUrl, fileName);
  return { success: true, method: 'download' };
}

export async function exportElementAsImage(
  element: HTMLElement,
  fileName: string = 'card.png',
  title: string = 'NutriAI Card',
  autoShare: boolean = false
): Promise<ExportResult> {
  try {
    const pixelRatio = Math.min(3, Math.max(2, window.devicePixelRatio || 2));

    const options = {
      quality: 0.96,
      pixelRatio,
      skipFonts: true,
      fontEmbedCSS: '',
      cacheBust: true,
      filter: (domNode: HTMLElement) => {
        if (domNode.classList && domNode.classList.contains('no-export')) {
          return false;
        }
        return true;
      }
    };

    let dataUrl: string | undefined;
    let blob: Blob | null = null;

    try {
      dataUrl = await toPng(element, options);
      blob = await toBlob(element, options);
    } catch (firstErr: any) {
      console.warn('html-to-image capture fallback:', firstErr);
      dataUrl = await toPng(element, { ...options, skipFonts: true, fontEmbedCSS: '' });
      blob = await toBlob(element, { ...options, skipFonts: true, fontEmbedCSS: '' });
    }

    if (!dataUrl || !blob) {
      throw new Error('Falha ao gerar o arquivo de imagem.');
    }

    const blobUrl = URL.createObjectURL(blob);
    let shared = false;

    if (autoShare) {
      const shareResult = await shareFileOrBlob(blob, fileName, title);
      shared = shareResult.method === 'share';
    }

    return {
      success: true,
      dataUrl,
      blobUrl,
      blob,
      shared
    };
  } catch (error: any) {
    console.error('Export Element Error:', error);
    return {
      success: false,
      error: error?.message || 'Erro ao gerar imagem'
    };
  }
}

export function downloadBlobUrl(blobUrl: string, fileName: string = 'card.png') {
  try {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 250);
  } catch (err) {
    console.warn('downloadBlobUrl error:', err);
    window.open(blobUrl, '_blank');
  }
}
