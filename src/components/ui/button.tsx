import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
  Ref,
} from "react";

import { cn } from "@/lib/utils";

type ButtonVisualProps = {
  children: ReactNode;
  className?: string;
  size?: "small" | "medium" | "large";
  variant?: "primary" | "secondary" | "quiet" | "glass";
  ref?: Ref<HTMLButtonElement> | Ref<HTMLAnchorElement>;
};

export function Button({
  children,
  className,
  size = "medium",
  variant = "primary",
  ref,
  type = "button",
  ...props
}: ButtonVisualProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn("button", `button--${variant}`, `button--${size}`, className)}
      ref={ref as Ref<HTMLButtonElement>}
      type={type}
      {...props}
    >
      <span className="button__label">{children}</span>
    </button>
  );
}

export function ButtonLink({
  children,
  className,
  href,
  size = "medium",
  variant = "primary",
  ref: _ref,
  ...props
}: ButtonVisualProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  void _ref;
  return (
    <Link
      className={cn("button", `button--${variant}`, `button--${size}`, className)}
      href={href}
      {...props}
    >
      <span className="button__label">{children}</span>
    </Link>
  );
}
