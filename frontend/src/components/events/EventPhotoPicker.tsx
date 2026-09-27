"use client";

import { ImagePlus, Star, X } from "lucide-react";

import { MAX_EVENT_IMAGES } from "@/lib/event-images";
import { cn } from "@/lib/utils";
import type { EventImage } from "@/types/event";

interface EventPhotoPickerProps {
  images: EventImage[];
  canEdit: boolean;
  onAdd: (files: FileList) => void;
  onSetPrimary?: (index: number) => void;
  onRemove?: (index: number) => void;
}

/** Host photo strip for User Led posts. Official calendar events never use this. */
export function EventPhotoPicker({ images, canEdit, onAdd, onSetPrimary, onRemove }: EventPhotoPickerProps) {
  return (
    <div>
      <div className="mb-[7px] flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-bold text-ink-soft">Photos</p>
        <p className="text-[12px] font-medium text-muted">
          {images.length}/{MAX_EVENT_IMAGES} · first photo is the map pin
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {images.map((image, index) => (
          <div key={`${image.id ?? image.url}-${index}`} className="relative h-[72px] w-[72px]">
            <button
              type="button"
              onClick={() => canEdit && onSetPrimary?.(index)}
              aria-label={image.isPrimary ? "Primary event photo" : "Make this the map pin photo"}
              className={cn(
                "h-full w-full overflow-hidden rounded-[12px] border bg-field",
                image.isPrimary ? "border-brand ring-2 ring-brand/25" : "border-line",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="h-full w-full object-cover" />
            </button>
            {image.isPrimary && (
              <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brand text-white">
                <Star size={11} strokeWidth={2.4} className="fill-white" />
              </span>
            )}
            {canEdit && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label="Remove photo"
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-white"
              >
                <X size={11} strokeWidth={2.8} />
              </button>
            )}
          </div>
        ))}
        {canEdit && images.length < MAX_EVENT_IMAGES && (
          <label className="grid h-[72px] w-[72px] cursor-pointer place-items-center rounded-[12px] border border-dashed border-line bg-field text-muted transition-colors hover:border-brand/40 hover:text-brand">
            <ImagePlus size={20} strokeWidth={2.2} aria-hidden />
            <span className="sr-only">Add photos to this event</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(event) => {
                if (event.target.files?.length) onAdd(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
