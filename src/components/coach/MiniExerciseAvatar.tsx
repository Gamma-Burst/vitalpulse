"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  evaluateMovementPose,
  getExerciseVisualSpec,
  type ExerciseMoveStep,
  type Vec3Deg,
} from "@/lib/exercise-biomechanics";
import { EXERCISES_COMPENDIUM } from "@/data/exercises-compendium";
import { CameraViewPreset, CoachPropType, MuscleGroupId } from "@/types/vitalpulse";

interface Pt3 {
  x: number;
  y: number;
  z: number;
}

interface Mat3 {
  m: number[];
}

const DEG2RAD = Math.PI / 180;

function eulerXYZ(deg: Vec3Deg): Mat3 {
  const x = deg[0] * DEG2RAD;
  const y = deg[1] * DEG2RAD;
  const z = deg[2] * DEG2RAD;
  const cx = Math.cos(x);
  const sx = Math.sin(x);
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const cz = Math.cos(z);
  const sz = Math.sin(z);

  const ae = cx * cz;
  const af = cx * sz;
  const be = sx * cz;
  const bf = sx * sz;

  return {
    m: [
      cy * cz,
      -cy * sz,
      sy,
      be * sy + af,
      ae - bf * sy,
      -sx * cy,
      bf - ae * sy,
      af * sy + be,
      cx * cy,
    ],
  };
}

function mulMat(a: Mat3, b: Mat3): Mat3 {
  const A = a.m;
  const B = b.m;
  return {
    m: [
      A[0] * B[0] + A[1] * B[3] + A[2] * B[6],
      A[0] * B[1] + A[1] * B[4] + A[2] * B[7],
      A[0] * B[2] + A[1] * B[5] + A[2] * B[8],
      A[3] * B[0] + A[4] * B[3] + A[5] * B[6],
      A[3] * B[1] + A[4] * B[4] + A[5] * B[7],
      A[3] * B[2] + A[4] * B[5] + A[5] * B[8],
      A[6] * B[0] + A[7] * B[3] + A[8] * B[6],
      A[6] * B[1] + A[7] * B[4] + A[8] * B[7],
      A[6] * B[2] + A[7] * B[5] + A[8] * B[8],
    ],
  };
}

function applyMat(mat: Mat3, v: Pt3): Pt3 {
  const M = mat.m;
  return {
    x: M[0] * v.x + M[1] * v.y + M[2] * v.z,
    y: M[3] * v.x + M[4] * v.y + M[5] * v.z,
    z: M[6] * v.x + M[7] * v.y + M[8] * v.z,
  };
}

