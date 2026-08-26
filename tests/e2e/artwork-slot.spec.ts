import { expect, test } from "@playwright/test";

import { getArtDirectedImageProps, type ArtworkSources } from "@/components/home/artwork-media";

const artwork: ArtworkSources = {
  desktop: { height: 900, src: "/images/test-artwork-desktop.webp", width: 1200 },
  mobile: { height: 1200, src: "/images/test-artwork-mobile.webp", width: 900 },
};

function imageProps(alt: string, preload = false) {
  return getArtDirectedImageProps({
    alt,
    preload,
    sizes: "(max-width: 767px) 100vw, 50vw",
    sources: artwork,
  });
}

test("loaded decorative artwork uses an empty alternative", () => {
  expect(imageProps("")?.desktop.alt).toBe("");
});

test("loaded informative artwork keeps its concise alternative", () => {
  expect(imageProps("A structured evidence path")?.desktop.alt).toBe("A structured evidence path");
});

test("ArtworkSlot media art-directs mobile sources without duplicate image elements", () => {
  const props = imageProps("");

  expect(props?.mobile.media).toBe("(max-width: 767px)");
  expect(props?.mobile.srcSet).toContain("test-artwork-mobile.webp");
  expect(props?.desktop.srcSet).toContain("test-artwork-desktop.webp");
});

test("high-priority art-directed media eagerly fetches only the selected picture candidate", () => {
  const props = imageProps("", true);

  expect(props?.desktop.fetchPriority).toBe("high");
  expect(props?.desktop.loading).toBe("eager");
});
