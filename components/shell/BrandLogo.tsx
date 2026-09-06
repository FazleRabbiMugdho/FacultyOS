import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Premium FacultyOS brand mark — a self-contained gradient tile with a
 * refined mortarboard glyph, glass highlight, and tassel accent.
 * Size it via className (e.g. "h-10 w-10").
 */
export function BrandLogo({ className }: { className?: string }) {
  const gid = React.useId();
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="FacultyOS"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={`${gid}-bg`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="0.5" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id={`${gid}-glyph`} x1="9" y1="11" x2="31" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#e0e7ff" />
        </linearGradient>
        <linearGradient id={`${gid}-shine`} x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Tile */}
      <rect width="40" height="40" rx="11" fill={`url(#${gid}-bg)`} />
      {/* Glass highlight */}
      <rect width="40" height="40" rx="11" fill={`url(#${gid}-shine)`} />
      <rect x="0.5" y="0.5" width="39" height="39" rx="10.5" stroke="#ffffff" strokeOpacity="0.18" />

      {/* Mortarboard top */}
      <path d="M20 10.5 L31.5 16.2 L20 21.9 L8.5 16.2 Z" fill={`url(#${gid}-glyph)`} />
      {/* Head band */}
      <path
        d="M13.6 18.9 V23.4 C13.6 25.6 16.5 27.4 20 27.4 C23.5 27.4 26.4 25.6 26.4 23.4 V18.9 L20 22.1 Z"
        fill={`url(#${gid}-glyph)`}
        fillOpacity="0.92"
      />
      {/* Tassel */}
      <path d="M31.5 16.2 V22.4" stroke="#c7d2fe" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="31.5" cy="23.8" r="1.5" fill="#c7d2fe" />
    </svg>
  );
}