function addPt(a: Pt3, b: Pt3): Pt3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function computeSkeleton3D(move: ExerciseMoveStep, phase01: number) {
  const pose = evaluateMovementPose(move.archetype, phase01);
  const j = pose.joints;

  const rHips = eulerXYZ(j.hips);
  const pHips: Pt3 = {
    x: pose.hipsPosOffset[0],
    y: 0.92 + pose.hipsPosOffset[1],
    z: pose.hipsPosOffset[2],
  };

  const rSpine = mulMat(rHips, eulerXYZ(j.spine));
  const pSpine = addPt(pHips, applyMat(rHips, { x: 0, y: 0.1, z: 0 }));

  const rChest = mulMat(rSpine, eulerXYZ(j.chest));
  const pChest = addPt(pSpine, applyMat(rSpine, { x: 0, y: 0.2, z: 0 }));

  const rNeck = mulMat(rChest, eulerXYZ(j.neck));
  const pNeck = addPt(pChest, applyMat(rChest, { x: 0, y: 0.24, z: 0 }));
  const pHead = addPt(pNeck, applyMat(rNeck, { x: 0, y: 0.15, z: 0 }));
  const pVisor = addPt(pNeck, applyMat(rNeck, { x: 0, y: 0.16, z: 0.08 }));

  const rShL = mulMat(rChest, eulerXYZ(j.shoulderL));
  const pShL = addPt(pChest, applyMat(rChest, { x: 0.19, y: 0.18, z: 0 }));
  const rElL = mulMat(rShL, eulerXYZ(j.elbowL));
  const pElL = addPt(pShL, applyMat(rShL, { x: 0, y: -0.27, z: 0 }));
  const pHandL = addPt(pElL, applyMat(rElL, { x: 0, y: -0.25, z: 0 }));

  const rShR = mulMat(rChest, eulerXYZ(j.shoulderR));
  const pShR = addPt(pChest, applyMat(rChest, { x: -0.19, y: 0.18, z: 0 }));
  const rElR = mulMat(rShR, eulerXYZ(j.elbowR));
  const pElR = addPt(pShR, applyMat(rShR, { x: 0, y: -0.27, z: 0 }));
  const pHandR = addPt(pElR, applyMat(rElR, { x: 0, y: -0.25, z: 0 }));

  const rHipL = mulMat(rHips, eulerXYZ(j.hipL));
  const pHipL = addPt(pHips, applyMat(rHips, { x: 0.095, y: -0.05, z: 0 }));
  const rKneeL = mulMat(rHipL, eulerXYZ(j.kneeL));
  const pKneeL = addPt(pHipL, applyMat(rHipL, { x: 0, y: -0.39, z: 0 }));
  const rAnkleL = mulMat(rKneeL, eulerXYZ(j.ankleL));
  const pAnkleL = addPt(pKneeL, applyMat(rKneeL, { x: 0, y: -0.38, z: 0 }));
  const pToeL = addPt(pAnkleL, applyMat(rAnkleL, { x: 0, y: -0.04, z: 0.13 }));

  const rHipR = mulMat(rHips, eulerXYZ(j.hipR));
  const pHipR = addPt(pHips, applyMat(rHips, { x: -0.095, y: -0.05, z: 0 }));
  const rKneeR = mulMat(rHipR, eulerXYZ(j.kneeR));
  const pKneeR = addPt(pHipR, applyMat(rHipR, { x: 0, y: -0.39, z: 0 }));
  const rAnkleR = mulMat(rKneeR, eulerXYZ(j.ankleR));
  const pAnkleR = addPt(pKneeR, applyMat(rKneeR, { x: 0, y: -0.38, z: 0 }));
  const pToeR = addPt(pAnkleR, applyMat(rAnkleR, { x: 0, y: -0.04, z: 0.13 }));

  const allPts = [
    pHips,
    pSpine,
    pChest,
    pNeck,
    pHead,
    pVisor,
    pShL,
    pElL,
    pHandL,
    pShR,
    pElR,
    pHandR,
    pHipL,
    pKneeL,
    pAnkleL,
    pToeL,
    pHipR,
    pKneeR,
    pAnkleR,
    pToeR,
  ];

  // Auto-grounding identique au coach 3D
  let dy = 0;
  if (pose.groundMode === "hanging") {
    const handMidY = (pHandL.y + pHandR.y) * 0.5;
    dy = 1.72 - handMidY;
  } else if (pose.groundMode === "dip_bars") {
    const handMidY = (pHandL.y + pHandR.y) * 0.5;
    dy = 1.04 - handMidY;
  } else if (pose.groundMode === "seated") {
    if (move.archetype === "dumbbell_bench_press") {
      dy = 0.56 - pHips.y;
    } else if (move.archetype === "rowing_ergometer") {
      dy = 0.44 - pHips.y;
    } else if (move.archetype === "cycling_cadence") {
      dy = 0.72 - pHips.y;
    } else {
      dy = 0.52 - pHips.y;
    }
  } else {
    const contactMin = Math.min(
      pAnkleL.y - 0.04,
      pAnkleR.y - 0.04,
      pToeL.y,
      pToeR.y,
      pKneeL.y - 0.04,
      pKneeR.y - 0.04,
      pHandL.y - 0.03,
      pHandR.y - 0.03,
      pChest.y - 0.12,
      pHips.y - 0.09
    );
    dy = -contactMin + pose.liftY;
  }

  for (const pt of allPts) {
    pt.y += dy;
  }

  return {
    pose,
    pHips,
    pSpine,
    pChest,
    pNeck,
    pHead,
    pVisor,
    pShL,
    pElL,
    pHandL,
    pShR,
    pElR,
    pHandR,
    pHipL,
    pKneeL,
    pAnkleL,
    pToeL,
    pHipR,
    pKneeR,
    pAnkleR,
    pToeR,
  };
}

