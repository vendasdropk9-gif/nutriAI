/**
 * Utility for exporting and saving DOM elements as high-resolution images
 * Compatible with Mobile (iOS/Android), Desktop, and Iframe Sandbox environments.
 */

export interface ExportResult {
  success: boolean;
  dataUrl?: string;
  blobUrl?: string;
  blob?: Blob;
  error?: string;
  shared?: boolean;
}

export async function exportElementAsImage(
  element: HTMLElement,
  fileName: string = 'card.png',
  title: string = 'NutriAI Card'
): Promise<ExportResult> {
  try {
    const html2canvas = (await import('html2canvas')).default;
    
    // Generate high quality canvas
    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      scale: Math.max(2, window.devicePixelRatio || 2),
      logging: false,
      onclone: (clonedDoc) => {
        // Ensure fonts and visible colors are properly rendered in clone
        const clonedEl = clonedDoc.getElementById(element.id);
        if (clonedEl) {
          clonedEl.style.transform = 'none';
        }
      }
    });

    const dataUrl = canvas.toDataURL('image/png', 1.0);

    // Convert to Blob for standard downloading and Web Share API
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png', 1.0);
    });

    if (!blob) {
      throw new Error('Falha ao gerar o arquivo de imagem.');
    }

    const blobUrl = URL.createObjectURL(blob);

    let shared = false;

    // 1. Try Mobile Native Web Share API with File (iOS Safari & Android Chrome support)
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title,
            text: title,
            files: [file],
          });
          shared = true;
        }
      } catch (shareErr: any) {
        // AbortError is triggered if user dismisses share sheet, which is fine
        if (shareErr.name !== 'AbortError') {
          console.info('Web Share not completed, falling back to download:', shareErr);
        }
      }
    }

    // 2. Try Standard Direct Download Anchor
    if (!shared) {
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
        }, 100);
      } catch (dlErr) {
        console.warn('Direct download link trigger failed:', dlErr);
      }
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
    }, 100);
  } catch (err) {
    window.open(blobUrl, '_blank');
  }
}
