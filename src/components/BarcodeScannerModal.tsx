"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, ScanBarcode, Search } from "lucide-react";
import { DetailSheet } from "@/components/ui/DetailSheet";
import { MealEntry, MealType } from "@/types/vitalpulse";
import type { BarcodeProductPayload } from "@/app/api/barcode/route";
import { triggerLightHaptic } from "@/lib/native-bridge";

export interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  dateKey: string;
  onAddMeal: (meal: MealEntry) => void;
}

const QUICK_TEST_BARCODES = [
  { code: "3033490004743", label: "Skyr 0 %" },
  { code: "3229820129488", label: "Flocons d'avoine" },
  { code: "3250391378623", label: "Blanc de poulet" },
  { code: "3045320094004", label: "Chocolat noir 85 %" },
  { code: "3017620422003", label: "Pâte à tartiner (test)" },
];

export function BarcodeScannerModal({
  open,
  onClose,
  dateKey,
  onAddMeal,
}: BarcodeScannerModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [product, setProduct] = useState<BarcodeProductPayload | null>(null);
  const [grams, setGrams] = useState(100);
  const [mealType, setMealType] = useState<MealType>("snack");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const supportsBarcodeDetector =
    typeof window !== "undefined" && "BarcodeDetector" in window;

  useEffect(() => {
    if (!open) {
      stopCamera();
    }
  }, [open]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  function stopCamera() {
    setCameraActive(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function lookupBarcode(targetCode: string) {
    const clean = targetCode.replace(/[^0-9]/g, "");
    if (clean.length < 8) {
      setErrorMsg("Saisissez au moins 8 chiffres (code EAN-8 ou EAN-13).");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setCode(clean);
    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(clean)}`);
      const json = (await res.json()) as BarcodeProductPayload & { error?: string };
      if (!res.ok || !json.found) {
        setProduct(null);
        setErrorMsg(json.error || "Produit introuvable dans OpenFoodFacts.");
      } else {
        triggerLightHaptic();
        setProduct(json);
        setGrams(100);
      }
    } catch {
      setErrorMsg("Impossible de joindre la base code-barres pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  async function startCameraScan() {
    if (!supportsBarcodeDetector || typeof navigator === "undefined" || !navigator.mediaDevices) {
      setErrorMsg("Détection caméra directe indisponible sur ce navigateur : utilisez la saisie EAN ci-dessous.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const DetectorCtor = (
        window as unknown as {
          BarcodeDetector: new (opts: { formats: string[] }) => {
            detect: (el: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
          };
        }
      ).BarcodeDetector;
      const detector = new DetectorCtor({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e"],
      });

      const scanLoop = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const hits = await detector.detect(videoRef.current);
          const hit = hits.find((h) => h.rawValue);
          if (hit?.rawValue) {
            stopCamera();
            await lookupBarcode(hit.rawValue);
            return;
          }
        } catch {
          // frame ignorée
        }
        if (streamRef.current) {
          window.setTimeout(scanLoop, 380);
        }
      };
      void scanLoop();
    } catch {
      stopCamera();
      setErrorMsg("Accès caméra refusé ou indisponible. Saisissez le code EAN manuellement.");
    }
  }

  function handleSaveMeal() {
    if (!product) return;
    triggerLightHaptic();
    const factor = grams / 100;
    const kcal = Math.round(product.per100g.kcal * factor);
    const proteinG = +(product.per100g.proteinG * factor).toFixed(1);
    const carbsG = +(product.per100g.carbsG * factor).toFixed(1);
    const fatG = +(product.per100g.fatG * factor).toFixed(1);
    const fiberG = +(product.per100g.fiberG * factor).toFixed(1);
    const sodiumMg = Math.round(product.per100g.sodiumMg * factor);

    const entry: MealEntry = {
      id: `barcode-${Date.now()}`,
      createdAt: new Date().toISOString(),
      dateKey,
      mealType,
      userNotes: `Scan EAN ${product.code} (${grams} g)`,
      plateDiameterCm: 20,
      portionEatenPct: 100,
      dishTitle: `${product.productName} (${grams} g)`,
      summaryFr: `${product.brand} · Nutri-Score ${product.nutriScore} · NOVA ${product.novaGroup}`,
      confidence: 0.96,
      analysisProvider: "ciqual-deterministic",
      caloriesCentral: kcal,
      caloriesMin: Math.round(kcal * 0.96),
      caloriesMax: Math.round(kcal * 1.04),
      macros: {
        proteinG,
        carbsG,
        fatG,
        fiberG,
        sugarG: +(product.per100g.sugarG * factor).toFixed(1),
        satFatG: +(product.per100g.satFatG * factor).toFixed(1),
        sodiumMg,
      },
      micronutrients: {
        ironMg: +(grams * 0.008).toFixed(1),
        magnesiumMg: Math.round(grams * 0.18),
        calciumMg: Math.round(grams * 0.35),
        potassiumMg: Math.round(grams * 1.4),
        vitCMg: 0,
        vitDUg: 0,
      },
      novaGroup: product.novaGroup,
      glycemicLoad: Math.round((carbsG - fiberG * 0.4) * 0.45),
      satietyScore: Math.max(25, Math.min(92, Math.round(proteinG * 2 + fiberG * 3 + 35))),
      healthScore:
        product.nutriScore === "A"
          ? 88
          : product.nutriScore === "B"
            ? 74
            : product.nutriScore === "C"
              ? 58
              : 40,
      items: [
        {
          name: product.productName,
          grams,
          kcal,
          proteinG,
          carbsG,
          fatG,
          fiberG,
          sodiumMg,
          ciqualMatch: `EAN ${product.code}`,
        },
      ],
      smartClarifier: {
        oilLevel: "none",
        appliedOilDeltaKcal: 0,
        questionFr: "Valeurs directement issues du code-barres produit.",
      },
      clinicalSources: [
        product.provider === "openfoodfacts"
          ? "OpenFoodFacts API v2"
          : "Référentiel nutritionnel local",
      ],
      revisions: [],
    };

    onAddMeal(entry);
    onClose();
  }

  return (
    <DetailSheet
      open={open}
      onClose={onClose}
      title="Scan code-barres"
      subtitle="OpenFoodFacts v2 + catalogue français instantané"
      icon={<ScanBarcode className="h-5 w-5 text-amber-300" />}
      size="md"
    >
      <div className="space-y-4">
        {/* Caméra si supportée */}
        {supportsBarcodeDetector && !cameraActive && (
          <button
            type="button"
            onClick={startCameraScan}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/35 bg-amber-500/15 px-4 py-3 text-xs font-bold text-amber-200 hover:bg-amber-500/25"
          >
            <Camera className="h-4 w-4" />
            Ouvrir la caméra lecteur EAN-13
          </button>
        )}

        {cameraActive && (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-400/50 bg-black">
            <video ref={videoRef} playsInline muted className="h-48 w-full object-cover" />
            <button
              type="button"
              onClick={stopCamera}
              className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white"
            >
              Arrêter caméra
            </button>
          </div>
        )}

        {/* Saisie manuelle EAN */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void lookupBarcode(code);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code EAN-13 (ex. 3033490004743)"
            className="flex-1 rounded-2xl border border-slate-500/30 bg-slate-900/70 px-4 py-2.5 text-sm text-white tabular-nums"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Chercher
          </button>
        </form>

        {/* Raccourcis de test rapides */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TEST_BARCODES.map((preset) => (
            <button
              key={preset.code}
              type="button"
              onClick={() => void lookupBarcode(preset.code)}
              className="rounded-full border border-slate-500/25 bg-slate-500/10 px-3 py-1 text-[11px] font-semibold text-slate-300 hover:border-emerald-400/40"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        {product && (
          <div className="vp-card-accent space-y-4 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-white">{product.productName}</p>
                <p className="text-xs text-slate-400">
                  {product.brand} · EAN {product.code}
                </p>
              </div>
              <div className="flex gap-1.5 text-[11px] font-bold">
                <span className="rounded-lg bg-emerald-500/20 px-2 py-1 text-emerald-300">
                  Nutri {product.nutriScore}
                </span>
                <span className="rounded-lg bg-slate-500/20 px-2 py-1 text-slate-200">
                  NOVA {product.novaGroup}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Quantité consommée :</span>
                <span className="font-bold text-white tabular-nums">{grams} g</span>
              </div>
              <input
                type="range"
                min={15}
                max={350}
                step={5}
                value={grams}
                onChange={(e) => setGrams(Number(e.target.value))}
                className="mt-2 w-full accent-emerald-400"
              />
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-xl bg-slate-500/10 p-2">
                <p className="text-[10px] text-slate-400">Calories</p>
                <p className="font-bold text-white tabular-nums">
                  {Math.round((product.per100g.kcal * grams) / 100)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-500/10 p-2">
                <p className="text-[10px] text-slate-400">Protéines</p>
                <p className="font-bold text-emerald-300 tabular-nums">
                  {((product.per100g.proteinG * grams) / 100).toFixed(1)} g
                </p>
              </div>
              <div className="rounded-xl bg-slate-500/10 p-2">
                <p className="text-[10px] text-slate-400">Glucides</p>
                <p className="font-bold text-cyan-300 tabular-nums">
                  {((product.per100g.carbsG * grams) / 100).toFixed(1)} g
                </p>
              </div>
              <div className="rounded-xl bg-slate-500/10 p-2">
                <p className="text-[10px] text-slate-400">Lipides</p>
                <p className="font-bold text-amber-300 tabular-nums">
                  {((product.per100g.fatG * grams) / 100).toFixed(1)} g
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: "breakfast", label: "Matin" },
                  { id: "lunch", label: "Midi" },
                  { id: "snack", label: "Collation" },
                  { id: "dinner", label: "Soir" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMealType(m.id)}
                  className={`rounded-xl border py-1.5 text-[11px] font-bold ${
                    mealType === m.id
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                      : "border-slate-500/20 text-slate-300"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSaveMeal}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              <Check className="h-4 w-4" />
              Ajouter au journal du jour
            </button>
          </div>
        )}
      </div>
    </DetailSheet>
  );
}
