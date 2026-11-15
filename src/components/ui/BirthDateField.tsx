"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import {
  computeAgeFromBirthDate,
  formatBirthDateFr,
  isValidBirthDateIso,
} from "@/lib/metabolic-engine";

const MONTHS_FR = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
];

function daysInMonth(year: number, month: number): number {
  if (!year || !month) return 31;
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function splitIsoParts(birthDate?: string): { day: string; month: string; year: string } {
  if (!isValidBirthDateIso(birthDate)) {
    return { day: "", month: "", year: "" };
  }
  const [y, m, d] = birthDate.trim().split("-");
  return {
    day: String(Number(d)),
    month: String(Number(m)),
    year: String(Number(y)),
  };
}

export interface BirthDateFieldProps {
  birthDate?: string;
  age: number;
  onChange: (next: { birthDate?: string; age: number }) => void;
  compact?: boolean;
}

export function BirthDateField({
  birthDate,
  age,
  onChange,
  compact = false,
}: BirthDateFieldProps) {
  const [manualAgeOnly, setManualAgeOnly] = useState<boolean>(false);
  const [ageDraft, setAgeDraft] = useState<string>(String(age || 34));
  const [parts, setParts] = useState<{ day: string; month: string; year: string }>(() =>
    splitIsoParts(birthDate)
  );
  const [dobError, setDobError] = useState<string | null>(null);

  useEffect(() => {
    setAgeDraft(String(age || 34));
  }, [age]);

  useEffect(() => {
    if (isValidBirthDateIso(birthDate)) {
      setParts(splitIsoParts(birthDate));
      setDobError(null);
    } else if (!birthDate) {
      setParts({ day: "", month: "", year: "" });
    }
  }, [birthDate]);

  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 105;
  const maxYear = currentYear - 12;

  const yearOptions = useMemo(() => {
    const out: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      out.push(y);
    }
    return out;
  }, [maxYear, minYear]);

  const maxDays = useMemo(() => {
    const y = Number(parts.year) || 2000;
    const m = Number(parts.month) || 1;
    return daysInMonth(y, m);
  }, [parts.year, parts.month]);

  const dayOptions = useMemo(() => {
    const out: number[] = [];
    for (let d = 1; d <= maxDays; d++) out.push(d);
    return out;
  }, [maxDays]);

  const computedAge = useMemo(() => {
    if (isValidBirthDateIso(birthDate)) {
      return computeAgeFromBirthDate(birthDate) ?? age;
    }
    return age;
  }, [birthDate, age]);

  const formattedDob = useMemo(() => formatBirthDateFr(birthDate), [birthDate]);

  function handleSelectPart(field: "day" | "month" | "year", value: string) {
    const next = { ...parts, [field]: value };
    if (next.day && next.month) {
      const yNum = Number(next.year) || 2000;
      const clampedDay = Math.min(Number(next.day), daysInMonth(yNum, Number(next.month)));
      next.day = String(clampedDay);
    }
    setParts(next);

    if (next.day && next.month && next.year) {
      const iso = `${next.year}-${pad2(Number(next.month))}-${pad2(Number(next.day))}`;
      const derivedAge = computeAgeFromBirthDate(iso);
      if (derivedAge === null || derivedAge < 12 || derivedAge > 105) {
        setDobError("Veuillez choisir une date valide (12 à 105 ans).");
        return;
      }
      setDobError(null);
      setAgeDraft(String(derivedAge));
      onChange({ birthDate: iso, age: derivedAge });
    } else if (!next.day && !next.month && !next.year) {
      setDobError(null);
      onChange({ birthDate: undefined, age });
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <Calendar className="h-3.5 w-3.5 text-emerald-400" />
          {manualAgeOnly ? "Âge (ans)" : "Date de naissance (âge auto)"}
        </span>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300 tabular-nums">
            {computedAge} ans{formattedDob && !manualAgeOnly ? " · auto" : ""}
          </span>
          <button
            type="button"
            onClick={() => {
              const nextManual = !manualAgeOnly;
              setManualAgeOnly(nextManual);
              setDobError(null);
              if (nextManual) {
                onChange({ birthDate: undefined, age: computedAge });
              }
            }}
            className="text-[11px] font-semibold text-slate-400 underline decoration-dotted underline-offset-2 hover:text-emerald-300"
          >
            {manualAgeOnly ? "Utiliser date de naissance" : "Saisir l'âge seul"}
          </button>
        </div>
      </div>

      {manualAgeOnly ? (
        <input
          type="text"
          inputMode="numeric"
          value={ageDraft}
          aria-label="Âge en années"
          onChange={(e) => {
            const clean = e.target.value.replace(/[^\d]/g, "");
            setAgeDraft(clean);
            const n = Number(clean);
            if (clean && Number.isFinite(n) && n >= 12 && n <= 105) {
              onChange({ birthDate: undefined, age: Math.round(n) });
            }
          }}
          onBlur={() => {
            const n = Number(ageDraft);
            const clamped = Number.isFinite(n) && ageDraft.trim()
              ? Math.max(12, Math.min(105, Math.round(n)))
              : age || 34;
            setAgeDraft(String(clamped));
            onChange({ birthDate: undefined, age: clamped });
          }}
          placeholder="34"
          className={`w-full rounded-xl border border-slate-700 bg-slate-950 px-3 ${
            compact ? "py-2" : "py-2.5"
          } text-sm text-white tabular-nums focus:border-emerald-400 focus:outline-none`}
        />
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          <select
            aria-label="Jour de naissance"
            value={parts.day}
            onChange={(e) => handleSelectPart("day", e.target.value)}
            className={`w-full rounded-xl border border-slate-700 bg-slate-950 px-2 ${
              compact ? "py-2" : "py-2.5"
            } text-sm text-white tabular-nums focus:border-emerald-400 focus:outline-none`}
          >
            <option value="">Jour</option>
            {dayOptions.map((d) => (
              <option key={d} value={String(d)}>
                {pad2(d)}
              </option>
            ))}
          </select>

          <select
            aria-label="Mois de naissance"
            value={parts.month}
            onChange={(e) => handleSelectPart("month", e.target.value)}
            className={`w-full rounded-xl border border-slate-700 bg-slate-950 px-2 ${
              compact ? "py-2" : "py-2.5"
            } text-sm text-white focus:border-emerald-400 focus:outline-none`}
          >
            <option value="">Mois</option>
            {MONTHS_FR.map((m) => (
              <option key={m.value} value={String(m.value)}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Année de naissance"
            value={parts.year}
            onChange={(e) => handleSelectPart("year", e.target.value)}
            className={`w-full rounded-xl border border-slate-700 bg-slate-950 px-2 ${
              compact ? "py-2" : "py-2.5"
            } text-sm text-white tabular-nums focus:border-emerald-400 focus:outline-none`}
          >
            <option value="">Année</option>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      {dobError && <p className="text-[11px] font-medium text-rose-400">{dobError}</p>}
      {!dobError && !manualAgeOnly && !formattedDob && (
        <p className="text-[11px] text-slate-500">
          Votre âge se mettra à jour automatiquement chaque année ({age} ans par défaut tant que la date n&apos;est pas choisie).
        </p>
      )}
    </div>
  );
}