function getYawRad(preset: CameraViewPreset): number {
  switch (preset) {
    case "front":
      return 0.24;
    case "side_profile":
      return 1.38;
    case "floor_low":
      return 0.95;
    default:
      return 0.68;
  }
}

function projectPoint(
  pt: Pt3,
  yaw: number,
  pitch: number,
  scale: number,
  cx: number,
  baseY: number
): { sx: number; sy: number; depth: number } {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);

  const x1 = pt.x * cy - pt.z * sy;
  const z1 = pt.x * sy + pt.z * cy;
  const y2 = pt.y * cp - z1 * sp;
  const z2 = pt.y * sp + z1 * cp;

  return {
    sx: cx + x1 * scale,
    sy: baseY - y2 * scale,
    depth: z2,
  };
}

function segmentColor(
  muscles: MuscleGroupId[],
  primary: MuscleGroupId[],
  secondary: MuscleGroupId[],
  contraction: number
): string {
  if (muscles.some((m) => primary.includes(m))) {
    return contraction > 0.65 ? "#fb7185" : "#34d399";
  }
  if (muscles.some((m) => secondary.includes(m))) {
    return "#38bdf8";
  }
  return "#cbd5e1";
}

export interface MiniExerciseAvatarProps {
  exerciseId: string;
  moveOverride?: ExerciseMoveStep;
  size?: number;
  className?: string;
}

