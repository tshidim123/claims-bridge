import Image, { getImageProps, type ImageProps } from "next/image";

export type ArtworkSource = {
  height: number;
  src: ImageProps["src"];
  width: number;
};

export type ArtworkSources = {
  desktop: ArtworkSource;
  mobile?: ArtworkSource;
};

type ArtworkMediaProps = {
  alt: string;
  className: string;
  mobileBreakpoint?: number;
  pictureClassName: string;
  preload?: boolean;
  quality?: number;
  sizes: string;
  sources: ArtworkSources;
};

type ArtDirectedImageProps = Pick<
  ArtworkMediaProps,
  "alt" | "mobileBreakpoint" | "preload" | "quality" | "sizes" | "sources"
>;

export function getArtDirectedImageProps({
  alt,
  mobileBreakpoint = 767,
  preload = false,
  quality = 75,
  sizes,
  sources,
}: ArtDirectedImageProps) {
  if (!sources.mobile) return null;

  const common = { alt, quality, sizes };
  const {
    props: { srcSet: desktopSrcSet, ...desktopProps },
  } = getImageProps({ ...common, ...sources.desktop });
  const {
    props: { srcSet: mobileSrcSet },
  } = getImageProps({ ...common, ...sources.mobile });

  return {
    desktop: {
      ...desktopProps,
      alt,
      fetchPriority: preload ? ("high" as const) : undefined,
      loading: preload ? ("eager" as const) : ("lazy" as const),
      srcSet: desktopSrcSet,
    },
    mobile: {
      media: `(max-width: ${mobileBreakpoint}px)`,
      sizes,
      srcSet: mobileSrcSet,
    },
  };
}

export function ArtworkMedia({
  alt,
  className,
  mobileBreakpoint = 767,
  pictureClassName,
  preload = false,
  quality = 75,
  sizes,
  sources,
}: ArtworkMediaProps) {
  const artDirectedProps = getArtDirectedImageProps({
    alt,
    mobileBreakpoint,
    preload,
    quality,
    sizes,
    sources,
  });

  if (artDirectedProps) {
    return (
      <picture className={pictureClassName}>
        <source {...artDirectedProps.mobile} />
        {/* getImageProps is the Next.js-supported art-direction path. */}
        <img {...artDirectedProps.desktop} alt={alt} className={className} />
      </picture>
    );
  }

  return (
    <Image
      {...sources.desktop}
      alt={alt}
      className={className}
      preload={preload}
      quality={quality}
      sizes={sizes}
    />
  );
}
