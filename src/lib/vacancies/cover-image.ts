import { MAX_VACANCY_IMAGE_BYTES, VACANCY_IMAGE_TYPES } from "@/lib/vacancies/image";

/** Phones produce 3–12 MB photos; the browser shrinks them before upload. */
export const MAX_COVER_SOURCE_BYTES = 15 * 1024 * 1024;

/** The API stores at most 1600 × 900 and refuses less than 640 × 360. */
const TARGET_WIDTH = 1600;
const TARGET_HEIGHT = 900;
const MIN_WIDTH = 640;
const MIN_HEIGHT = 360;
const KEEP_AS_IS_BYTES = 900 * 1024;
const QUALITY = 0.86;

export type CoverScale = { width: number; height: number };

/**
 * Size to upload: no larger than the stored size, never below the API's
 * minimum, never enlarged. `null` means the photo is too small to use.
 */
export function coverUploadSize(width: number, height: number): CoverScale | null {
  if (width < MIN_WIDTH || height < MIN_HEIGHT) return null;
  const floor = Math.max(MIN_WIDTH / width, MIN_HEIGHT / height);
  const target = Math.min(1, TARGET_WIDTH / width, TARGET_HEIGHT / height);
  const scale = Math.max(floor, target);
  return {
    width: Math.max(MIN_WIDTH, Math.round(width * scale)),
    height: Math.max(MIN_HEIGHT, Math.round(height * scale)),
  };
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

export type PreparedCover = { file: File } | { error: string };

/**
 * Checks a chosen photo and re-encodes it at upload size, so a 6 MB phone
 * photo travels as a few hundred kilobytes.
 */
export async function prepareCoverImage(file: File): Promise<PreparedCover> {
  if (!VACANCY_IMAGE_TYPES.includes(file.type)) {
    return { error: "opportunityImageFormatUnsupported" };
  }
  if (file.size === 0) return { error: "opportunityImageInvalid" };
  if (file.size > MAX_COVER_SOURCE_BYTES) return { error: "coverImageTooLarge" };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { error: "opportunityImageInvalid" };
  }

  try {
    const size = coverUploadSize(bitmap.width, bitmap.height);
    if (!size) return { error: "opportunityImageTooSmall" };

    const unchanged = size.width === bitmap.width && size.height === bitmap.height;
    if (unchanged && file.type !== "image/png" && file.size <= KEEP_AS_IS_BYTES) {
      return { file };
    }

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context)
      return file.size <= MAX_VACANCY_IMAGE_BYTES
        ? { file }
        : { error: "coverImageTooLarge" };
    context.drawImage(bitmap, 0, 0, size.width, size.height);

    let blob = await encode(canvas, "image/webp");
    if (!blob || blob.type !== "image/webp") blob = await encode(canvas, "image/jpeg");
    if (!blob || blob.size > MAX_VACANCY_IMAGE_BYTES) {
      return file.size <= MAX_VACANCY_IMAGE_BYTES
        ? { file }
        : { error: "coverImageTooLarge" };
    }

    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "cover";
    return { file: new File([blob], `${base}.${extension}`, { type: blob.type }) };
  } finally {
    bitmap.close();
  }
}
