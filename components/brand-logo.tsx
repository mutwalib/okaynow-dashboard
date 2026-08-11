import Image from "next/image";

const VARIANTS = {
  primary: {
    src: "/branding/okaynow_primary_logo.png",
    width: 1200,
    height: 360,
  },
  mark: {
    src: "/branding/okaynow_icon_app_mark.png",
    width: 512,
    height: 512,
  },
  mono: {
    src: "/branding/okaynow_logo_monochrome.png",
    width: 1200,
    height: 320,
  },
  monoMark: {
    src: "/branding/okaynow_icon_monochrome.png",
    width: 512,
    height: 512,
  },
  chip: {
    src: "/branding/okaynow_icon_reversed_chip.png",
    width: 512,
    height: 512,
  },
} as const;

export type BrandLogoVariant = keyof typeof VARIANTS;

/** Display height in px; width follows aspect ratio. */
const DEFAULT_HEIGHT: Record<BrandLogoVariant, number> = {
  primary: 36,
  mark: 32,
  mono: 32,
  monoMark: 32,
  chip: 32,
};

export function BrandLogo({
  variant = "primary",
  height,
  className,
  alt = "OkayNow",
  priority = false,
}: {
  variant?: BrandLogoVariant;
  /** CSS pixel height; width is derived from the asset aspect ratio. */
  height?: number;
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  const asset = VARIANTS[variant];
  const h = height ?? DEFAULT_HEIGHT[variant];
  const w = Math.round((h * asset.width) / asset.height);

  return (
    <Image
      src={asset.src}
      alt={alt}
      width={w}
      height={h}
      priority={priority}
      className={className}
      style={{ width: w, height: h }}
    />
  );
}
