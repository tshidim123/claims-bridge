export type VisualAssetSource = {
  height: number;
  src: string;
  width: number;
};

export type VisualAssetTarget = {
  desktop: VisualAssetSource;
  fit: "contain" | "cover";
  mobile?: VisualAssetSource;
  mobileObjectPosition?: string;
  objectPosition: string;
  quality: number;
  sizes: string;
};

// These are production targets, not live sources. Keep ArtworkSlot.artwork unset
// until an exported file has passed visual, weight and crop review.
export const visualAssetTargets = {
  home: {
    hero: {
      desktop: {
        height: 2400,
        src: "/images/claims-bridge/home/hero-bridge-environment.webp",
        width: 2400,
      },
      fit: "cover",
      mobile: {
        height: 1800,
        src: "/images/claims-bridge/home/hero-bridge-environment-mobile.webp",
        width: 1440,
      },
      mobileObjectPosition: "50% 46%",
      objectPosition: "52% 48%",
      quality: 82,
      sizes: "(max-width: 429px) 112vw, (max-width: 767px) 100vw, (max-width: 1023px) 52vw, (max-width: 1439px) 50vw, 750px",
    },
    evidenceVault: {
      desktop: {
        height: 2400,
        src: "/images/claims-bridge/home/evidence-vault.webp",
        width: 2400,
      },
      fit: "contain",
      mobile: {
        height: 1800,
        src: "/images/claims-bridge/home/evidence-vault-mobile.webp",
        width: 1200,
      },
      mobileObjectPosition: "50% 50%",
      objectPosition: "50% 50%",
      quality: 75,
      sizes: "(max-width: 767px) 96vw, (max-width: 1023px) 92vw, (max-width: 1439px) 50vw, 750px",
    },
    portalAtmosphere: {
      desktop: {
        height: 1400,
        src: "/images/claims-bridge/home/portal-atmosphere.webp",
        width: 2400,
      },
      fit: "cover",
      mobile: {
        height: 1600,
        src: "/images/claims-bridge/home/portal-atmosphere-mobile.webp",
        width: 1200,
      },
      mobileObjectPosition: "50% 52%",
      objectPosition: "54% 50%",
      quality: 70,
      sizes: "(max-width: 767px) 112vw, (max-width: 1023px) 96vw, (max-width: 1439px) 62vw, 980px",
    },
  },
  about: {
    hero: {
      desktop: { height: 1800, src: "/images/claims-bridge/about/about-environment.webp", width: 3200 },
      mobile: { height: 1800, src: "/images/claims-bridge/about/about-environment-mobile.webp", width: 1440 },
    },
  },
  claims: {
    depositProtection: {
      desktop: { height: 1800, src: "/images/claims-bridge/claims/deposit-protection.webp", width: 2400 },
      mobile: { height: 1500, src: "/images/claims-bridge/claims/deposit-protection-mobile.webp", width: 1200 },
    },
    claimProgress: {
      desktop: { height: 1600, src: "/images/claims-bridge/claims/claim-progress.webp", width: 3200 },
      mobile: { height: 1800, src: "/images/claims-bridge/claims/claim-progress-mobile.webp", width: 1200 },
    },
  },
  resources: {
    documentSecurity: {
      desktop: { height: 2000, src: "/images/claims-bridge/resources/document-security.webp", width: 2400 },
      mobile: { height: 1500, src: "/images/claims-bridge/resources/document-security-mobile.webp", width: 1200 },
    },
  },
} as const;
