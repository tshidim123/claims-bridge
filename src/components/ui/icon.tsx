import type { SVGProps } from "react";

export type IconName =
  | "arrow"
  | "chevron"
  | "close"
  | "documents"
  | "home"
  | "menu"
  | "message"
  | "notification"
  | "profile"
  | "search"
  | "shield"
  | "support";

type IconProps = SVGProps<SVGSVGElement> & { name: IconName };

const paths: Record<IconName, React.ReactNode> = {
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  close: <path d="m7 7 10 10M17 7 7 17" />,
  documents: <path d="M7 3.5h7l4 4v13H7zM14 3.5v4h4M10 12h5M10 16h5" />,
  home: <path d="m4 10 8-6 8 6v10h-6v-6h-4v6H4z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  message: <path d="M4 5h16v12H9l-5 3zM8 9h8M8 13h5" />,
  notification: <path d="M6.5 17h11l-1.5-2V10a4 4 0 0 0-8 0v5zM10 20h4" />,
  profile: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />,
  search: <path d="m20 20-4.5-4.5M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z" />,
  shield: <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6zM9 12l2 2 4-5" />,
  support: <path d="M4 13a8 8 0 0 1 16 0M4 13v4h4v-5H4m16 1v4h-4v-5h4M16 19c-1 1-2.2 1.5-4 1.5" />,
};

export function Icon({ name, className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
