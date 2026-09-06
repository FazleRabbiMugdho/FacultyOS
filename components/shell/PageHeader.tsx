import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  title: string;
  description?: string;
  badgeText?: string;
  badgeVariant?: "default" | "secondary" | "outline" | "success" | "warning" | "danger" | "glass";
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badgeText,
  badgeVariant = "secondary",
  actions,
  icon,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "reveal flex flex-col gap-4 pb-6 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-3.5">
        {icon && (
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 transition-transform duration-300 hover:scale-105 hover:rotate-3">
            {icon}
          </div>
        )}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {badgeText && (
              <Badge variant={badgeVariant} className="text-xs whitespace-nowrap shrink-0 reveal-scale delay-2">
                {badgeText}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>
      )}
    </div>
  );
}
