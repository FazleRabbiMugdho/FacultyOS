"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "dropdown" | "button";
}

export function ThemeToggle({ className, variant = "dropdown" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "h-9 w-9 rounded-xl border border-border/40 bg-background/50 backdrop-blur-md opacity-70",
          className
        )}
      />
    );
  }

  // Quick single-click toggle variant
  if (variant === "button") {
    const isDark = resolvedTheme === "dark";
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={cn(
          "relative h-9 gap-2 rounded-xl px-3 border-border/70 bg-background/70 backdrop-blur-md shadow-sm hover:bg-accent hover:border-border transition-all",
          className
        )}
        aria-label="Toggle theme"
      >
        <div className="relative h-4 w-4">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute inset-0 h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-indigo-400" />
        </div>
        <span className="text-xs font-medium text-foreground">
          {isDark ? "Dark Mode" : "Light Mode"}
        </span>
      </Button>
    );
  }

  // Dropdown menu variant (default)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "relative h-9 w-9 rounded-xl border-border/70 bg-background/70 backdrop-blur-md shadow-sm hover:bg-accent hover:border-border transition-all",
            className
          )}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-indigo-400" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl border-border/80 shadow-xl backdrop-blur-xl bg-card/95">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center gap-2 text-xs font-medium cursor-pointer rounded-lg",
            theme === "light" && "bg-primary/10 text-primary font-semibold"
          )}
        >
          <Sun className="h-4 w-4 text-amber-500" />
          <span>Light Mode</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center gap-2 text-xs font-medium cursor-pointer rounded-lg",
            theme === "dark" && "bg-primary/10 text-primary font-semibold"
          )}
        >
          <Moon className="h-4 w-4 text-indigo-400" />
          <span>Dark Mode</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={cn(
            "flex items-center gap-2 text-xs font-medium cursor-pointer rounded-lg",
            theme === "system" && "bg-primary/10 text-primary font-semibold"
          )}
        >
          <Laptop className="h-4 w-4 text-muted-foreground" />
          <span>System Preference</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
