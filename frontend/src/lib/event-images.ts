import type { CampusEvent, EventImage } from "@/types/event";

export const MAX_EVENT_IMAGES = 4;
const MAX_EDGE = 1200;
const JPEG_QUALITY = 0.74;

export function isUserLedEventSource(event: Pick<CampusEvent, "source">): boolean {
  return event.source === "user";
}

export function userLedPrimaryImage(event: Pick<CampusEvent, "source" | "primaryImageUrl" | "images">): string | undefined {
  if (!isUserLedEventSource(event)) return undefined;
  if (event.primaryImageUrl) return event.primaryImageUrl;
  return event.images?.find((image) => image.isPrimary)?.url ?? event.images?.[0]?.url;
}

export function markPrimary(images: EventImage[], primaryIndex = 0): EventImage[] {
  return images.map((image, index) => ({ ...image, isPrimary: index === primaryIndex }));
}

export async function filesToEventImages(files: FileList | File[]): Promise<EventImage[]> {
  const list = [...files].filter((file) => file.type.startsWith("image/"));
  const next: EventImage[] = [];
  for (const file of list) {
    next.push({ url: await compressImage(file), isPrimary: false });
  }
  return next;
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that photo."));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Could not prepare that photo."));
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      image.onerror = () => reject(new Error("That file is not a usable photo."));
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
