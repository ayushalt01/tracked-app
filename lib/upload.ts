import 'server-only';

const MAX_BYTES = 6 * 1024 * 1024;

type ImageUpload = { base64: string; mimeType: string };
type UploadError = { error: string; status: number };

/** Validates a multipart image field and returns it base64-encoded for Gemini. */
export async function readImageUpload(
  value: FormDataEntryValue | null,
): Promise<ImageUpload | UploadError> {
  if (!(value instanceof File)) return { error: 'No image uploaded.', status: 400 };
  if (value.size > MAX_BYTES) return { error: 'That photo is too large.', status: 413 };

  const mimeType = value.type || 'image/jpeg';
  if (!mimeType.startsWith('image/')) return { error: 'That file is not an image.', status: 400 };

  try {
    return { base64: Buffer.from(await value.arrayBuffer()).toString('base64'), mimeType };
  } catch {
    return { error: 'Could not read the uploaded photo.', status: 400 };
  }
}