export function MiniExerciseAvatar({
  exerciseId,
  moveOverride,
  size = 76,
  className = "",
}: MiniExerciseAvatarProps) {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [phase01, setPhase01] = useState(0.45);

  const move = useMemo(() => {
    if (moveOverride) return moveOverride;
    const found = EXERCISES_COMPENDIUM.find((e) => e.id === exerciseId);
    const spec = getExerciseVisualSpec(
      found ?? { id: exerciseId, title: exerciseId, category: "strength_tone" }
    );
    return spec.movements[0];
  }, [exerciseId, moveOverride]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        setVisible(entries.some((entry) => entry.isIntersecting));
      },
      { rootMargin: "120px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || prefersReduced) return;
    let raf = 0;
    const start = performance.now();
    const cycleMs = Math.max(650, move.cycleSeconds * 1000);
    let lastDraw = 0;

    const loop = (now: number) => {
      if (now - lastDraw >= 32) {
        lastDraw = now;
        setPhase01(((now - start) % cycleMs) / cycleMs);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [visible, prefersReduced, move.cycleSeconds]);

  const sk = useMemo(() => computeSkeleton3D(move, phase01), [move, phase01]);

  const vb = 120;
  const scale = move.archetype === "swimming_crawl" ? 36 : 44;
  const cx = 60;
  const baseY = move.archetype === "swimming_crawl" ? 96 : 104;
  const yaw = getYawRad(move.defaultCamera);
  const pitch = 0.14;

  const P = (pt: Pt3) => projectPoint(pt, yaw, pitch, scale, cx, baseY);

  const hips = P(sk.pHips);
  const spine = P(sk.pSpine);
  const chest = P(sk.pChest);
  const head = P(sk.pHead);
  const visor = P(sk.pVisor);
  const shL = P(sk.pShL);
  const elL = P(sk.pElL);
  const handL = P(sk.pHandL);
  const shR = P(sk.pShR);
  const elR = P(sk.pElR);
  const handR = P(sk.pHandR);
  const hipL = P(sk.pHipL);
  const kneeL = P(sk.pKneeL);
  const ankleL = P(sk.pAnkleL);
  const toeL = P(sk.pToeL);
  const hipR = P(sk.pHipR);
  const kneeR = P(sk.pKneeR);
  const ankleR = P(sk.pAnkleR);
  const toeR = P(sk.pToeR);

  const c = sk.pose.contraction01;
  const torsoCol = segmentColor(
    ["chest", "abs_core", "lats", "upper_back", "lower_back", "obliques"],
    move.primaryMuscles,
    move.secondaryMuscles,
    c
  );
  const armCol = segmentColor(
    ["shoulders", "biceps", "triceps", "forearms"],
    move.primaryMuscles,
    move.secondaryMuscles,
    c
  );
  const thighCol = segmentColor(
    ["quads", "hamstrings", "glutes", "hip_flexors"],
    move.primaryMuscles,
    move.secondaryMuscles,
    c
  );
  const calfCol = segmentColor(
    ["calves"],
    move.primaryMuscles,
    move.secondaryMuscles,
    c
  );

  const propRender = renderMiniProp(move.prop, {
    handL,
    handR,
    chest,
    hips,
    ankleL,
    ankleR,
    phase01,
    baseY,
    cx,
    scale,
  });

  // Tri simplifié par profondeur pour éviter que l'arrière-bras écrase le torse
  const parts = [
    {
      depth: (shR.depth + handR.depth) * 0.5,
      node: (
        <g key="armR" stroke={armCol} strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1={shR.sx} y1={shR.sy} x2={elR.sx} y2={elR.sy} />
          <line x1={elR.sx} y1={elR.sy} x2={handR.sx} y2={handR.sy} />
        </g>
      ),
    },
    {
      depth: (hipR.depth + ankleR.depth) * 0.5,
      node: (
        <g key="legR" strokeLinecap="round" strokeLinejoin="round">
          <line x1={hipR.sx} y1={hipR.sy} x2={kneeR.sx} y2={kneeR.sy} stroke={thighCol} strokeWidth="6.4" />
          <line x1={kneeR.sx} y1={kneeR.sy} x2={ankleR.sx} y2={ankleR.sy} stroke={calfCol} strokeWidth="5.4" />
          <line x1={ankleR.sx} y1={ankleR.sy} x2={toeR.sx} y2={toeR.sy} stroke="#e2e8f0" strokeWidth="4.2" />
        </g>
      ),
    },
    {
      depth: (hips.depth + chest.depth) * 0.5,
      node: (
        <g key="torso">
          <line x1={hips.sx} y1={hips.sy} x2={spine.sx} y2={spine.sy} stroke={torsoCol} strokeWidth="9" strokeLinecap="round" />
          <line x1={spine.sx} y1={spine.sy} x2={chest.sx} y2={chest.sy} stroke={torsoCol} strokeWidth="11.5" strokeLinecap="round" />
          <line x1={shL.sx} y1={shL.sy} x2={shR.sx} y2={shR.sy} stroke={torsoCol} strokeWidth="6" strokeLinecap="round" />
          <circle cx={head.sx} cy={head.sy} r="7.5" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.2" />
          <circle cx={visor.sx} cy={visor.sy} r="2.2" fill="#38bdf8" />
        </g>
      ),
    },
    {
      depth: (hipL.depth + ankleL.depth) * 0.5,
      node: (
        <g key="legL" strokeLinecap="round" strokeLinejoin="round">
          <line x1={hipL.sx} y1={hipL.sy} x2={kneeL.sx} y2={kneeL.sy} stroke={thighCol} strokeWidth="6.4" />
          <line x1={kneeL.sx} y1={kneeL.sy} x2={ankleL.sx} y2={ankleL.sy} stroke={calfCol} strokeWidth="5.4" />
          <line x1={ankleL.sx} y1={ankleL.sy} x2={toeL.sx} y2={toeL.sy} stroke="#e2e8f0" strokeWidth="4.2" />
        </g>
      ),
    },
    {
      depth: (shL.depth + handL.depth) * 0.5,
      node: (
        <g key="armL" stroke={armCol} strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1={shL.sx} y1={shL.sy} x2={elL.sx} y2={elL.sy} />
          <line x1={elL.sx} y1={elL.sy} x2={handL.sx} y2={handL.sy} />
        </g>
      ),
    },
  ].sort((a, b) => a.depth - b.depth);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size }}
      className={`vp-keep-dark relative shrink-0 overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/35 shadow-inner ${className}`}
      aria-label={`Animation du mouvement : ${move.labelFr}`}
    >
      <svg viewBox={`0 0 ${vb} ${vb}`} className="h-full w-full">
        <defs>
          <radialGradient id="vp-floor-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={cx} cy={baseY + 2} rx="42" ry="7" fill="url(#vp-floor-glow)" />
        <line x1="16" y1={baseY + 2} x2={vb - 16} y2={baseY + 2} stroke="#334155" strokeWidth="1.2" />
        {propRender}
        {parts.map((p) => p.node)}
      </svg>
    </div>
  );
}

