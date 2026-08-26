import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ArtworkMedia, type ArtworkSources } from "./artwork-media";
import styles from "./artwork-slot.module.css";

export type { ArtworkSource, ArtworkSources } from "./artwork-media";

type ArtworkSlotBaseProps = {
  artwork?: ArtworkSources;
  aspectRatio?: string;
  children: ReactNode;
  className?: string;
  fit?: "contain" | "cover";
  futureMobileSrc?: string;
  futureSrc: string;
  mobileAspectRatio?: string;
  mobileBreakpoint?: number;
  mobileObjectPosition?: string;
  objectPosition?: string;
  preload?: boolean;
  quality?: number;
  sizes?: string;
  style?: CSSProperties;
};

type ArtworkSlotProps = ArtworkSlotBaseProps & (
  | {
      alt?: never;
      decorative?: true;
      fallbackLabel?: never;
    }
  | {
      alt: string;
      decorative: false;
      fallbackLabel: string;
    }
);

type ArtworkSlotStyle = CSSProperties & {
  "--artwork-aspect-ratio"?: string;
  "--artwork-fit"?: string;
  "--artwork-mobile-aspect-ratio"?: string;
  "--artwork-mobile-position"?: string;
  "--artwork-position"?: string;
};

export function ArtworkSlot({
  alt,
  artwork,
  aspectRatio,
  children,
  className,
  decorative = true,
  fallbackLabel,
  fit = "cover",
  futureMobileSrc,
  futureSrc,
  mobileAspectRatio,
  mobileBreakpoint = 767,
  mobileObjectPosition,
  objectPosition = "50% 50%",
  preload = false,
  quality = 75,
  sizes = "(max-width: 767px) 100vw, 50vw",
  style,
}: ArtworkSlotProps) {
  const accessibleLabel = decorative ? "" : (alt ?? fallbackLabel ?? "");
  const slotStyle: ArtworkSlotStyle = {
    ...style,
    "--artwork-aspect-ratio": aspectRatio,
    "--artwork-fit": fit,
    "--artwork-mobile-aspect-ratio": mobileAspectRatio ?? aspectRatio,
    "--artwork-mobile-position": mobileObjectPosition ?? objectPosition,
    "--artwork-position": objectPosition,
  };

  return (
    <div
      aria-hidden={decorative ? true : undefined}
      aria-label={!decorative && !artwork ? accessibleLabel : undefined}
      className={cn(styles.root, className)}
      data-artwork-mobile-target={futureMobileSrc}
      data-artwork-ratio={aspectRatio ? "controlled" : undefined}
      data-artwork-state={artwork ? "loaded" : "fallback"}
      data-artwork-target={futureSrc}
      role={!decorative && !artwork ? "img" : undefined}
      style={slotStyle}
    >
      <div aria-hidden={artwork || decorative ? true : undefined} className={styles.fallback}>
        {children}
      </div>
      {artwork ? (
        <ArtworkMedia
          alt={accessibleLabel}
          className={styles.image}
          mobileBreakpoint={mobileBreakpoint}
          pictureClassName={styles.picture}
          preload={preload}
          quality={quality}
          sizes={sizes}
          sources={artwork}
        />
      ) : null}
    </div>
  );
}
