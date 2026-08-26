import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function ApplicationContainer({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("application-container", className)} {...props} />;
}
