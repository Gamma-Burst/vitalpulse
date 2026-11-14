"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpen, HelpCircle, Lightbulb, Search, Sparkles, Target, X } from "lucide-react";
import {
  GLOSSARY_CATEGORY_META,
  GLOSSARY_TERMS,
  getGlossaryEntry,
  searchGlossaryTerms,
  type GlossaryCategory,
  type GlossaryTermId,
} from "@/data/glossary-terms";
import { pushBackIntercept, triggerLightHaptic } from "@/lib/native-bridge";

type GlossaryModalState =
  | null
  | { mode: "term"; termId: GlossaryTermId }
  | { mode: "catalog"; initialQuery: string };

let currentState: GlossaryModalState = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

export function openGlossaryTerm(termId: GlossaryTermId): void {
  currentState = { mode: "term", termId };
  notifyListeners();
}

export function openGlossaryCatalog(initialQuery = ""): void {
  currentState = { mode: "catalog", initialQuery };
  notifyListeners();
}

export function closeGlossary(): void {
  if (currentState === null) return;
  currentState = null;
  notifyListeners();
}

export interface InfoTipProps {
  term: GlossaryTermId;
  size?: "xs" | "sm";
  className?: string;
}

/**
 * Pastille cliquable `?` (rendue en <span role="button"> pour pouvoir s'intégrer
 * sans erreur HTML ni propagation dans des tuiles <button> ou des <label>).
 */
export function InfoTip({ term, size = "xs", className = "" }: InfoTipProps) {
  const entry = GLOSSARY_TERMS[term];
  const dims = size === "sm" ? "h-[18px] w-[18px] text-[11px]" : "h-4 w-4 text-[10px]";

  function handleActivate(e: React.MouseEvent | React.KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();
    triggerLightHaptic();
    openGlossaryTerm(term);
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-label={`Explication : ${entry.titleFr}`}
      title={`Comprendre : ${entry.titleFr}`}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleActivate(e);
        }
      }}
      className={`ml-1 inline-flex shrink-0 cursor-pointer select-none items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/15 align-middle font-extrabold leading-none text-cyan-200 transition hover:scale-110 hover:border-cyan-300/70 hover:bg-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 active:scale-95 ${dims} ${className}`}
    >
      ?
    </span>
  );
}

const ALL_CATEGORIES: Array<{ id: GlossaryCategory | "all"; label: string }> = [
  { id: "all", label: "Tout" },
  { id: "poids_corps", label: GLOSSARY_CATEGORY_META.poids_corps.labelFr },
  { id: "energie_sport", label: GLOSSARY_CATEGORY_META.energie_sport.labelFr },
  { id: "nutrition_nova", label: GLOSSARY_CATEGORY_META.nutrition_nova.labelFr },
  { id: "jeune_metabolisme", label: GLOSSARY_CATEGORY_META.jeune_metabolisme.labelFr },
  { id: "bilan_sanguin", label: GLOSSARY_CATEGORY_META.bilan_sanguin.labelFr },
];

