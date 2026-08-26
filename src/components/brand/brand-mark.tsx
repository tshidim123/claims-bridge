import Link from "next/link";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
};

export function BrandMark({ compact = false, href = "/" }: BrandMarkProps) {
  return (
    <Link className="brand-mark" href={href} aria-label="Claims Bridge home">
      <svg
        className="brand-mark__symbol"
        viewBox="0 0 44 36"
        aria-hidden="true"
      >
        <path className="brand-mark__rail" d="M3 29C10 29 10 8 18 8s8 21 15 21h8" />
        <path className="brand-mark__beam" d="M4 29h36" />
        <circle className="brand-mark__node" cx="18" cy="8" r="2.8" />
        <circle className="brand-mark__node" cx="33" cy="29" r="2.8" />
      </svg>
      {!compact && (
        <span className="brand-mark__name">
          Claims <span>Bridge</span>
        </span>
      )}
    </Link>
  );
}
