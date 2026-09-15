const _self = self as any;

_self.onmessage = async (e: MessageEvent) => {
  const { id, imageBitmap, maxResolution } = e.data;
  
  try {
    if (!imageBitmap || !maxResolution) {
      throw new Error('Missing parameters');
    }

    const width = imageBitmap.width;
    const height = imageBitmap.height;

    if (width <= maxResolution && height <= maxResolution) {
      // No need to compress, return original
      _self.postMessage({ id, imageBitmap }, [imageBitmap]);
      return;
    }

    let newWidth = width;
    let newHeight = height;

    if (width > height) {
      newWidth = maxResolution;
      newHeight = Math.round(height * (maxResolution / width));
    } else {
      newHeight = maxResolution;
      newWidth = Math.round(width * (maxResolution / height));
    }

    // Attempt to use OffscreenCanvas for resizing in the worker thread
    if (typeof OffscreenCanvas !== 'undefined') {
      const offscreen = new OffscreenCanvas(newWidth, newHeight);
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);
        const compressedBitmap = await createImageBitmap(offscreen);
        
        _self.postMessage({ id, imageBitmap: compressedBitmap }, [compressedBitmap]);
        
        // Close the original to free memory
        imageBitmap.close();
        return;
      }
    }
    
    // Fallback if OffscreenCanvas fails or is missing (e.g. Safari older versions)
    _self.postMessage({ id, imageBitmap }, [imageBitmap]);
  } catch (err) {
    _self.postMessage(
      { id, error: err instanceof Error ? err.message : String(err), imageBitmap }, 
      imageBitmap ? [imageBitmap] : undefined
    );
  }
};