function renderMiniProp(
  prop: CoachPropType,
  ctx: {
    handL: { sx: number; sy: number };
    handR: { sx: number; sy: number };
    chest: { sx: number; sy: number };
    hips: { sx: number; sy: number };
    ankleL: { sx: number; sy: number };
    ankleR: { sx: number; sy: number };
    phase01: number;
    baseY: number;
    cx: number;
    scale: number;
  }
) {
  switch (prop) {
    case "dumbbells":
    case "bench_dumbbells":
      return (
        <g>
          {prop === "bench_dumbbells" && (
            <line
              x1={ctx.hips.sx - 24}
              y1={ctx.hips.sy + 6}
              x2={ctx.chest.sx + 20}
              y2={ctx.chest.sy + 8}
              stroke="#475569"
              strokeWidth="6"
              strokeLinecap="round"
            />
          )}
          <circle cx={ctx.handL.sx} cy={ctx.handL.sy} r="4.2" fill="#f59e0b" />
          <circle cx={ctx.handR.sx} cy={ctx.handR.sy} r="4.2" fill="#f59e0b" />
        </g>
      );
    case "barbell": {
      const dx = ctx.handL.sx - ctx.handR.sx;
      const dy = ctx.handL.sy - ctx.handR.sy;
      const len = Math.max(1, Math.hypot(dx, dy));
      const ux = (dx / len) * 14;
      const uy = (dy / len) * 14;
      return (
        <g>
          <line
            x1={ctx.handR.sx - ux}
            y1={ctx.handR.sy - uy}
            x2={ctx.handL.sx + ux}
            y2={ctx.handL.sy + uy}
            stroke="#94a3b8"
            strokeWidth="3"
          />
          <circle cx={ctx.handR.sx - ux} cy={ctx.handR.sy - uy} r="5.5" fill="#f59e0b" />
          <circle cx={ctx.handL.sx + ux} cy={ctx.handL.sy + uy} r="5.5" fill="#f59e0b" />
        </g>
      );
    }
    case "pullup_bar": {
      const barY = Math.min(ctx.handL.sy, ctx.handR.sy) - 2;
      return (
        <g stroke="#64748b" strokeWidth="3.2" strokeLinecap="round">
          <line x1="18" y1={barY} x2="102" y2={barY} />
          <line x1="20" y1={barY} x2="20" y2={ctx.baseY + 2} strokeWidth="2" />
          <line x1="100" y1={barY} x2="100" y2={ctx.baseY + 2} strokeWidth="2" />
        </g>
      );
    }
    case "dip_bars": {
      const barY = (ctx.handL.sy + ctx.handR.sy) * 0.5 + 3;
      return (
        <g stroke="#64748b" strokeWidth="3" strokeLinecap="round">
          <line x1="22" y1={barY} x2="98" y2={barY} />
          <line x1="26" y1={barY} x2="26" y2={ctx.baseY + 2} strokeWidth="2" />
          <line x1="94" y1={barY} x2="94" y2={ctx.baseY + 2} strokeWidth="2" />
        </g>
      );
    }
    case "bike":
      return (
        <g stroke="#38bdf8" strokeWidth="2" fill="none" opacity="0.65">
          <circle cx="38" cy={ctx.baseY - 12} r="13" />
          <circle cx="84" cy={ctx.baseY - 12} r="13" />
          <line x1="38" y1={ctx.baseY - 12} x2="62" y2={ctx.baseY - 18} />
          <line x1="62" y1={ctx.baseY - 18} x2="84" y2={ctx.baseY - 12} />
        </g>
      );
    case "rower":
      return (
        <g stroke="#64748b" strokeWidth="2.5">
          <line x1="20" y1={ctx.baseY - 8} x2="98" y2={ctx.baseY - 8} />
          <circle cx="94" cy={ctx.baseY - 18} r="10" fill="none" stroke="#38bdf8" />
        </g>
      );
    case "jump_rope": {
      const arc = Math.sin(ctx.phase01 * Math.PI * 2);
      const midY = ctx.hips.sy + arc * 42;
      return (
        <path
          d={`M ${ctx.handR.sx} ${ctx.handR.sy} Q 60 ${midY} ${ctx.handL.sx} ${ctx.handL.sy}`}
          fill="none"
          stroke="#fbbf24"
          strokeWidth="1.8"
          strokeDasharray="3 2"
        />
      );
    }
    case "punching_bag":
      return (
        <g>
          <line x1="90" y1="8" x2="90" y2="30" stroke="#64748b" strokeWidth="2" />
          <rect x="82" y="28" width="16" height="44" rx="7" fill="#dc2626" opacity="0.75" />
        </g>
      );
    case "stairs":
      return (
        <polyline
          points={`16,${ctx.baseY} 48,${ctx.baseY} 48,${ctx.baseY - 12} 72,${ctx.baseY - 12} 72,${ctx.baseY - 24} 104,${ctx.baseY - 24}`}
          fill="none"
          stroke="#475569"
          strokeWidth="3"
        />
      );
    case "yoga_mat":
      return (
        <rect x="16" y={ctx.baseY - 2} width="88" height="4" rx="2" fill="#0d9488" opacity="0.65" />
      );
    case "pool_water":
      return (
        <path
          d={`M 10 ${ctx.baseY - 22} Q 35 ${ctx.baseY - 26} 60 ${ctx.baseY - 22} T 110 ${ctx.baseY - 22}`}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.5"
          opacity="0.7"
        />
      );
    case "chair":
      return (
        <g stroke="#64748b" strokeWidth="2.5" strokeLinecap="round">
          <line x1="36" y1={ctx.baseY - 20} x2="68" y2={ctx.baseY - 20} />
          <line x1="40" y1={ctx.baseY - 20} x2="40" y2={ctx.baseY} />
          <line x1="64" y1={ctx.baseY - 20} x2="64" y2={ctx.baseY} />
        </g>
      );
    case "wall":
      return <rect x="92" y="16" width="8" height={ctx.baseY - 14} fill="#334155" rx="2" />;
    case "kettlebell":
      return <circle cx={ctx.handL.sx} cy={ctx.handL.sy + 4} r="5.5" fill="#10b981" />;
    case "racket":
      return (
        <g stroke="#f59e0b" strokeWidth="2">
          <line x1={ctx.handR.sx} y1={ctx.handR.sy} x2={ctx.handR.sx + 10} y2={ctx.handR.sy - 14} />
          <ellipse cx={ctx.handR.sx + 13} cy={ctx.handR.sy - 19} rx="5" ry="7" fill="none" />
        </g>
      );
    case "soccer_ball":
      return <circle cx="84" cy={ctx.baseY - 5} r="5" fill="#f8fafc" stroke="#0f172a" strokeWidth="1" />;
    case "basketball":
      return <circle cx={ctx.handR.sx} cy={ctx.handR.sy - 5} r="5.5" fill="#ea580c" />;
    case "climbing_wall":
      return (
        <g>
          <line x1="88" y1="10" x2="88" y2={ctx.baseY} stroke="#475569" strokeWidth="6" />
          <circle cx="85" cy="30" r="2.5" fill="#10b981" />
          <circle cx="85" cy="54" r="2.5" fill="#f59e0b" />
          <circle cx="85" cy="78" r="2.5" fill="#fb7185" />
        </g>
      );
    case "backpack_poles":
      return (
        <g stroke="#94a3b8" strokeWidth="1.6">
          <line x1={ctx.handL.sx} y1={ctx.handL.sy} x2={ctx.handL.sx + 6} y2={ctx.baseY} />
          <line x1={ctx.handR.sx} y1={ctx.handR.sy} x2={ctx.handR.sx + 6} y2={ctx.baseY} />
        </g>
      );
    default:
      return null;
  }
}
