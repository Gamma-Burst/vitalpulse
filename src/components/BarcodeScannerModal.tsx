"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Crown,
  Flashlight,
  ImageUp,
  Loader2,
  Lock,
  ScanBarcode,
  Search,
  Store,
} from "lucide-react";
import { DetailSheet } from "@/components/ui/DetailSheet";
import { InfoTip } from "@/components/ui/InfoTip";
import {
  MealEntry,
  MealType,
  SubscriptionState,
} from "@/types/vitalpulse";
import type { BarcodeProductPayload } from "@/app/api/barcode/route";
import { isFwPlusActive } from "@/lib/billing-bridge";
import { triggerLightHaptic } from "@/lib/native-bridge";

export interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  dateKey: string;
  onAddMeal: (meal: MealEntry) => void;
  subscription?: SubscriptionState;
  onOpenSubscriptionModal?: (reason?: string) => void;
}

const QUICK_TEST_BARCODES = [
  { code: "20724696", label: "Amandes Alesto (Lidl)" },
  { code: "3033490004743", label: "Skyr 0 %" },
  { code: "3229820129488", label: "Flocons d'avoine" },
  { code: "3250391378623", label: "Blanc de poulet" },
  { code: "3045320094004", label: "Chocolat noir 85 %" },
  { code: "3017620422003", label: "Pâte à tartiner (test)" },
];

const UPGRADE_REASON_BARCODE_FR =
  "Le scan code-barres instantané par caméra ou photo et la détection du magasin / enseigne d'origine sont réservés à FolloWeight Plus (FW+ · 7 jours d'essai gratuit). Vous pouvez toujours saisir les chiffres du code EAN manuellement gratuitement.";

interface NativeBarcodeDetector {
  detect: (
    source: HTMLVideoElement | HTMLCanvasElement
  ) => Promise<Array<{ rawValue?: string }>>;
}

type ZxingLibModule = typeof import("@zxing/library");

async function createZxingBarcodeDecoder() {
  const zxing: ZxingLibModule = await import("@zxing/library");
  const hints = new Map<unknown, unknown>();
  hints.set(zxing.DecodeHintType.POSSIBLE_FORMATS, [
    zxing.BarcodeFormat.EAN_13,
    zxing.BarcodeFormat.EAN_8,
    zxing.BarcodeFormat.UPC_A,
    zxing.BarcodeFormat.UPC_E,
    zxing.BarcodeFormat.CODE_128,
  ]);
  hints.set(zxing.DecodeHintType.TRY_HARDER, true);

  const reader = new zxing.MultiFormatReader();
  reader.setHints(hints as never);

  const decodeCanvas = (canvas: HTMLCanvasElement): string | null => {
    const source = new zxing.HTMLCanvasElementLuminanceSource(canvas);
    const tryDecodeSource = (lum: import("@zxing/library").LuminanceSource) => {
      try {
        const bitmap = new zxing.BinaryBitmap(new zxing.HybridBinarizer(lum));
        const result = reader.decodeWithState(bitmap);
        const raw = result?.getText()?.replace(/[^0-9]/g, "") || "";
        return raw.length >= 8 ? raw : null;
      } catch {
        return null;
      }
    };

    const fullHit = tryDecodeSource(source);
    if (fullHit) return fullHit;

    // Bande horizontale centrale + rotation 90 deg pour bouteilles / paquets verticaux
    if (source.isCropSupported() && canvas.height >= 160) {
      const bandTop = Math.floor(canvas.height * 0.25);
      const bandHeight = Math.floor(canvas.height * 0.5);
      const bandHit = tryDecodeSource(
        source.crop(0, bandTop, canvas.width, bandHeight)
      );
      if (bandHit) return bandHit;
    }

    if (source.isRotateSupported()) {
      const rotated = tryDecodeSource(source.rotateCounterClockwise());
      if (rotated) return rotated;
    }

    return null;
  };

  return { decodeCanvas, reset: () => reader.reset() };
}

function drawVideoFrameToCanvas(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): boolean {
  if (video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return false;
  }
  const maxDim = 960;
  const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
  const targetW = Math.max(160, Math.round(video.videoWidth * scale));
  const targetH = Math.max(120, Math.round(video.videoHeight * scale));
  if (canvas.width !== targetW) canvas.width = targetW;
  if (canvas.height !== targetH) canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(video, 0, 0, targetW, targetH);
  return true;
}

