"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Flame,
  Info,
  Scale,
  TrendingDown,
} from "lucide-react";
import {
  DailyEnergyBalance,
  ScaleDecoderInsight,
  WeightTrendPoint,
} from "@/types/vitalpulse";
import { InfoTip } from "@/components/ui/InfoTip";

interface EnergyActivityChartProps {
  balances: DailyEnergyBalance[];
  weightTrend: WeightTrendPoint[];
  scaleDecoder: ScaleDecoderInsight | null;
  currentWeightKg: number;
  currentWaistCm?: number;
  rangeDays: 7 | 14 | 30;
  onRangeChange: (days: 7 | 14 | 30) => void;
  onQuickLogWeight: (weightKg: number, waistCm?: number) => void;
}

export function EnergyActivityChart({
  balances,
  weightTrend,
  scaleDecoder,
  currentWeightKg,
  currentWaistCm,
  rangeDays,
  onRangeChange,
  onQuickLogWeight,
}: EnergyActivityChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(
    Math.max(0, balances.length - 1)
  );
  const [weightInput, setWeightInput] = useState(String(currentWeightKg));
  const [waistInput, setWaistInput] = useState(
    currentWaistCm ? String(currentWaistCm) : ""
  );
  const weightFocusedRef = useRef(false);
  const waistFocusedRef = useRef(false);

  useEffect(() => {
    if (!weightFocusedRef.current) {
      setWeightInput(String(currentWeightKg));
    }
  }, [currentWeightKg]);

  useEffect(() => {
    if (!waistFocusedRef.current) {
      setWaistInput(currentWaistCm ? String(currentWaistCm) : "");
    }
  }, [currentWaistCm]);

  const safeIdx = Math.min(selectedIndex, Math.max(0, balances.length - 1));
  const activeDay = balances[safeIdx];

  const maxKcal = Math.max(
    2600,
    ...balances.flatMap((b) => [b.intakeKcal, b.totalExpenditureKcal])
  );
  const maxActivityScore = Math.max(
    10000,
    ...balances.map((b) => b.rawSteps + b.workoutMinutes * 110)
  );

  const chartW = 680;
  const chartH = 220;
  const padL = 40;
  const padR = 16;
  const padT = 18;
  const padB = 34;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const slotW = balances.length > 0 ? plotW / balances.length : plotW;
  const barW = Math.max(6, Math.min(18, slotW * 0.32));

  const activityLinePoints = balances
    .map((b, i) => {
      const x = padL + i * slotW + slotW / 2;
      const score = b.rawSteps + b.workoutMinutes * 110;
      const y = padT + plotH - (score / maxActivityScore) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // Poids SVG
  const wPoints = weightTrend.slice(-rangeDays);
  const minW =
    wPoints.length > 0
      ? Math.floor(Math.min(...wPoints.flatMap((p) => [p.rawWeightKg, p.emaWeightKg])) - 1)
      : 60;
  const maxW =
    wPoints.length > 0
      ? Math.ceil(Math.max(...wPoints.flatMap((p) => [p.rawWeightKg, p.emaWeightKg])) + 1)
      : 90;
  const spanW = Math.max(2, maxW - minW);

  const wSvgW = 680;
  const wSvgH = 155;
  const wPlotW = wSvgW - 56;
  const wPlotH = wSvgH - 42;

  const emaPolyline = wPoints
    .map((p, i) => {
      const x =
        40 + (wPoints.length <= 1 ? wPlotW / 2 : (i / (wPoints.length - 1)) * wPlotW);
      const y = 14 + wPlotH - ((p.emaWeightKg - minW) / spanW) * wPlotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="space-y-4">
      {/* Graphique Activité + Calories ingérées vs Dépensées */}
      <div className="vp-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-emerald-400" />
              Activité physique &amp; Balance calorique / jour
            </h3>
            <p className="text-xs text-slate-400">
              Comparatif réel : Calories mangées vs Dépense totale (BMR <InfoTip term="bmr" /> + Pas dédupliqués <InfoTip term="neat_dedup" /> + Exercices + TEF <InfoTip term="tef" />)
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onRangeChange(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  rangeDays === d
                    ? "bg-emerald-500 text-slate-950 font-semibold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {d}j
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs mb-3">
          <span className="inline-flex items-center gap-1.5 text-amber-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
            Calories mangées
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            Calories brûlées (total)
          </span>
          <span className="inline-flex items-center gap-1.5 text-sky-300">
            <span className="w-4 h-0.5 bg-sky-400 inline-block" />
            Courbe activité (Pas + Exercices)
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className={`w-full h-56 select-none ${
              balances.length <= 14 ? "" : "min-w-[460px]"
            }`}
            role="img"
            aria-label="Graphique activité et calories par jour"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = padT + plotH * (1 - t);
              const val = Math.round(maxKcal * t);
              return (
                <g key={t}>
                  <line
                    x1={padL}
                    x2={chartW - padR}
                    y1={y}
                    y2={y}
                    stroke="var(--vp-chart-grid, rgba(148,163,184,0.12))"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padL - 6}
                    y={y + 4}
                    fill="var(--vp-chart-axis, #94a3b8)"
                    fontSize="10"
                    textAnchor="end"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {balances.map((b, i) => {
              const cx = padL + i * slotW + slotW / 2;
              const hIn = (b.intakeKcal / maxKcal) * plotH;
              const hOut = (b.totalExpenditureKcal / maxKcal) * plotH;
              const isSel = i === safeIdx;
              const label = b.dateKey.slice(5);
              return (
                <g
                  key={b.dateKey}
                  className="cursor-pointer"
                  onClick={() => setSelectedIndex(i)}
                >
                  <rect
                    x={padL + i * slotW + 2}
                    y={padT}
                    width={Math.max(4, slotW - 4)}
                    height={plotH}
                    rx={6}
                    fill={isSel ? "rgba(16,185,129,0.09)" : "transparent"}
                  />
                  <rect
                    x={cx - barW - 1.5}
                    y={padT + plotH - hIn}
                    width={barW}
                    height={Math.max(2, hIn)}
                    rx={3}
                    fill="#f59e0b"
                    opacity={isSel ? 1 : 0.8}
                  />
                  <rect
                    x={cx + 1.5}
                    y={padT + plotH - hOut}
                    width={barW}
                    height={Math.max(2, hOut)}
                    rx={3}
                    fill="#10b981"
                    opacity={isSel ? 1 : 0.8}
                  />
                  {(rangeDays <= 14 || i % 3 === 0 || isSel) && (
                    <text
                      x={cx}
                      y={chartH - 10}
                      fill={isSel ? "#34d399" : "#94a3b8"}
                      fontSize="10"
                      fontWeight={isSel ? "700" : "500"}
                      textAnchor="middle"
                    >
                      {label}
                    </text>
                  )}
                </g>
              );
            })}

            {balances.length > 1 && (
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={activityLinePoints}
              />
            )}
            {balances.map((b, i) => {
              const cx = padL + i * slotW + slotW / 2;
              const score = b.rawSteps + b.workoutMinutes * 110;
              const cy = padT + plotH - (score / maxActivityScore) * plotH;
              return (
                <circle
                  key={`pt-${b.dateKey}`}
                  cx={cx}
                  cy={cy}
                  r={i === safeIdx ? 5 : 3}
                  fill="#0284c7"
                  stroke="var(--vp-chart-dot-stroke, #0b1215)"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                  onClick={() => setSelectedIndex(i)}
                />
              );
            })}
          </svg>
        </div>

        {activeDay && (
          <div className="mt-3 rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block">Date inspectée</span>
              <strong className="text-white text-sm tabular-nums">{activeDay.dateKey}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Mangé (fourchette)</span>
              <strong className="text-amber-300 text-sm tabular-nums">
                {activeDay.intakeKcal} kcal
              </strong>
              <span className="block text-[11px] text-slate-400">
                ({activeDay.intakeMinKcal}–{activeDay.intakeMaxKcal})
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Dépense totale</span>
              <strong className="text-emerald-300 text-sm tabular-nums">
                {activeDay.totalExpenditureKcal} kcal
              </strong>
              <span className="block text-[11px] text-slate-400">
                Repos {activeDay.bmrKcal} + Act. {activeDay.netStepsKcal + activeDay.netWorkoutsKcal + activeDay.nonAmbulatoryNeatKcal} + TEF {activeDay.tefKcal}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">
                Bilan Net du Jour <InfoTip term="net_balance" />
              </span>
              <strong
                className={`text-sm tabular-nums inline-flex items-center gap-1 ${
                  activeDay.netBalanceKcal <= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {activeDay.netBalanceKcal <= 0 ? (
                  <ArrowDownRight className="w-4 h-4" />
                ) : (
                  <ArrowUpRight className="w-4 h-4" />
                )}
                {activeDay.netBalanceKcal > 0 ? `+${activeDay.netBalanceKcal}` : activeDay.netBalanceKcal} kcal
              </strong>
              <span className="block text-[11px] text-slate-400">
                {activeDay.netBalanceKcal <= 0 ? "Déficit énergétique" : "Surplus énergétique"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Pas &amp; Exercices</span>
              <strong className="text-sky-300 text-sm tabular-nums">
                {activeDay.rawSteps.toLocaleString("fr-FR")} pas · {activeDay.workoutMinutes} min
              </strong>
              {activeDay.overlapStepsDeducted > 0 && (
                <span className="block text-[11px] text-slate-400">
                  (-{activeDay.overlapStepsDeducted} pas déjà comptés en séance)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Courbe Poids Brut vs EMA 7j + Décodeur de Balance */}
      <div className="vp-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-sky-400" />
              Poids brut vs Tendance réelle lissée (EMA 7j)
              <InfoTip term="weight_ema" size="sm" />
            </h3>
            <p className="text-xs text-slate-400">
              Sépare les variations d&apos;eau quotidiennes de la vraie perte de masse grasse
            </p>
          </div>
          <form
            className="flex w-full sm:w-auto flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
              }
              weightFocusedRef.current = false;
              waistFocusedRef.current = false;
              const kg = parseFloat(weightInput.replace(",", "."));
              const waist = waistInput ? parseFloat(waistInput.replace(",", ".")) : undefined;
              if (!isNaN(kg) && kg >= 30 && kg <= 250) {
                const validWaist =
                  waist !== undefined && !isNaN(waist) && waist >= 42 && waist <= 190
                    ? +waist.toFixed(1)
                    : undefined;
                onQuickLogWeight(+kg.toFixed(1), validWaist);
              }
            }}
          >
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <input
                type="text"
                inputMode="decimal"
                value={weightInput}
                onFocus={() => {
                  weightFocusedRef.current = true;
                }}
                onBlur={() => {
                  weightFocusedRef.current = false;
                }}
                onChange={(e) => setWeightInput(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="Poids kg"
                aria-label="Nouveau poids en kg"
                className="w-full sm:w-28 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white tabular-nums"
              />
              <input
                type="text"
                inputMode="decimal"
                value={waistInput}
                onFocus={() => {
                  waistFocusedRef.current = true;
                }}
                onBlur={() => {
                  waistFocusedRef.current = false;
                }}
                onChange={(e) => setWaistInput(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="Taille cm"
                aria-label="Tour de taille en cm"
                className="w-full sm:w-28 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white tabular-nums"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition"
            >
              Noter pesée
            </button>
          </form>
        </div>

        {wPoints.length > 0 && (
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${wSvgW} ${wSvgH}`}
              className={`w-full h-40 select-none ${
                wPoints.length <= 14 ? "" : "min-w-[460px]"
              }`}
            >
              {[0, 0.5, 1].map((t) => {
                const y = 14 + wPlotH * (1 - t);
                const labelKg = (minW + spanW * t).toFixed(1);
                return (
                  <g key={t}>
                    <line
                      x1={40}
                      x2={wSvgW - 16}
                      y1={y}
                      y2={y}
                      stroke="var(--vp-chart-grid, rgba(148,163,184,0.12))"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={34}
                      y={y + 4}
                      fill="var(--vp-chart-axis, #94a3b8)"
                      fontSize="10"
                      textAnchor="end"
                    >
                      {labelKg}
                    </text>
                  </g>
                );
              })}
              {wPoints.length > 1 && (
                <polyline
                  fill="none"
                  stroke="var(--vp-chart-ema, #34d399)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  points={emaPolyline}
                />
              )}
              {wPoints.map((p, i) => {
                const x =
                  40 +
                  (wPoints.length <= 1 ? wPlotW / 2 : (i / (wPoints.length - 1)) * wPlotW);
                const yRaw = 14 + wPlotH - ((p.rawWeightKg - minW) / spanW) * wPlotH;
                const yEma = 14 + wPlotH - ((p.emaWeightKg - minW) / spanW) * wPlotH;
                return (
                  <g key={p.dateKey}>
                    <circle cx={x} cy={yRaw} r={4} fill="#0284c7" opacity={0.85} />
                    <circle
                      cx={x}
                      cy={yEma}
                      r={3.5}
                      fill="var(--vp-chart-ema, #34d399)"
                      stroke="var(--vp-chart-dot-stroke, #0b1215)"
                      strokeWidth="1.2"
                    />
                    {(wPoints.length <= 14 || i % 2 === 0) && (
                      <text
                        x={x}
                        y={wSvgH - 6}
                        fill="var(--vp-chart-axis, #94a3b8)"
                        fontSize="9.5"
                        textAnchor="middle"
                      >
                        {p.dateKey.slice(5)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {scaleDecoder && (
          <div
            className={`mt-3 rounded-xl p-3.5 border flex items-start gap-3 ${
              scaleDecoder.triggered
                ? "bg-sky-500/10 border-sky-400/30"
                : "bg-emerald-500/10 border-emerald-400/25"
            }`}
          >
            {scaleDecoder.triggered ? (
              <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            ) : (
              <TrendingDown className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs leading-relaxed">
              <p className="font-semibold text-white">
                {scaleDecoder.headlineFr} <InfoTip term="scale_decoder" />
              </p>
              <p className="text-slate-300 mt-1">{scaleDecoder.explanationFr}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
