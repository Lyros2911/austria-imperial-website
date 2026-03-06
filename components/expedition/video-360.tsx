'use client';

import { Camera } from 'lucide-react';

interface Video360EmbedProps {
  /** Insta360 or YouTube 360° embed URL */
  src?: string;
  /** Accessible title for the iframe */
  title?: string;
  /** CSS aspect ratio (default: 16/9) */
  aspectRatio?: string;
}

export function Video360Embed({ src, title = '360° Video', aspectRatio = '16/9' }: Video360EmbedProps) {
  if (!src) {
    return (
      <div
        className="border border-dashed border-border-gold rounded bg-surface/30 flex flex-col items-center justify-center gap-3 py-16"
        style={{ aspectRatio }}
      >
        <Camera className="w-8 h-8 text-gold/40" />
        <span className="text-muted/50 text-sm">360° Video — Coming Soon</span>
      </div>
    );
  }

  return (
    <div
      className="relative w-full border border-border-gold rounded overflow-hidden bg-surface"
      style={{ aspectRatio }}
    >
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; gyroscope; autoplay; fullscreen"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
