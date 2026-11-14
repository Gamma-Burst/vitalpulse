"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import { X } from "lucide-react";
import { pushBackIntercept, triggerLightHaptic } from "@/lib/native-bridge";

export interface DetailSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  size?: "md" | "lg" | "xl";
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<DetailSheetProps["size"]>, string> = {
  md: "lg:max-w-lg",
  lg: "lg:max-w-2xl",
  xl: "lg:max-w-3xl",
};

export function DetailSheet({
  open,
  onClose,
  title,
  subtitle,
  badge,
  icon,
  size = "lg",
  footer,
  children,
}: DetailSheetProps) {
  const titleId = useId();
  const shouldReduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 60);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        triggerLightHaptic();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    const popBack = pushBackIntercept(() => {
      triggerLightHaptic();
      onClose();
      return true;
    });

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      popBack();
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    if (info.offset.y > 90 || info.velocity.y > 500) {
      triggerLightHaptic();
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center lg:items-stretch lg:justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <motion.button
            type="button"
            aria-label="Fermer le panneau"
            onClick={() => {
              triggerLightHaptic();
              onClose();
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.12 : 0.22 }}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
          />

          <motion.div
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : isDesktop
                  ? { x: "100%", opacity: 0.6 }
                  : { y: "100%", opacity: 0.7 }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : { x: 0, y: 0, opacity: 1 }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : isDesktop
                  ? { x: "100%", opacity: 0.5 }
                  : { y: "100%", opacity: 0.5 }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0.12 }
                : { type: "spring", stiffness: 360, damping: 34, mass: 0.85 }
            }
            drag={isDesktop || shouldReduceMotion ? false : "y"}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 320 }}
            dragElastic={{ top: 0, bottom: 0.45 }}
            onDragEnd={handleDragEnd}
            className={`vp-sheet relative z-10 flex max-h-[88dvh] w-full flex-col rounded-t-3xl lg:h-full lg:max-h-screen lg:rounded-l-3xl lg:rounded-tr-none ${SIZE_CLASSES[size]}`}
          >
            {/* Poignée glisser mobile */}
            <div
              onPointerDown={(e) => {
                if (!isDesktop && !shouldReduceMotion) {
                  dragControls.start(e);
                }
              }}
              className="flex cursor-grab items-center justify-center pt-3 pb-1 active:cursor-grabbing lg:hidden"
            >
              <span className="h-1.5 w-12 rounded-full bg-slate-400/40" />
            </div>

            <div className="flex items-start justify-between gap-3 border-b border-slate-500/15 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                {icon ? (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/12 border border-emerald-500/25">
                    {icon}
                  </div>
                ) : null}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      id={titleId}
                      className="font-display text-lg font-bold tracking-tight text-white"
                    >
                      {title}
                    </h2>
                    {badge ? (
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                        {badge}
                      </span>
                    ) : null}
                  </div>
                  {subtitle ? (
                    <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
                  ) : null}
                </div>
              </div>

              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  onClose();
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-500/25 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 vp-safe-pb">
              {children}
            </div>

            {footer ? (
              <div className="border-t border-slate-500/15 px-5 py-3 vp-safe-pb">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
