import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

type GlassSurfaceProps<T extends ElementType = "div"> = {
  as?: T;
  children: ReactNode;
  className?: string;
  strength?: "quiet" | "medium" | "strong";
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function GlassSurface<T extends ElementType = "div">({
  as,
  children,
  className,
  strength = "medium",
  ...props
}: GlassSurfaceProps<T>) {
  const Component = as ?? "div";

  return (
    <Component
      className={cn("glass-surface", `glass-surface--${strength}`, className)}
      {...props}
    >
      <div className="glass-surface__content">{children}</div>
    </Component>
  );
}