export function GlossaryPortalHost() {
  const titleId = useId();
  const shouldReduceMotion = useReducedMotion();
  const [modalState, setModalState] = useState<GlossaryModalState>(null);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<GlossaryCategory | "all">("all");
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setModalState(currentState);
    const sync = () => setModalState(currentState);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  useEffect(() => {
    if (modalState?.mode === "catalog") {
      setSearchQuery(modalState.initialQuery);
      setActiveCategory("all");
    }
  }, [modalState]);

  const isOpen = modalState !== null;

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const focusTimer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    // Phase capture (true) pour intercepter Échap AVANT DetailSheet en dessous
    const onCaptureKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        triggerLightHaptic();
        closeGlossary();
      }
    };
    window.addEventListener("keydown", onCaptureKeyDown, true);

    const popBack = pushBackIntercept(() => {
      triggerLightHaptic();
      closeGlossary();
      return true;
    });

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onCaptureKeyDown, true);
      popBack();
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  const activeEntry = useMemo(
    () => (modalState?.mode === "term" ? getGlossaryEntry(modalState.termId) : null),
    [modalState],
  );

  const catalogResults = useMemo(() => {
    if (modalState?.mode !== "catalog") return [];
    return searchGlossaryTerms(searchQuery, activeCategory);
  }, [modalState, searchQuery, activeCategory]);

  const totalTermCount = useMemo(() => Object.keys(GLOSSARY_TERMS).length, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {modalState ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <motion.button
            type="button"
            aria-label="Fermer l'explication"
            onClick={() => {
              triggerLightHaptic();
              closeGlossary();
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.1 : 0.18 }}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
          />

          <motion.div
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 24, scale: 0.97 }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 20, scale: 0.97 }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0.1 }
                : { type: "spring", stiffness: 380, damping: 32 }
            }
            className={`vp-sheet relative z-10 flex w-full flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl ${
              modalState.mode === "catalog"
                ? "max-h-[86dvh] sm:max-w-2xl"
                : "max-h-[84dvh] sm:max-w-lg"
            }`}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-500/15 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/35 bg-cyan-500/15 text-cyan-200">
                  {modalState.mode === "catalog" ? (
                    <BookOpen className="h-5 w-5" />
                  ) : (
                    <HelpCircle className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  {activeEntry ? (
                    <>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${GLOSSARY_CATEGORY_META[activeEntry.category].badgeClass}`}
                        >
                          {GLOSSARY_CATEGORY_META[activeEntry.category].labelFr}
                        </span>
                        <span className="text-[11px] font-medium text-cyan-200">
                          {activeEntry.shortTagFr}
                        </span>
                      </div>
                      <h2
                        id={titleId}
                        className="mt-1 font-display text-base font-bold leading-snug text-white sm:text-lg"
                      >
                        {activeEntry.titleFr}
                      </h2>
                    </>
                  ) : (
                    <>
                      <h2
                        id={titleId}
                        className="font-display text-lg font-bold tracking-tight text-white"
                      >
                        Lexique Santé sans jargon
                      </h2>
                      <p className="text-xs text-slate-300">
                        {totalTermCount} notions expliquées simplement avec exemples concrets
                      </p>
                    </>
                  )}
                </div>
              </div>

              <button
                ref={closeBtnRef}
                type="button"
                aria-label="Fermer la bulle d'information"
                onClick={() => {
                  triggerLightHaptic();
                  closeGlossary();
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-500/20 bg-slate-800/40 text-slate-300 transition hover:bg-slate-700/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalState.mode === "term" && activeEntry ? (
              <>
                <div className="space-y-3.5 overflow-y-auto px-5 py-4">
                  <div className="rounded-2xl border border-slate-500/15 bg-slate-900/60 p-4">
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-200">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>C&apos;est quoi concrètement ?</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-100">
                      {activeEntry.simpleFr}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3.5">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300">
                      <Lightbulb className="h-3.5 w-3.5" />
                      <span>Exemple parlant du quotidien</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-200">
                      {activeEntry.exampleFr}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-200">
                      <Target className="h-3.5 w-3.5" />
                      <span>Repère pratique dans FolloWeight</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-200">
                      {activeEntry.benchmarkFr}
                    </p>
                  </div>
                </div>

                <div className="vp-safe-pb flex flex-wrap items-center justify-between gap-2 border-t border-slate-500/15 px-5 py-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerLightHaptic();
                      openGlossaryCatalog("");
                    }}
                    className="rounded-xl px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/15"
                  >
                    Voir tout le lexique ({totalTermCount} termes) →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerLightHaptic();
                      closeGlossary();
                    }}
                    className="vp-keep-dark rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
                  >
                    J&apos;ai compris
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3 border-b border-slate-500/15 px-5 py-3.5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher : EMA, IMC, OMAD, cétogène, HOMA-IR, ferritine..."
                      className="w-full rounded-xl border border-slate-600/35 bg-slate-900/60 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          triggerLightHaptic();
                          setActiveCategory(cat.id);
                        }}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                          activeCategory === cat.id
                            ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                            : "border-slate-600/30 bg-slate-800/40 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="vp-safe-pb space-y-2.5 overflow-y-auto px-5 py-4">
                  {catalogResults.length === 0 ? (
                    <div className="rounded-2xl border border-slate-600/25 bg-slate-900/50 p-5 text-center text-sm text-slate-300">
                      Aucun terme trouvé pour &laquo;&nbsp;{searchQuery}&nbsp;&raquo;. Essayez un mot simple comme &laquo;&nbsp;poids&nbsp;&raquo;, &laquo;&nbsp;jeûne&nbsp;&raquo;, &laquo;&nbsp;cholestérol&nbsp;&raquo; ou &laquo;&nbsp;calories&nbsp;&raquo;.
                    </div>
                  ) : (
                    catalogResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          triggerLightHaptic();
                          openGlossaryTerm(item.id);
                        }}
                        className="w-full rounded-2xl border border-slate-500/15 bg-slate-900/60 p-3.5 text-left transition hover:border-cyan-400/45 hover:bg-slate-800/70"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${GLOSSARY_CATEGORY_META[item.category].badgeClass}`}
                              >
                                {GLOSSARY_CATEGORY_META[item.category].labelFr}
                              </span>
                              <span className="text-[11px] text-cyan-200">
                                {item.shortTagFr}
                              </span>
                            </div>
                            <div className="mt-1 font-display text-sm font-bold text-white">
                              {item.titleFr}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                            Lire →
                          </span>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-300">
                          {item.simpleFr}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
