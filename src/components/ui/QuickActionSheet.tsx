"use client";

import React from "react";
import {
  Camera,
  ScanBarcode,
  Refrigerator,
  Clock,
  Droplets,
  Watch,
} from "lucide-react";
import { DetailSheet } from "@/components/ui/DetailSheet";
import { triggerLightHaptic } from "@/lib/native-bridge";

export interface QuickActionSheetProps {
  open: boolean;
  onClose: () => void;
  onScanMeal: () => void;
  onScanBarcode: () => void;
  onOpenFridge: () => void;
  onOpenFasting: () => void;
  onAddWater250: () => void;
  onOpenWearables: () => void;
  waterTodayMl: number;
}

export function QuickActionSheet({
  open,
  onClose,
  onScanMeal,
  onScanBarcode,
  onOpenFridge,
  onOpenFasting,
  onAddWater250,
  onOpenWearables,
  waterTodayMl,
}: QuickActionSheetProps) {
  const actions = [
    {
      id: "meal",
      title: "Photo Plat",
      subtitle: "Calories & macros IA",
      icon: Camera,
      color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      run: () => {
        onClose();
        onScanMeal();
      },
    },
    {
      id: "barcode",
      title: "Code-barres",
      subtitle: "OpenFoodFacts EAN",
      icon: ScanBarcode,
      color: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      run: () => {
        onClose();
        onScanBarcode();
      },
    },
    {
      id: "fridge",
      title: "Photo Frigo",
      subtitle: "Recettes express",
      icon: Refrigerator,
      color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      run: () => {
        onClose();
        onOpenFridge();
      },
    },
    {
      id: "fasting",
      title: "Jeûne / OMAD",
      subtitle: "Timer & phases",
      icon: Clock,
      color: "bg-violet-500/15 text-violet-300 border-violet-500/30",
      run: () => {
        onClose();
        onOpenFasting();
      },
    },
    {
      id: "water",
      title: "Eau +250 mL",
      subtitle: `Aujourd'hui : ${waterTodayMl} mL`,
      icon: Droplets,
      color: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      run: () => {
        onAddWater250();
        onClose();
      },
    },
    {
      id: "watch",
      title: "Montre & Santé",
      subtitle: "Samsung / Apple / BLE",
      icon: Watch,
      color: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      run: () => {
        onClose();
        onOpenWearables();
      },
    },
  ];

  return (
    <DetailSheet
      open={open}
      onClose={onClose}
      title="Action rapide"
      subtitle="Ajoutez un repère ou lancez un module en 1 seconde"
      size="md"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                triggerLightHaptic();
                item.run();
              }}
              className="flex flex-col items-start gap-2 rounded-2xl border border-slate-500/20 bg-slate-500/10 p-3.5 text-left transition hover:border-emerald-400/40 hover:bg-emerald-500/10 active:scale-[0.98]"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl border ${item.color}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="text-[11px] text-slate-400">{item.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>
    </DetailSheet>
  );
}
