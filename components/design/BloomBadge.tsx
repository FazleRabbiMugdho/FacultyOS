import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { BLOOM_TAXONOMY, type BloomLevel } from "@/lib/design/types";
import { cn } from "@/lib/utils";

interface BloomBadgeProps {
  level: BloomLevel | number;
  showName?: boolean;
  showCategory?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function BloomBadge({
  level,
  showName = true,
  showCategory = false,
  className,
  size = "md",
}: BloomBadgeProps) {
  const safeLevel = (
    Math.min(Math.max(Number(level) || 1, 1), 6)
  ) as BloomLevel;
  const info = BLOOM_TAXONOMY[safeLevel];

  return (
    <Badge
      variant={info.badgeVariant}
      className={cn(
        "font-semibold tracking-tight tabular-nums transition-transform select-none",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      <span>L{safeLevel}</span>
      {showName && <span className="ml-1 font-medium">· {info.name}</span>}
      {showCategory && (
        <span className="ml-1 opacity-75 font-normal">
          ({info.category === "Higher-Order" ? "HOT" : "LOT"})
        </span>
      )}
    </Badge>
  );
}