async function fileToBarcodeDataUrls(file: File): Promise<{
  canvas: HTMLCanvasElement;
  dataUrl: string;
}> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Impossible de lire l'image"));
      el.src = objectUrl;
    });
    const maxDim = 1280;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const width = Math.max(120, Math.round(img.width * scale));
    const height = Math.max(120, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas indisponible");
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
    return { canvas, dataUrl };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function BarcodeScannerModal({
  open,
  onClose,
  dateKey,
  onAddMeal,
  subscription,
  onOpenSubscriptionModal,
}: BarcodeScannerModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [photoScanning, setPhotoScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [product, setProduct] = useState<BarcodeProductPayload | null>(null);
  const [grams, setGrams] = useState(100);
  const [gramsDraft, setGramsDraft] = useState("100");
  const [mealType, setMealType] = useState<MealType>("snack");
  const [cameraActive, setCameraActive] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const decodeLoopStopRef = useRef<boolean>(false);

  const isPlus = subscription ? isFwPlusActive(subscription) : false;

  useEffect(() => {
    if (!open) {
      stopCamera();
    }
  }, [open]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  function stopCamera() {
    decodeLoopStopRef.current = true;
    setCameraActive(false);
    setTorchSupported(false);
    setTorchEnabled(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function promptUpgradeForFeature(reason?: string) {
    stopCamera();
    if (onOpenSubscriptionModal) {
      onClose();
      onOpenSubscriptionModal(reason || UPGRADE_REASON_BARCODE_FR);
    } else {
      setErrorMsg(reason || UPGRADE_REASON_BARCODE_FR);
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
      const plusFlag = isPlus ? "&plus=1" : "";
      const res = await fetch(
        `/api/barcode?code=${encodeURIComponent(clean)}${plusFlag}`,
        {
          headers: subscription?.licenseToken
            ? { "x-fw-license": subscription.licenseToken }
            : undefined,
        }
      );
      const json = (await res.json()) as BarcodeProductPayload & { error?: string };
      if (!res.ok || !json.found) {
        setProduct(null);
        setErrorMsg(json.error || "Produit introuvable dans OpenFoodFacts.");
      } else {
        triggerLightHaptic();
        setProduct(json);
        setGrams(100);
        setGramsDraft("100");
      }
    } catch {
      setErrorMsg("Impossible de joindre la base code-barres pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  async function startCameraScan() {
    if (!isPlus) {
      promptUpgradeForFeature();
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorMsg(
        "Caméra vidéo en direct indisponible ici : utilisez le bouton Photo du code-barres juste à côté."
      );
      return;
    }
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      decodeLoopStopRef.current = false;
      setCameraActive(true);
    } catch {
      stopCamera();
      setErrorMsg(
        "Accès caméra refusé ou indisponible. Vous pouvez prendre une photo du code-barres ou saisir les chiffres ci-dessous."
      );
    }
  }

  useEffect(() => {
    if (!cameraActive || !streamRef.current) return;
    let cancelled = false;
    let timerId: number | null = null;
    let zxingDecoder: Awaited<ReturnType<typeof createZxingBarcodeDecoder>> | null = null;
    let nativeDetector: NativeBarcodeDetector | null = null;
    const scratchCanvas = document.createElement("canvas");

    const runScanner = async () => {
      const stream = streamRef.current;
      const video = videoRef.current;
      if (!stream || !video || cancelled) return;

      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      try {
        await video.play();
      } catch {
        // iOS / WebView peut nécessiter un court délai après l'attachement du flux
      }

      const videoTrack = stream.getVideoTracks()[0];
      const caps = videoTrack?.getCapabilities?.() as
        | (MediaTrackCapabilities & { torch?: boolean })
        | undefined;
      if (!cancelled && caps?.torch) {
        setTorchSupported(true);
      }

      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          const DetectorCtor = (
            window as unknown as {
              BarcodeDetector: new (opts: { formats: string[] }) => NativeBarcodeDetector;
            }
          ).BarcodeDetector;
          nativeDetector = new DetectorCtor({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
          });
        } catch {
          nativeDetector = null;
        }
      }

      try {
        zxingDecoder = await createZxingBarcodeDecoder();
      } catch {
        zxingDecoder = null;
      }

      const tick = async () => {
        if (cancelled || decodeLoopStopRef.current || !streamRef.current || !videoRef.current) {
          return;
        }
        const v = videoRef.current;
        let detectedCode: string | null = null;

        if (nativeDetector && v.readyState >= 2) {
          try {
            const hits = await nativeDetector.detect(v);
            const raw = hits.find((h) => h.rawValue)?.rawValue;
            const digits = raw ? raw.replace(/[^0-9]/g, "") : "";
            if (digits.length >= 8) detectedCode = digits;
          } catch {
            // Repli immédiat vers ZXing sur la frame courante
          }
        }

        if (!detectedCode && zxingDecoder && drawVideoFrameToCanvas(v, scratchCanvas)) {
          detectedCode = zxingDecoder.decodeCanvas(scratchCanvas);
        }

        if (detectedCode && !cancelled) {
          stopCamera();
          await lookupBarcode(detectedCode);
          return;
        }

        if (!cancelled && !decodeLoopStopRef.current && streamRef.current) {
          timerId = window.setTimeout(() => {
            void tick();
          }, 240);
        }
      };

      void tick();
    };

    void runScanner();

    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
      zxingDecoder?.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()?.[0];
    if (!track) return;
    const next = !torchEnabled;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchEnabled(next);
    } catch {
      setTorchSupported(false);
    }
  }

  async function handleBarcodePhotoSelected(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isPlus) {
      promptUpgradeForFeature();
      return;
    }

    setPhotoScanning(true);
    setErrorMsg(null);
    try {
      const { canvas, dataUrl } = await fileToBarcodeDataUrls(file);
      let decoded: string | null = null;

      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          const DetectorCtor = (
            window as unknown as {
              BarcodeDetector: new (opts: { formats: string[] }) => NativeBarcodeDetector;
            }
          ).BarcodeDetector;
          const detector = new DetectorCtor({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
          });
          const hits = await detector.detect(canvas);
          const digits = hits.find((h) => h.rawValue)?.rawValue?.replace(/[^0-9]/g, "");
          if (digits && digits.length >= 8) decoded = digits;
        } catch {
          // Poursuit avec ZXing puis Vision OCR
        }
      }

      if (!decoded) {
        try {
          const zxingDecoder = await createZxingBarcodeDecoder();
          decoded = zxingDecoder.decodeCanvas(canvas);
          zxingDecoder.reset();
        } catch {
          decoded = null;
        }
      }

      if (decoded) {
        await lookupBarcode(decoded);
        return;
      }

      // Secours IA Vision (lecture chiffres EAN ou produit sur photo courbée/brillante)
      const res = await fetch("/api/barcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(subscription?.licenseToken
            ? { "x-fw-license": subscription.licenseToken }
            : {}),
        },
        body: JSON.stringify({
          imageBase64: dataUrl,
          allowPlus: true,
          licenseToken: subscription?.licenseToken,
        }),
      });
      const json = (await res.json()) as BarcodeProductPayload & { error?: string };
      if (!res.ok || !json.found) {
        setProduct(null);
        setErrorMsg(
          json.error ||
            "Code-barres illisible sur cette photo. Cadrez les barres noires bien nettes ou saisissez les chiffres manuellement."
        );
      } else {
        triggerLightHaptic();
        setCode(json.code);
        setProduct(json);
        setGrams(100);
        setGramsDraft("100");
      }
    } catch {
      setErrorMsg("Impossible d'analyser cette photo de code-barres.");
    } finally {
      setPhotoScanning(false);
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

    const storeText =
      isPlus && product.storeOrigin?.storesLabelFr
        ? ` · ${product.storeOrigin.storesLabelFr}`
        : "";

    const entry: MealEntry = {
      id: `barcode-${Date.now()}`,
      createdAt: new Date().toISOString(),
      dateKey,
      mealType,
      userNotes: `Scan EAN ${product.code} (${grams} g)`,
      plateDiameterCm: 20,
      portionEatenPct: 100,
      dishTitle: `${product.productName} (${grams} g)`,
      summaryFr: `${product.brand}${storeText} · Nutri-Score ${product.nutriScore} · NOVA ${product.novaGroup}`,
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
      glycemicLoad: Math.max(0, Math.round((carbsG - fiberG * 0.4) * 0.45)),
      satietyScore: Math.max(25, Math.min(92, Math.round(proteinG * 2 + fiberG * 3 + 35))),
      healthScore:
        product.nutriScore === "A"
          ? 90
          : product.nutriScore === "B"
            ? 76
            : product.nutriScore === "C"
              ? 58
              : product.nutriScore === "D"
                ? 44
                : 30,
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
      title="Scan code-barres & Enseigne"
      subtitle="Caméra / photo instantanée + magasin d'origine (FW+) · saisie EAN gratuite"
      icon={<ScanBarcode className="h-5 w-5 text-amber-300" />}
      size="md"
    >
      <div className="space-y-4">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleBarcodePhotoSelected}
        />

        {/* Boutons Caméra en direct & Photo universels (FW+) */}
        {!cameraActive && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={startCameraScan}
              className="flex items-center justify-between gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/15 px-3.5 py-3 text-left text-xs font-bold text-amber-200 hover:bg-amber-500/25"
            >
              <span className="inline-flex items-center gap-2">
                <Camera className="h-4 w-4 shrink-0" />
                <span>Scanner avec la caméra</span>
              </span>
              {!isPlus && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-950">
                  <Crown className="h-3 w-3" />
                  FW+
                </span>
              )}
            </button>

            <button
              type="button"
              disabled={photoScanning}
              onClick={() => {
                if (!isPlus) {
                  promptUpgradeForFeature();
                  return;
                }
                photoInputRef.current?.click();
              }}
              className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-3 text-left text-xs font-bold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                {photoScanning ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <ImageUp className="h-4 w-4 shrink-0" />
                )}
                <span>
                  {photoScanning ? "Lecture photo..." : "Photo du code-barres"}
                </span>
              </span>
              {!isPlus && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-950">
                  <Crown className="h-3 w-3" />
                  FW+
                </span>
              )}
            </button>
          </div>
        )}

        {cameraActive && (
          <div className="vp-keep-dark relative overflow-hidden rounded-2xl border border-emerald-400/60 bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-56 w-full object-cover"
            />
            {/* Cadre de visée horizontal */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
              <div className="relative h-24 w-full max-w-[260px] rounded-xl border-2 border-emerald-400/90 shadow-[0_0_0_999px_rgba(2,6,23,0.45)]">
                <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-emerald-400/90 animate-pulse" />
              </div>
            </div>
            <div className="absolute bottom-2 inset-x-2 flex items-center justify-between gap-2">
              <span className="rounded-full bg-black/75 px-3 py-1 text-[11px] font-medium text-emerald-200">
                Visez le code-barres bien à plat
              </span>
              <div className="flex items-center gap-1.5">
                {torchSupported && (
                  <button
                    type="button"
                    onClick={() => void toggleTorch()}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                      torchEnabled
                        ? "bg-amber-400 text-slate-950"
                        : "bg-black/75 text-white"
                    }`}
                  >
                    <Flashlight className="h-3.5 w-3.5" />
                    Torche
                  </button>
                )}
                <button
                  type="button"
                  onClick={stopCamera}
                  className="rounded-full bg-black/75 px-3 py-1 text-xs font-bold text-white"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Saisie manuelle EAN gratuite */}
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
            placeholder="Ou saisissez le code EAN (ex. 20724696)"
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
                <span className="inline-flex items-center rounded-lg bg-emerald-500/20 px-2 py-1 text-emerald-300">
                  Nutri {product.nutriScore}
                  <InfoTip term="nutriscore" />
                </span>
                <span className="inline-flex items-center rounded-lg bg-slate-500/20 px-2 py-1 text-slate-200">
                  NOVA {product.novaGroup}
                  <InfoTip term="nova" />
                </span>
              </div>
            </div>

            {/* Détection Magasin / Enseigne d'origine (FW+) */}
            {isPlus && product.storeOrigin ? (
              <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-300">
                    <Store className="h-3.5 w-3.5 shrink-0" />
                    {product.storeOrigin.headlineFr}
                  </span>
                  {product.visionMatchedFromPhoto && (
                    <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                      Lu sur photo IA
                    </span>
                  )}
                </div>
                <p className="font-semibold text-white">
                  {product.storeOrigin.storesLabelFr}
                </p>
                {(product.storeOrigin.countriesLabelFr || product.storeOrigin.gs1OriginFr) && (
                  <p className="text-[11px] text-slate-300">
                    {[product.storeOrigin.countriesLabelFr, product.storeOrigin.gs1OriginFr]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => promptUpgradeForFeature(UPGRADE_REASON_BARCODE_FR)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 text-left text-xs hover:bg-amber-500/15"
              >
                <span className="inline-flex items-center gap-2 text-amber-200">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong>Magasin / enseigne d&apos;origine</strong> — débloquer avec FW+ (7j gratuits)
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-950 shrink-0">
                  <Store className="h-3 w-3" />
                  FW+
                </span>
              </button>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Quantité consommée :</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Quantité en grammes"
                    value={gramsDraft}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^\d]/g, "");
                      setGramsDraft(clean);
                      if (!clean) return;
                      const n = Number(clean);
                      if (n >= 5 && n <= 1000) {
                        setGrams(Math.round(n));
                      }
                    }}
                    onBlur={() => {
                      const n = Number(gramsDraft);
                      const clamped = Math.max(5, Math.min(1000, Math.round(n || grams || 100)));
                      setGrams(clamped);
                      setGramsDraft(String(clamped));
                    }}
                    className="w-20 rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-right font-bold text-white tabular-nums"
                  />
                  <span className="font-bold text-white">g</span>
                </div>
              </div>
              <input
                type="range"
                min={15}
                max={350}
                step={5}
                value={Math.min(350, Math.max(15, grams))}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setGrams(val);
                  setGramsDraft(String(val));
                }}
                className="w-full accent-emerald-400"
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
