import type { SVGProps } from "react";

export type ConceptIconName =
  | "assessment"
  | "deposit"
  | "evidence"
  | "message"
  | "progress"
  | "protection"
  | "tenancy";

const paths: Record<ConceptIconName, React.ReactNode> = {
  assessment: (
    <>
      <path d="M5 4.5h14v15H5zM8 9h8M8 13h5" />
      <path d="m13.5 16 1.5 1.5 3-3" />
    </>
  ),
  deposit: (
    <>
      <ellipse cx="12" cy="6.5" rx="6.5" ry="2.5" />
      <path d="M5.5 6.5v4c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-4M5.5 10.5v4c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-4" />
    </>
  ),
  evidence: (
    <>
      <path d="M7 3.5h7l4 4v13H7zM14 3.5v4h4M10 12h5M10 16h3" />
      <circle cx="17.5" cy="17.5" r="3" />
    </>
  ),
  message: <path d="M4 5h16v12H9l-5 3zM8 9h8M8 13h5" />,
  progress: (
    <>
      <path d="M4 17 9 12l3 3 8-9" />
      <circle cx="4" cy="17" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="12" cy="15" r="1.5" /><circle cx="20" cy="6" r="1.5" />
    </>
  ),
  protection: <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6zM9 12l2 2 4-5" />,
  tenancy: <path d="m4 10 8-6 8 6v10h-6v-6h-4v6H4zM8 10h8" />,
};

export function ConceptIcon({ name, className, ...props }: SVGProps<SVGSVGElement> & { name: ConceptIconName }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
