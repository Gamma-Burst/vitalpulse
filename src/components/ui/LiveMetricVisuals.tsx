"use client";

import React, { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { DashboardWidgetId } from "@/types/vitalpulse";
import { clampRingProgress, computeWaterWaveGeometry } from "@/lib/ui-progressive";

export interface HeroEnergyOrbProps {
  consumedKcal: number;
  targetKcal: number;
  burnedKcal?: number;
  size?: number;
}

export function HeroEnergyOrb({
  consumedKcal,
  targetKcal,
  burnedKcal = 0,
  size = 168,
}: HeroEnergyOrbProps) {
  const uid = useId().replace(/:/g, "");
  const shouldReduceMotion = useReducedMotion();
  const safeTarget = Math.max(1, Math.round(targetKcal));
  const remaining = Math.round(safeTarget + burnedKcal - consumedKcal);
  const ratio = clampRingProgress(consumedKcal, safeTarget);
  const r = 68;
  const cx = 90;
  const cy = 90;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - ratio);
  const overBudget = remaining < 0;

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 180 180"
        className="h-full w-full"
        role="img"
        aria-label={`Énergie : ${Math.round(consumedKcal)} sur ${safeTarget} kcal`}
      >
        <defs>
          <linearGradient id={`orb-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={overBudget ? "#FB7185" : "#2FE09B"} />
            <stop offset="55%" stopColor={overBudget ? "#F59E0B" : "#38BDF8"} />
            <stop offset="100%" stopColor={overBudget ? "#EF4444" : "#34D399"} />
          </linearGradient>
          <radialGradient id={`orb-aura-${uid}`} cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor={overBudget ? "rgba(251,113,133,0.22)" : "rgba(47,224,155,0.22)"}
            />
            <stop offset="100%" stopColor="rgba(47,224,155,0)" />
          </radialGradient>
        </defs>

        <motion.circle
          cx={cx}
          cy={cy}
          r={82}
          fill={`url(#orb-aura-${uid})`}
          animate={
            shouldReduceMotion
              ? undefined
              : { scale: [0.96, 1.04, 0.96], opacity: [0.65, 0.95, 0.65] }
          }
          transition={
            shouldReduceMotion
              ? undefined
              : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
          }
          style={{ transformOrigin: "90px 90px" }}
        />

        {/* Anneau guide intérieur */}
        <circle
          cx={cx}
          cy={cy}
          r={55}
          fill="none"
          stroke="currentColor"
          className="text-slate-500/15"
          strokeWidth={1.5}
          strokeDasharray="4 5"
        />

        {/* Piste */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-slate-500/15"
          strokeWidth={13}
        />

        {/* Progression bio-luminescente */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={`url(#orb-grad-${uid})`}
          strokeWidth={13}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={shouldReduceMotion ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={
            shouldReduceMotion
              ? { duration: 0.1 }
              : { type: "spring", stiffness: 110, damping: 18 }
          }
          transform="rotate(-90 90 90)"
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {overBudget ? "Écart" : "Disponible"}
        </span>
        <span
          className={`font-display text-2xl font-extrabold tabular-nums ${
            overBudget ? "text-rose-400" : "text-white"
          }`}
        >
          {Math.abs(remaining)}
        </span>
        <span className="text-[11px] font-medium text-slate-400 tabular-nums">
          kcal {burnedKcal > 0 ? `+${Math.round(burnedKcal)} act.` : ""}
        </span>
      </div>
    </div>
  );
}

export interface FastingHorseshoeArcProps {
  progressPct: number;
  status: "scheduled" | "fasting" | "eating_window" | "idle";
  eyebrow: string;
  countdownText: string;
  protocolLabel: string;
  onEditProtocol?: () => void;
  phaseIcon?: "fork" | "flame" | "bolt";
  startCaption: string;
  startActionLabel: string;
  onEditStart?: () => void;
  endCaption: string;
  endLabel: string;
}

export function FastingHorseshoeArc({
  progressPct,
  status,
  eyebrow,
  countdownText,
  protocolLabel,
  onEditProtocol,
  phaseIcon = "flame",
  startCaption,
  startActionLabel,
  onEditStart,
  endCaption,
  endLabel,
}: FastingHorseshoeArcProps) {
  const uid = useId().replace(/:/g, "");
  const shouldReduceMotion = useReducedMotion();
  const r = 112;
  const cx = 160;
  const cy = 148;
  const circumference = 2 * Math.PI * r;
  const sweepFraction = 270 / 360;
  const totalArcLen = circumference * sweepFraction;
  const clamped = Math.max(0, Math.min(100, progressPct));
  const filledArcLen =
    status === "scheduled"
      ? totalArcLen * 0.04
      : Math.max(totalArcLen * 0.03, totalArcLen * (clamped / 100));

  // Extrémité gauche à 135° (bas gauche)
  const startRad = (135 * Math.PI) / 180;
  const badgeX = cx + r * Math.cos(startRad);
  const badgeY = cy + r * Math.sin(startRad);

  const trackColor =
    status === "eating_window"
      ? "rgba(56, 189, 248, 0.2)"
      : "var(--vp-fasting-track, rgba(251, 191, 36, 0.18))";

  return (
    <div className="mx-auto w-full max-w-[330px] select-none">
      <div className="relative">
        <svg
          viewBox="0 0 320 278"
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={`${eyebrow} ${countdownText} (${protocolLabel})`}
        >
          <defs>
            <linearGradient id={`fast-grad-${uid}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop
                offset="0%"
                stopColor={status === "eating_window" ? "#38BDF8" : "#F59E0B"}
              />
              <stop
                offset="55%"
                stopColor={status === "eating_window" ? "#2FE09B" : "#FBBF24"}
              />
              <stop
                offset="100%"
                stopColor={status === "eating_window" ? "#34D399" : "#2FE09B"}
              />
            </linearGradient>
          </defs>

          {/* Track fer à cheval 270° */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={trackColor}
            strokeWidth={22}
            strokeLinecap="round"
            strokeDasharray={`${totalArcLen} ${circumference}`}
            transform={`rotate(135 ${cx} ${cy})`}
          />

          {/* Progression active */}
          <motion.circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={`url(#fast-grad-${uid})`}
            strokeWidth={22}
            strokeLinecap="round"
            initial={
              shouldReduceMotion
                ? { strokeDasharray: `${filledArcLen} ${circumference}` }
                : { strokeDasharray: `0 ${circumference}` }
            }
            animate={{ strokeDasharray: `${filledArcLen} ${circumference}` }}
            transition={
              shouldReduceMotion
                ? { duration: 0.1 }
                : { type: "spring", stiffness: 90, damping: 18 }
            }
            transform={`rotate(135 ${cx} ${cy})`}
          />

          {/* Pastille icône au point de départ (style YAZIO) */}
          <g transform={`translate(${badgeX}, ${badgeY})`}>
            <circle
              r={18}
              fill="var(--vp-surface, #0f1916)"
              stroke={status === "eating_window" ? "#38BDF8" : "#F59E0B"}
              strokeWidth={3}
            />
            {phaseIcon === "fork" ? (
              <g stroke="#F59E0B" strokeWidth={1.8} strokeLinecap="round" fill="none">
                <path d="M-4 -6 V-1 M-4 -1 V6 M-6.5 -6 V-2.5 C-6.5 -1 -1.5 -1 -1.5 -2.5 V-6" />
                <path d="M4 -6 V6 M4 -6 C6 -4 6 -1 4 0" />
              </g>
            ) : (
              <path
                d="M0 -7 C3 -3 5 0 4 4 C3 6.5 -3 6.5 -4 4 C-5 1 -3 -1 -1.5 -2.5 C-1 -0.5 0.5 -3.5 0 -7 Z"
                fill={status === "eating_window" ? "#38BDF8" : "#F59E0B"}
              />
            )}
          </g>
        </svg>

        {/* Contenu central */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-5">
          <span className="text-xs font-medium text-slate-400">{eyebrow}</span>
          <span className="mt-1 font-display text-4xl font-extrabold tracking-tight text-white tabular-nums">
            {countdownText}
          </span>
          {onEditProtocol ? (
            <button
              type="button"
              onClick={onEditProtocol}
              className="pointer-events-auto mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-500/25 bg-slate-500/15 px-3.5 py-1 text-xs font-bold text-slate-200 hover:bg-slate-500/25"
            >
              <span>{protocolLabel}</span>
              <span aria-hidden="true">✎</span>
            </button>
          ) : (
            <span className="mt-3 rounded-full border border-slate-500/25 bg-slate-500/15 px-3.5 py-1 text-xs font-bold text-slate-200">
              {protocolLabel}
            </span>
          )}
        </div>
      </div>

      {/* Piliers Début / Fin */}
      <div className="-mt-4 grid grid-cols-2 items-start gap-4 text-center">
        <div>
          <p className="text-xs font-bold text-white tabular-nums">{startCaption}</p>
          {onEditStart ? (
            <button
              type="button"
              onClick={onEditStart}
              className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-500/25 bg-slate-500/15 px-3 py-0.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-500/25"
            >
              <span>{startActionLabel}</span>
              <span aria-hidden="true">✎</span>
            </button>
          ) : (
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              {startActionLabel}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-bold text-white tabular-nums">{endCaption}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">{endLabel}</p>
        </div>
      </div>
    </div>
  );
}

export interface LiveTileIconProps {
  kind: DashboardWidgetId;
  ratio?: number;
  active?: boolean;
  size?: number;
}

export function LiveTileIcon({
  kind,
  ratio = 0.6,
  active = true,
  size = 44,
}: LiveTileIconProps) {
  const uid = useId().replace(/:/g, "");
  const shouldReduceMotion = useReducedMotion();
  const rClamped = clampRingProgress(ratio, 1);

  if (kind === "fasting") {
    const rad = 20;
    const circ = 2 * Math.PI * rad;
    const arc = circ * 0.75;
    const fill = arc * Math.max(0.08, rClamped);
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={`fi-${uid}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#2FE09B" />
          </linearGradient>
        </defs>
        <circle
          cx={32}
          cy={32}
          r={rad}
          fill="none"
          stroke="rgba(251,191,36,0.2)"
          strokeWidth={5.5}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circ}`}
          transform="rotate(135 32 32)"
        />
        <motion.circle
          cx={32}
          cy={32}
          r={rad}
          fill="none"
          stroke={`url(#fi-${uid})`}
          strokeWidth={5.5}
          strokeLinecap="round"
          animate={{ strokeDasharray: `${fill} ${circ}` }}
          transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.6 }}
          transform="rotate(135 32 32)"
        />
        <motion.path
          d="M32 21 C35.5 25.5 37.5 29 36.5 34 C35.5 37.5 28.5 37.5 27.5 34 C26.5 30.5 28.5 28 30 26.5 C31 28.5 32.5 25 32 21 Z"
          fill={active ? "#FBBF24" : "#94A3B8"}
          animate={
            shouldReduceMotion || !active
              ? undefined
              : { scale: [1, 1.12, 1], opacity: [0.9, 1, 0.9] }
          }
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "32px 30px" }}
        />
      </svg>
    );
  }

  if (kind === "hydration") {
    const geom = computeWaterWaveGeometry(rClamped, 1);
    const waveY = geom.levelY;
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <clipPath id={`wclip-${uid}`}>
            <rect x={16} y={10} width={32} height={44} rx={10} />
          </clipPath>
          <linearGradient id={`wgrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
        </defs>
        <rect
          x={16}
          y={10}
          width={32}
          height={44}
          rx={10}
          fill="rgba(56,189,248,0.1)"
          stroke="rgba(56,189,248,0.45)"
          strokeWidth={2}
        />
        <g clipPath={`url(#wclip-${uid})`}>
          <motion.g
            animate={
              shouldReduceMotion
                ? { x: 0 }
                : { x: [0, -16, 0] }
            }
            transition={
              shouldReduceMotion
                ? undefined
                : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
            }
          >
            <path
              d={`M 0 ${waveY} Q 16 ${waveY - geom.waveAmplitude} 32 ${waveY} T 64 ${waveY} T 96 ${waveY} V 64 H 0 Z`}
              fill={`url(#wgrad-${uid})`}
              opacity={0.92}
            />
          </motion.g>
        </g>
        <circle cx={26} cy={22} r={2} fill="rgba(255,255,255,0.45)" />
      </svg>
    );
  }

  if (kind === "steps_watch") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x={20}
          y={16}
          width={24}
          height={32}
          rx={7}
          fill="rgba(16,185,129,0.14)"
          stroke="#2FE09B"
          strokeWidth={2.2}
        />
        <path d="M26 11 H38 M26 53 H38" stroke="#34D399" strokeWidth={3} strokeLinecap="round" />
        <motion.path
          d="M23 32 H27 L29.5 26 L33 38 L35.5 31 L38 33 H41"
          fill="none"
          stroke="#2FE09B"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={
            shouldReduceMotion
              ? undefined
              : { opacity: [0.65, 1, 0.65] }
          }
          transition={{ duration: 1.6, repeat: Infinity }}
        />
        <motion.circle
          cx={48}
          cy={18}
          r={4}
          fill="#38BDF8"
          animate={shouldReduceMotion ? undefined : { scale: [0.85, 1.2, 0.85] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{ transformOrigin: "48px 18px" }}
        />
      </svg>
    );
  }

  if (kind === "weight_ema") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x={12}
          y={12}
          width={40}
          height={40}
          rx={11}
          fill="rgba(56,189,248,0.12)"
          stroke="rgba(56,189,248,0.45)"
          strokeWidth={2}
        />
        <path
          d="M18 39 C24 37, 29 31, 35 32 C40 33, 43 26, 47 24"
          fill="none"
          stroke="#38BDF8"
          strokeWidth={2.8}
          strokeLinecap="round"
        />
        <motion.circle
          cx={47}
          cy={24}
          r={4}
          fill="#2FE09B"
          animate={shouldReduceMotion ? undefined : { r: [3.2, 4.8, 3.2] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
      </svg>
    );
  }

  if (kind === "barcode_meals") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x={12}
          y={16}
          width={40}
          height={32}
          rx={8}
          fill="rgba(251,146,60,0.12)"
          stroke="rgba(251,146,60,0.45)"
          strokeWidth={2}
        />
        <g stroke="#FDE68A" strokeLinecap="round">
          <line x1={19} y1={24} x2={19} y2={40} strokeWidth={2.5} />
          <line x1={25} y1={24} x2={25} y2={40} strokeWidth={1.6} />
          <line x1={30} y1={24} x2={30} y2={40} strokeWidth={3} />
          <line x1={36} y1={24} x2={36} y2={40} strokeWidth={1.6} />
          <line x1={41} y1={24} x2={41} y2={40} strokeWidth={2.8} />
          <line x1={45} y1={24} x2={45} y2={40} strokeWidth={1.5} />
        </g>
        <motion.line
          x1={14}
          x2={50}
          y1={32}
          y2={32}
          stroke="#2FE09B"
          strokeWidth={2.2}
          animate={shouldReduceMotion ? undefined : { y1: [22, 42, 22], y2: [22, 42, 22] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    );
  }

  if (kind === "body_blood") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="shrink-0"
      >
        <motion.path
          d="M32 12 C32 12 46 28 46 38 A14 14 0 1 1 18 38 C18 28 32 12 32 12 Z"
          fill="rgba(244,63,94,0.18)"
          stroke="#FB7185"
          strokeWidth={2.4}
          animate={shouldReduceMotion ? undefined : { scale: [0.97, 1.03, 0.97] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{ transformOrigin: "32px 36px" }}
        />
        <path
          d="M24 39 H29 L31.5 34 L34.5 43 L37 38 H40"
          fill="none"
          stroke="#FDA4AF"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (kind === "micronutrients") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx={32} cy={32} r={21} fill="none" stroke="rgba(167,139,250,0.22)" strokeWidth={4} />
        <motion.circle
          cx={32}
          cy={32}
          r={21}
          fill="none"
          stroke="#A78BFA"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="132"
          animate={{ strokeDashoffset: 132 * (1 - Math.max(0.25, rClamped)) }}
          transform="rotate(-90 32 32)"
        />
        <circle cx={32} cy={32} r={13} fill="none" stroke="rgba(45,212,191,0.22)" strokeWidth={4} />
        <motion.circle
          cx={32}
          cy={32}
          r={13}
          fill="none"
          stroke="#2DD4BF"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="82"
          animate={{ strokeDashoffset: 82 * (1 - Math.max(0.35, rClamped * 0.9)) }}
          transform="rotate(-90 32 32)"
        />
        <circle cx={32} cy={32} r={4} fill="#FBBF24" />
      </svg>
    );
  }

  if (kind === "weekly_bank") {
    const heights = [16, 22, 19, 26, 14, 24, 20];
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x={10}
          y={12}
          width={44}
          height={40}
          rx={10}
          fill="rgba(16,185,129,0.1)"
          stroke="rgba(16,185,129,0.35)"
          strokeWidth={1.8}
        />
        {heights.map((h, i) => (
          <motion.rect
            key={i}
            x={16 + i * 5}
            y={44 - h}
            width={3}
            height={h}
            rx={1.5}
            fill={i === 6 ? "#38BDF8" : "#2FE09B"}
            initial={shouldReduceMotion ? undefined : { scaleY: 0.4 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.35, delay: i * 0.04 }}
            style={{ transformOrigin: `${17.5 + i * 5}px 44px` }}
          />
        ))}
      </svg>
    );
  }

  // mindset_coach
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle
        cx={32}
        cy={32}
        r={20}
        fill="rgba(250,204,21,0.12)"
        stroke="rgba(250,204,21,0.45)"
        strokeWidth={2}
      />
      <motion.path
        d="M32 18 L35 27 L44 30 L35 33 L32 42 L29 33 L20 30 L29 27 Z"
        fill="#FACC15"
        animate={shouldReduceMotion ? undefined : { rotate: [0, 8, 0, -8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "32px 30px" }}
      />
    </svg>
  );
}
