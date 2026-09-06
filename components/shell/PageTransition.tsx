"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/**
 * Re-triggers an entrance animation on every route change by keying the
 * wrapper on the current pathname. Gives the whole app a cohesive,
 * premium page-to-page transition.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
