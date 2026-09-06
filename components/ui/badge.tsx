import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/10 text-primary hover:bg-primary/20",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20",
        outline: "text-foreground",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        warning:
          "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        danger:
          "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
        glass:
          "glass-pill text-foreground border-border/60 backdrop-blur-md",
        bloom1: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
        bloom2: "border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
        bloom3: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        bloom4: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        bloom5: "border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400",
        bloom6: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
