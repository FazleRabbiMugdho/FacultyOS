"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Compass,
  FileQuestion,
  ChevronLeft,
  ChevronRight,
  Scale,
  CalendarDays,
  Building2,
  Sparkles,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/shell/BrandLogo";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  description: string;
}

const universityNavItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Academic lifecycle, accreditation status & quick actions",
  },
  {
    name: "Course Design",
    href: "/design",
    icon: Compass,
    description: "Syllabus, CO-PO Matrix & Exam Blueprint",
  },
  {
    name: "Question Authoring",
    href: "/questions",
    icon: FileQuestion,
    description: "Blueprint generation, Dedup & Partial Credit",
  },
  {
    name: "Grading & Fairness",
    href: "/grading",
    icon: Scale,
    description: "Multimodal grading, Arbitration & Reliability",
  },
  {
    name: "Course Routine",
    href: "/routine",
    icon: CalendarDays,
    description: "Weekly instructor, room & cohort scheduling",
  },
];

const providerNavItems: NavItem[] = [
  {
    name: "Licensing & Domains",
    href: "/admin/licensing",
    icon: Building2,
    description: "Gated university domains, contracts & seat quotas",
  },
];

interface SidebarProps {
  accountType?: "university_user" | "service_provider";
  isSuperAdmin?: boolean;
  institutionName?: string;
}

export function Sidebar({
  accountType = "university_user",
  isSuperAdmin = false,
  institutionName = "Ahsanullah University of Science and Technology",
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  const isProvider = isSuperAdmin || accountType === "service_provider";
  const isOnAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/provider");

  // If on admin routes, show provider navigation. If navigating campus workspace, show university routes.
  const visibleItems = isProvider
    ? isOnAdminRoute
      ? providerNavItems
      : universityNavItems
    : universityNavItems;

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border/80 bg-card/40 backdrop-blur-xl transition-all duration-300 ease-in-out z-30",
        collapsed ? "w-20" : "w-72"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border/60">
        <Link
          href={isProvider && isOnAdminRoute ? "/admin/licensing" : "/dashboard"}
          className="group flex items-center gap-3 overflow-hidden press"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md shadow-primary/25 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <BrandLogo className="h-10 w-10" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-foreground">
                FacultyOS
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                {isProvider
                  ? isOnAdminRoute
                    ? "Platform Operator"
                    : "Simulated Campus View"
                  : "Campus Workspace"}
              </span>
            </div>
          )}
        </Link>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Tenant Indicator Pill */}
      {!collapsed && (
        <div className="px-4 pt-3 pb-1">
          {isProvider && isOnAdminRoute ? (
            <div className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center gap-2 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="font-semibold text-purple-300 truncate">
                Platform Operator Console
              </span>
            </div>
          ) : (
            <div className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2 text-xs">
              <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="font-medium text-foreground truncate">
                {institutionName}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {!collapsed
            ? isProvider && isOnAdminRoute
              ? "Platform Administration"
              : "Academic Lifecycle"
            : "•••"}
        </div>

        {visibleItems.map((item, i) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              item.href !== "/admin/licensing" &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              style={{ animationDelay: `${0.05 + i * 0.06}s` }}
              className={cn(
                "reveal-sm press group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:translate-x-0.5"
              )}
            >
              {/* Animated active indicator bar */}
              {isActive && !collapsed && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary-foreground/90 reveal-scale" />
              )}
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground group-hover:text-primary"
                )}
              />

              {!collapsed && (
                <div className="flex flex-1 items-center justify-between overflow-hidden">
                  <span className="truncate">{item.name}</span>
                </div>
              )}
            </Link>
          );
        })}

        {/* For Service Providers: Switch between Operator Console and Campus View */}
        {isProvider && (
          <div className="pt-3 mt-3 border-t border-border/40">
            {isOnAdminRoute ? (
              <Link
                href="/dashboard"
                className="reveal-sm press group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-all"
              >
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                {!collapsed && (
                  <span className="truncate">Simulate Campus View</span>
                )}
              </Link>
            ) : (
              <Link
                href="/admin/licensing"
                className="reveal-sm press group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all"
              >
                <ArrowLeft className="h-4 w-4 shrink-0 text-purple-400" />
                {!collapsed && (
                  <span className="truncate font-semibold">
                    Return to Operator Console
                  </span>
                )}
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Footer / System Status */}
      <div className="p-3 border-t border-border/60">
        {!collapsed ? (
          <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-1 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>AI Gateway Online</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Gemini 1.5 Pro + OpenRouter VLM
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
}
