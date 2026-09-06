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
import { Moon, Sun, Laptop, LogOut, User, Shield, Sparkles, Building2, ShieldCheck, Key } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface TopBarProps {
  userEmail?: string | null;
  userName?: string | null;
  userRole?: "service_provider" | "admin" | "senior" | "junior";
  accountType?: "university_user" | "service_provider";
  institutionName?: string | null;
  institutionTier?: string | null;
  isSuperAdmin?: boolean;
}

export function TopBar({
  userEmail = "faculty@aust.edu",
  userName = "Dr. Eleanor Vance",
  userRole = "senior",
  accountType = "university_user",
  institutionName = "Ahsanullah University of Science and Technology",
  institutionTier = "Enterprise",
  isSuperAdmin = false,
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

  const isProvider = accountType === "service_provider" || userRole === "service_provider" || isSuperAdmin;

  const roleLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" | "danger" | "glass" }> = {
    service_provider: { label: "Platform Operator (Vendor)", variant: "glass" },
    junior: { label: "Junior Faculty (E1)", variant: "secondary" },
    senior: { label: "Senior Faculty (E2/E3)", variant: "default" },
    admin: { label: "Department Chair", variant: "warning" },
  };

  const currentRole = roleLabels[userRole] || roleLabels.junior;

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border/60 bg-background/80 px-6 backdrop-blur-md">
      {/* Left breadcrumb / Tenancy & Identity indication */}
      <div className="flex items-center gap-3">
        {isProvider ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-purple-400" />
              FacultyOS Platform
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/25 px-2.5 py-0.5 font-semibold text-[11px] flex items-center gap-1">
              <Key className="w-3 h-3 text-purple-400" />
              Service Provider · Developer Console
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Building2 className="h-3.5 w-3.5 text-indigo-400" />
              <span className="truncate max-w-[260px] sm:max-w-[340px]">
                {institutionName || "Ahsanullah University of Science and Technology"}
              </span>
            </div>
            <span>/</span>
            <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium hidden sm:inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              {institutionTier ? `${institutionTier.toUpperCase()} License` : "Licensed Campus"}
            </span>
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Role Badge */}
        {isProvider ? (
          <Badge className="hidden sm:inline-flex gap-1.5 py-1 text-xs bg-purple-600/15 text-purple-300 border-purple-500/30">
            <Shield className="h-3 w-3 text-purple-400" />
            Platform Super-Admin
          </Badge>
        ) : (
          <Badge variant={currentRole.variant} className="hidden sm:inline-flex gap-1.5 py-1 text-xs">
            <Shield className="h-3 w-3" />
            {currentRole.label}
          </Badge>
        )}

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
            {isProvider ? (
              <DropdownMenuItem asChild>
                <Link href="/admin/licensing" className="flex items-center cursor-pointer text-purple-400 font-medium">
                  <Key className="mr-2 h-4 w-4 text-purple-400" />
                  Provider Licensing Console
                </Link>
              </DropdownMenuItem>
            ) : (
              <div className="px-2 py-1 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="truncate">{institutionName}</span>
              </div>
            )}
            <DropdownMenuItem disabled>
              <User className="mr-2 h-4 w-4" />
              Academic Profile
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
