"use client";

import React from "react";
import { MUSCLE_LABELS_FR } from "@/lib/exercise-biomechanics";
import { MuscleGroupId } from "@/types/vitalpulse";

export interface AnatomicalMuscleMapProps {
  primaryMuscles: MuscleGroupId[];
  secondaryMuscles: MuscleGroupId[];
}

export function AnatomicalMuscleMap({
  primaryMuscles,
  secondaryMuscles,
}: AnatomicalMuscleMapProps) {
  const fillFor = (id: MuscleGroupId): string => {
    if (primaryMuscles.includes(id)) return "#10b981";
    if (secondaryMuscles.includes(id)) return "#38bdf8";
    return "#1e293b";
  };

  const opacityFor = (id: MuscleGroupId): number => {
    if (primaryMuscles.includes(id)) return 0.95;
    if (secondaryMuscles.includes(id)) return 0.72;
    return 0.65;
  };

  const strokeFor = (id: MuscleGroupId): string => {
    if (primaryMuscles.includes(id)) return "#34d399";
    if (secondaryMuscles.includes(id)) return "#7dd3fc";
    return "#334155";
  };

  const renderZone = (
    id: MuscleGroupId,
    d: string,
    extraClass = ""
  ) => (
    <path
      d={d}
      fill={fillFor(id)}
      fillOpacity={opacityFor(id)}
      stroke={strokeFor(id)}
      strokeWidth="1.2"
      className={extraClass}
    >
      <title>{MUSCLE_LABELS_FR[id]}</title>
    </path>
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3.5 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* VUE ANTÉRIEURE */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-2 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
            Vue Antérieure
          </p>
          <svg viewBox="0 0 140 250" className="mx-auto h-48 w-auto">
            {/* Silhouette tête + squelette neutre */}
            <ellipse cx="70" cy="22" rx="13" ry="15" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />
            <rect x="64" y="36" width="12" height="10" rx="4" fill="#1e293b" />

            {/* Trapèzes avant & cou */}
            {renderZone("neck_traps", "M54,43 L64,39 L76,39 L86,43 L78,49 L62,49 Z")}

            {/* Épaules (Deltoïdes) */}
            {renderZone("shoulders", "M40,51 Q47,43 55,47 L53,64 Q44,65 39,58 Z")}
            {renderZone("shoulders", "M100,51 Q93,43 85,47 L87,64 Q96,65 101,58 Z")}

            {/* Pectoraux */}
            {renderZone("chest", "M54,49 L69,50 L69,73 Q57,74 52,66 Z")}
            {renderZone("chest", "M86,49 L71,50 L71,73 Q83,74 88,66 Z")}

            {/* Indicateur Cardio / Cœur */}
            {primaryMuscles.includes("cardio_heart") || secondaryMuscles.includes("cardio_heart") ? (
              <circle
                cx="75"
                cy="60"
                r="6.5"
                fill={primaryMuscles.includes("cardio_heart") ? "#fb7185" : "#38bdf8"}
                stroke="#fff1f2"
                strokeWidth="1.2"
              >
                <title>Cardio &amp; Souffle</title>
              </circle>
            ) : null}

            {/* Biceps */}
            {renderZone("biceps", "M38,61 Q44,61 48,66 L46,88 Q40,89 36,83 Z")}
            {renderZone("biceps", "M102,61 Q96,61 92,66 L94,88 Q100,89 104,83 Z")}

            {/* Avant-bras */}
            {renderZone("forearms", "M35,88 L45,89 L42,118 L32,116 Z")}
            {renderZone("forearms", "M105,88 L95,89 L98,118 L108,116 Z")}

            {/* Sangle abdominale */}
            {renderZone("abs_core", "M59,75 L81,75 L79,116 L61,116 Z")}

            {/* Obliques */}
            {renderZone("obliques", "M51,72 L59,75 L60,114 L52,110 Z")}
            {renderZone("obliques", "M89,72 L81,75 L80,114 L88,110 Z")}

            {/* Psoas / Fléchisseurs hanche */}
            {renderZone("hip_flexors", "M54,114 L67,118 L63,131 L50,126 Z")}
            {renderZone("hip_flexors", "M86,114 L73,118 L77,131 L90,126 Z")}

            {/* Quadriceps */}
            {renderZone("quads", "M49,128 L66,131 L63,178 L47,175 Z")}
            {renderZone("quads", "M91,128 L74,131 L77,178 L93,175 Z")}

            {/* Tibias / Pieds neutres + mollets visibles côté */}
            <path d="M48,180 L62,180 L59,224 L49,224 Z" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <path d="M92,180 L78,180 L81,224 L91,224 Z" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            {renderZone("calves", "M45,185 L49,185 L49,212 L44,205 Z")}
            {renderZone("calves", "M95,185 L91,185 L91,212 L96,205 Z")}

            {/* Pieds */}
            <ellipse cx="53" cy="231" rx="7" ry="4" fill="#334155" />
            <ellipse cx="87" cy="231" rx="7" ry="4" fill="#334155" />
          </svg>
        </div>

        {/* VUE POSTÉRIEURE (DOS) */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-2 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
            Vue Postérieure (Dos)
          </p>
          <svg viewBox="0 0 140 250" className="mx-auto h-48 w-auto">
            <ellipse cx="70" cy="22" rx="13" ry="15" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />

            {/* Nuque & Trapèzes */}
            {renderZone("neck_traps", "M54,43 L70,36 L86,43 L78,62 L62,62 Z")}

            {/* Épaules arrière */}
            {renderZone("shoulders", "M40,51 Q47,43 55,47 L53,64 Q44,65 39,58 Z")}
            {renderZone("shoulders", "M100,51 Q93,43 85,47 L87,64 Q96,65 101,58 Z")}

            {/* Haut du dos / Rhomboïdes */}
            {renderZone("upper_back", "M54,49 L86,49 L82,74 L58,74 Z")}

            {/* Grand dorsal */}
            {renderZone("lats", "M51,66 L68,75 L64,100 L53,94 Z")}
            {renderZone("lats", "M89,66 L72,75 L76,100 L87,94 Z")}

            {/* Lombaires */}
            {renderZone("lower_back", "M60,96 L80,96 L82,116 L58,116 Z")}

            {/* Triceps */}
            {renderZone("triceps", "M38,61 Q44,61 48,66 L46,88 Q40,89 36,83 Z")}
            {renderZone("triceps", "M102,61 Q96,61 92,66 L94,88 Q100,89 104,83 Z")}

            {/* Avant-bras */}
            {renderZone("forearms", "M35,88 L45,89 L42,118 L32,116 Z")}
            {renderZone("forearms", "M105,88 L95,89 L98,118 L108,116 Z")}

            {/* Fessiers */}
            {renderZone("glutes", "M50,114 Q60,111 69,117 L68,139 Q54,141 48,130 Z")}
            {renderZone("glutes", "M90,114 Q80,111 71,117 L72,139 Q86,141 92,130 Z")}

            {/* Ischio-jambiers */}
            {renderZone("hamstrings", "M49,140 L67,140 L64,179 L48,176 Z")}
            {renderZone("hamstrings", "M91,140 L73,140 L76,179 L92,176 Z")}

            {/* Mollets */}
            {renderZone("calves", "M48,183 Q55,179 62,184 L59,216 L50,216 Z")}
            {renderZone("calves", "M92,183 Q85,179 78,184 L81,216 L90,216 Z")}

            {/* Chevilles & Pieds */}
            <path d="M51,216 L58,216 L57,228 L51,228 Z" fill="#1e293b" />
            <path d="M89,216 L82,216 L83,228 L89,228 Z" fill="#1e293b" />
            <ellipse cx="54" cy="232" rx="6" ry="3.5" fill="#334155" />
            <ellipse cx="86" cy="232" rx="6" ry="3.5" fill="#334155" />
          </svg>
        </div>
      </div>

      {/* Légende Muscles Principaux vs Secondaires */}
      <div className="space-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 mr-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            Principaux :
          </span>
          {primaryMuscles.map((m) => (
            <span
              key={m}
              className="rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200"
            >
              {MUSCLE_LABELS_FR[m]}
            </span>
          ))}
        </div>

        {secondaryMuscles.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-300 mr-1">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
              Stabilisateurs :
            </span>
            {secondaryMuscles.map((m) => (
              <span
                key={m}
                className="rounded-lg border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-200"
              >
                {MUSCLE_LABELS_FR[m]}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
