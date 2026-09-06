"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, Laptop, LogOut, User, Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface TopBarProps {
  userEmail?: string | null;
  userName?: string | null;
  userRole?: "admin" | "senior" | "junior";
}

export function TopBar({
  userEmail = "faculty@university.edu",
  userName = "Dr. Eleanor Vance",
  userRole = "senior",
}: TopBarProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      router.push("/login");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to sign out");
    }
  };

  const roleLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" | "danger" | "glass" }> = {
    junior: { label: "Junior Faculty (E1)", variant: "secondary" },
    senior: { label: "Senior Faculty (E2/E3)", variant: "default" },
    admin: { label: "Department Admin", variant: "warning" },
  };

  const currentRole = roleLabels[userRole] || roleLabels.junior;

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border/60 bg-background/80 px-6 backdrop-blur-md">
      {/* Left breadcrumb / title indication */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">FacultyOS</span>
          <span>/</span>
          <span className="rounded-md bg-secondary/80 px-2 py-0.5 font-medium text-foreground">
            Academic Year 2026–2027
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Role Badge */}
        <Badge variant={currentRole.variant} className="hidden sm:inline-flex gap-1.5 py-1 text-xs">
          <Shield className="h-3 w-3" />
          {currentRole.label}
        </Badge>

        {/* Theme Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-indigo-400" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Laptop className="mr-2 h-4 w-4" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative flex items-center gap-2.5 rounded-xl p-1 pr-2 hover:bg-accent/60"
            >
              <Avatar className="h-8 w-8 rounded-lg border border-border">
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold text-xs">
                  {userName ? userName.slice(0, 2).toUpperCase() : "FA"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col text-left md:flex">
                <span className="text-xs font-semibold text-foreground leading-tight">
                  {userName}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {userEmail}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User className="mr-2 h-4 w-4" />
              Profile & Preferences
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Sparkles className="mr-2 h-4 w-4 text-primary" />
              AI Prompt Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
