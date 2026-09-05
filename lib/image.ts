const MAX_DIM = 1024;
const QUALITY = 0.85;

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read that photo.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Downscales a captured photo to at most 1024px on its long edge before it is
 * sent for analysis, uploaded, or parked in sessionStorage. Phone cameras
 * produce 4–12MB originals, which the AI does not need and which blow the
 * sessionStorage quota.
 */
export async function prepareImage(file: File): Promise<{ dataUrl: string; blob: Blob }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    );
    if (!blob) throw new Error('encode failed');

    return { dataUrl: canvas.toDataURL('image/jpeg', QUALITY), blob };
  } catch {
    // Fall back to the original file (e.g. HEIC that the canvas cannot decode).
    return { dataUrl: await readAsDataUrl(file), blob: file };
  }
}

/** Turns a `data:` URL back into a Blob for upload or re-analysis. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(header)?.[1] ?? 'image/jpeg';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
