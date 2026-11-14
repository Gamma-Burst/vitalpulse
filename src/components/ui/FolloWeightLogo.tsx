"use client";

import React, { useId } from "react";

interface FolloWeightLogoProps {
  size?: number;
  showWordmark?: boolean;
  subtitle?: string;
  className?: string;
}

/**
 * Emblème officiel FolloWeight (followeight.com) — Monogramme F + W bioluminescent.
 */
export function FolloWeightLogo({
  size = 38,
  showWordmark = true,
  subtitle = "followeight.com",
  className = "",
}: FolloWeightLogoProps) {
  const uid = useId().replace(/:/g, "");
  const obsId = `fw-obs-${uid}`;
  const flowId = `fw-flow-${uid}`;
  const warmId = `fw-warm-${uid}`;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        role="img"
        aria-label="FolloWeight"
        className="shrink-0 rounded-xl ring-1 ring-emerald-400/25 shadow-lg shadow-emerald-500/15"
      >
        <defs>
          <linearGradient id={obsId} x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
            <stop stopColor="#070C0B" />
            <stop offset="1" stopColor="#0F2421" />
          </linearGradient>
          <linearGradient id={flowId} x1="130" y1="352" x2="357" y2="148" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10B981" />
            <stop offset=".56" stopColor="#34D399" />
            <stop offset="1" stopColor="#38BDF8" />
          </linearGradient>
          <linearGradient id={warmId} x1="236" y1="158" x2="302" y2="158" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FBBF24" stopOpacity="0" />
            <stop offset=".4" stopColor="#FBBF24" stopOpacity="0" />
            <stop offset="1" stopColor="#FBBF24" stopOpacity=".9" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="112" fill={`url(#${obsId})`} />
        <g
          transform="translate(-1.5 4)"
          fill="none"
          stroke={`url(#${flowId})`}
          strokeWidth="44"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M145 346V177Q145 158 164 158H280 M145 240H224" />
          <path d="M145 240L183 329Q194 355 208 330L249 257Q256 244 263 258L299 330Q312 355 325 328L370 158" />
          <path d="M258 158H280" stroke={`url(#${warmId})`} />
        </g>
      </svg>

      {showWordmark && (
        <div className="leading-tight">
          <div className="font-display text-base font-extrabold tracking-tight text-white">
            Follo<span className="text-emerald-400">Weight</span>
          </div>
          {subtitle && (
            <span className="block text-[10px] font-medium text-emerald-300/80">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
