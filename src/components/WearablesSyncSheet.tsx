"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bluetooth,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  FileArchive,
  HeartPulse,
  Info,
  Link2,
  Smartphone,
  Sparkles,
  Upload,
  Watch,
} from "lucide-react";
import { DetailSheet } from "@/components/ui/DetailSheet";
import { InfoTip } from "@/components/ui/InfoTip";
import { WearableEcosystem, WearableSyncState } from "@/types/vitalpulse";
import {
  buildIosShortcutSyncUrlTemplate,
  connectBluetoothHeartRate,
  extractAndParseWearableFile,
  isAppleTouchDevice,
  ParsedWearableSnapshot,
  supportsWebBluetooth,
  WEARABLE_ECOSYSTEMS,
} from "@/lib/wearables-bridge";
import { compressImageFile, triggerLightHaptic } from "@/lib/native-bridge";

export interface WearablesSyncSheetProps {
  open: boolean;
  onClose: () => void;
  wearable: WearableSyncState;
  onApplySync: (patch: {
    wearable: WearableSyncState;
    stepsToday?: number;
    weightKg?: number;
  }) => void;
}

export function WearablesSyncSheet({
  open,
  onClose,
  wearable,
  onApplySync,
}: WearablesSyncSheetProps) {
  const [appleDevice, setAppleDevice] = useState(false);
  const [bleSupported, setBleSupported] = useState(false);
  const [selectedEco, setSelectedEco] = useState<WearableEcosystem>(
    wearable.ecosystem || "samsung_health"
  );
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyImport, setBusyImport] = useState(false);
  const [busyVision, setBusyVision] = useState(false);
  const [copiedShortcut, setCopiedShortcut] = useState(false);

  const [manualSteps, setManualSteps] = useState<string>(
    wearable.syncedStepsToday ? String(wearable.syncedStepsToday) : ""
  );
  const [manualKcal, setManualKcal] = useState<string>(
    wearable.syncedActiveKcalToday ? String(wearable.syncedActiveKcalToday) : ""
  );
  const [manualBpm, setManualBpm] = useState<string>(
    wearable.lastHeartRateBpm ? String(wearable.lastHeartRateBpm) : ""
  );

  const [liveBpm, setLiveBpm] = useState<number | null>(
    wearable.lastHeartRateBpm ?? null
  );
  const [bleDeviceName, setBleDeviceName] = useState<string | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const isApple = isAppleTouchDevice();
    setAppleDevice(isApple);
    setBleSupported(supportsWebBluetooth());

    if (
      isApple &&
      !wearable.lastSyncAt &&
      (!wearable.ecosystem || wearable.ecosystem === "samsung_health")
    ) {
      setSelectedEco("apple_watch");
    }
  }, [wearable.ecosystem, wearable.lastSyncAt]);

  useEffect(() => {
    return () => {
      disconnectRef.current?.();
      disconnectRef.current = null;
    };
  }, []);

  const shortcutTemplateUrl = useMemo(() => {
    const origin =
      typeof window !== "undefined" && window.location.origin.startsWith("http")
        ? window.location.origin
        : "https://followeight.com";
    return buildIosShortcutSyncUrlTemplate(origin);
  }, []);

  const isAppleWatchMode =
    selectedEco === "apple_watch" || (appleDevice && selectedEco !== "ble_hr");

  const hideBleSection =
    (selectedEco === "apple_watch" || appleDevice) && !bleSupported;

  function applyParsedSnapshot(parsed: ParsedWearableSnapshot, ecoOverride?: WearableEcosystem) {
    const targetEco = ecoOverride ?? selectedEco;
    onApplySync({
      wearable: {
        ecosystem: targetEco,
        deviceName: parsed.sourceLabel,
        lastSyncAt: new Date().toISOString(),
        lastHeartRateBpm: parsed.heartRateBpm ?? wearable.lastHeartRateBpm,
        syncedStepsToday: parsed.steps ?? wearable.syncedStepsToday,
        syncedActiveKcalToday: parsed.activeKcal ?? wearable.syncedActiveKcalToday,
        syncedExerciseMinutesToday:
          parsed.exerciseMinutes ?? wearable.syncedExerciseMinutesToday,
      },
      stepsToday: parsed.steps,
      weightKg: parsed.weightKg,
    });
    if (parsed.heartRateBpm) setLiveBpm(parsed.heartRateBpm);
    if (parsed.steps) setManualSteps(String(parsed.steps));
    if (parsed.activeKcal) setManualKcal(String(parsed.activeKcal));
    if (parsed.heartRateBpm) setManualBpm(String(parsed.heartRateBpm));

    const parts: string[] = [];
    if (parsed.steps !== undefined) parts.push(`${parsed.steps.toLocaleString("fr-FR")} pas`);
    if (parsed.activeKcal !== undefined) parts.push(`${parsed.activeKcal} kcal actives`);
    if (parsed.exerciseMinutes !== undefined) parts.push(`${parsed.exerciseMinutes} min entraînement`);
    if (parsed.heartRateBpm !== undefined) parts.push(`${parsed.heartRateBpm} BPM`);
    if (parsed.weightKg !== undefined) parts.push(`${parsed.weightKg} kg`);
    setStatusMsg(`${parsed.sourceLabel} appliqué : ${parts.join(" · ")}`);
  }

  function selectEcosystem(eco: WearableEcosystem) {
    triggerLightHaptic();
    setSelectedEco(eco);
    setErrorMsg(null);
    onApplySync({
      wearable: {
        ...wearable,
        ecosystem: eco,
      },
    });
  }

  async function handleConnectBle() {
    setErrorMsg(null);
    setStatusMsg("Recherche d'un capteur ou montre diffusant la fréquence cardiaque (0x180D)...");
    try {
      const conn = await connectBluetoothHeartRate((bpm, deviceName) => {
        setLiveBpm(bpm);
        setBleDeviceName(deviceName);
        onApplySync({
          wearable: {
            ...wearable,
            ecosystem: "ble_hr",
            deviceName,
            lastHeartRateBpm: bpm,
            lastSyncAt: new Date().toISOString(),
          },
        });
      });
      disconnectRef.current = conn.disconnect;
      setBleDeviceName(conn.deviceName);
      setStatusMsg(`Connecté à ${conn.deviceName} · lecture BPM en direct activée.`);
    } catch (err) {
      setStatusMsg(null);
      setErrorMsg(err instanceof Error ? err.message : "Connexion Bluetooth annulée.");
    }
  }

  async function handleCopyShortcutUrl() {
    triggerLightHaptic();
    try {
      await navigator.clipboard.writeText(shortcutTemplateUrl);
      setCopiedShortcut(true);
      setTimeout(() => setCopiedShortcut(false), 3000);
    } catch {
      setStatusMsg(`Copiez ce lien pour Raccourcis iOS : ${shortcutTemplateUrl}`);
    }
  }

  async function handleScreenshotScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setStatusMsg(null);
    setBusyVision(true);
    try {
      const compressed = await compressImageFile(file, 1400);
      const res = await fetch("/api/analyze-wearable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: compressed }),
      });
      const json = (await res.json()) as {
        snapshot?: ParsedWearableSnapshot;
        parsedCount?: number;
        messageFr?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error || "Impossible d'analyser cette capture.");
      }
      const snap = json.snapshot;
      if (
        !snap ||
        (snap.steps === undefined &&
          snap.activeKcal === undefined &&
          snap.exerciseMinutes === undefined &&
          snap.heartRateBpm === undefined &&
          snap.weightKg === undefined)
      ) {
        setErrorMsg(
          json.messageFr ||
            "Aucun chiffre détecté sur cette capture : prenez une capture nette de l'écran Forme / Anneaux ou Apple Santé."
        );
        return;
      }
      triggerLightHaptic();
      applyParsedSnapshot(snap, "apple_watch");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Échec de l'analyse de capture."
      );
    } finally {
      setBusyVision(false);
      e.target.value = "";
    }
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setStatusMsg("Analyse en streaming du fichier montre en cours...");
    setBusyImport(true);
    try {
      const parsed = await extractAndParseWearableFile(file, file.name);
      if (
        !parsed.steps &&
        !parsed.activeKcal &&
        !parsed.exerciseMinutes &&
        !parsed.weightKg &&
        !parsed.heartRateBpm
      ) {
        setStatusMsg(null);
        setErrorMsg(
          "Aucune métrique reconnue dans ce fichier. Formats acceptés : export.zip ou export.xml Apple Santé, CSV Samsung Health, JSON Garmin/Fitbit."
        );
        return;
      }
      triggerLightHaptic();
      applyParsedSnapshot(parsed);
    } catch (err) {
      setStatusMsg(null);
      setErrorMsg(
        err instanceof Error ? err.message : "Impossible de lire le fichier sélectionné."
      );
    } finally {
      setBusyImport(false);
      e.target.value = "";
    }
  }

  function handleApplyManualAppleWatch(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const stepsN = Number(manualSteps.replace(/[^\d]/g, ""));
    const kcalN = Number(manualKcal.replace(/[^\d]/g, ""));
    const bpmN = Number(manualBpm.replace(/[^\d]/g, ""));
    const snap: ParsedWearableSnapshot = {
      steps:
        manualSteps.trim() && Number.isFinite(stepsN) && stepsN >= 0 && stepsN <= 120000
          ? Math.round(stepsN)
          : undefined,
      activeKcal:
        manualKcal.trim() && Number.isFinite(kcalN) && kcalN >= 1 && kcalN <= 6000
          ? Math.round(kcalN)
          : undefined,
      heartRateBpm:
        manualBpm.trim() && Number.isFinite(bpmN) && bpmN >= 30 && bpmN <= 230
          ? Math.round(bpmN)
          : undefined,
      sourceLabel: "Apple Watch · Relevé du jour",
    };

    if (
      snap.steps === undefined &&
      snap.activeKcal === undefined &&
      snap.heartRateBpm === undefined
    ) {
      setErrorMsg("Saisissez au moins les pas, calories actives ou fréquence cardiaque.");
      return;
    }

    triggerLightHaptic();
    applyParsedSnapshot(snap, "apple_watch");
  }

  function handleDemoTestSync() {
    triggerLightHaptic();
    const spec =
      WEARABLE_ECOSYSTEMS.find((w) => w.id === selectedEco) ??
      WEARABLE_ECOSYSTEMS[0];
    onApplySync({
      wearable: {
        ecosystem: selectedEco,
        deviceName: `${spec.name.split("&")[0].trim()} (Démo)`,
        lastSyncAt: new Date().toISOString(),
        lastHeartRateBpm: 68,
        syncedStepsToday: 8450,
        syncedActiveKcalToday: 310,
      },
      stepsToday: 8450,
    });
    setLiveBpm(68);
    setStatusMsg(
      "Données test montre appliquées (simulation locale : 8 450 pas, 68 BPM, 310 kcal actives)."
    );
  }

  return (
    <DetailSheet
      open={open}
      onClose={onClose}
      title="Montres & Capteurs Santé"
      subtitle="Apple Watch (iPhone) · Samsung · Garmin · Fitbit · BLE"
      icon={<Watch className="h-5 w-5 text-cyan-300" />}
      size="lg"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3.5 text-xs text-cyan-100">
          <p className="flex items-center gap-1.5 font-bold">
            <Info className="h-4 w-4 text-cyan-300 shrink-0" />
            {isAppleWatchMode
              ? "Passerelle iPhone & Apple Watch sans erreur Bluetooth"
              : "Comment fonctionne la connexion dès aujourd'hui"}
          </p>
          <p className="mt-1 leading-relaxed text-slate-300">
            {isAppleWatchMode ? (
              <>
                Sur iPhone et iPad, Apple interdit <strong>Web Bluetooth</strong> à tous les navigateurs Web (Safari, Chrome iOS). Pour synchroniser votre <strong>Apple Watch</strong> dès maintenant, FolloWeight propose 3 passerelles natives sans erreur : <strong>Scan IA des Anneaux Forme</strong>, <strong>Raccourci iOS 1-clic</strong> ou <strong>Import ZIP/XML Apple Santé</strong>.
              </>
            ) : (
              <>
                Connectez un capteur cardio <strong>Bluetooth LE</strong> (Chrome Android / Desktop) ou importez votre export <strong>Apple Santé (.zip/.xml), Samsung Health (.csv) ou Garmin/Fitbit (.json)</strong>.
              </>
            )}
          </p>
        </div>

        {/* Choix écosystème */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Votre montre / plateforme
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {WEARABLE_ECOSYSTEMS.map((eco) => {
              const active = selectedEco === eco.id;
              return (
                <button
                  key={eco.id}
                  type="button"
                  onClick={() => selectEcosystem(eco.id)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-emerald-400 bg-emerald-500/15"
                      : "border-slate-500/20 bg-slate-500/5 hover:border-slate-400/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">{eco.name}</span>
                    {active && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{eco.platformNote}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hub Spécial iPhone / Apple Watch */}
        {isAppleWatchMode && (
          <div className="space-y-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs font-extrabold text-white">
                <Smartphone className="h-4 w-4 text-rose-300 shrink-0" />
                3 moyens fiables de synchroniser votre Apple Watch sur iPhone
              </p>
              {liveBpm ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-200 tabular-nums">
                  <HeartPulse className="h-3 w-3" />
                  {liveBpm} BPM
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {/* 1. Scan IA Anneaux Forme / Santé */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-700/80 bg-slate-950/75 p-3">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    <Camera className="h-3.5 w-3.5 shrink-0" />
                    1. Scan Capture Forme (IA)
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Importez une capture d&apos;écran de vos Anneaux Apple Forme ou d&apos;Apple Santé.
                  </p>
                </div>
                <label className="mt-3 flex min-h-[40px] cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  {busyVision ? "Lecture IA..." : "Scanner ma capture"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={busyVision}
                    onChange={(e) => void handleScreenshotScan(e)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 2. Raccourci iOS 1-clic */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-700/80 bg-slate-950/75 p-3">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                    <Link2 className="h-3.5 w-3.5 shrink-0" />
                    2. Raccourci iOS 1-clic
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Dans l&apos;app Apple <strong>Raccourcis</strong> : lire Pas + Énergie → <em>Ouvrir l&apos;URL</em>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyShortcutUrl()}
                  className="mt-3 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400"
                >
                  {copiedShortcut ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Lien copié !
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copier lien Raccourci
                    </>
                  )}
                </button>
              </div>

              {/* 3. Export ZIP / XML Apple Santé */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-700/80 bg-slate-950/75 p-3">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <FileArchive className="h-3.5 w-3.5 shrink-0" />
                    3. Export ZIP / XML Santé
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    App Santé → Profil → Exporter toutes vos données (gère <code>export.zip</code> directement).
                  </p>
                </div>
                <label className="mt-3 flex min-h-[40px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/30">
                  <Upload className="h-3.5 w-3.5" />
                  {busyImport ? "Lecture ZIP..." : "Importer export.zip"}
                  <input
                    type="file"
                    accept=".zip,.xml,.csv,.json,.txt"
                    disabled={busyImport}
                    onChange={(e) => void handleFileImport(e)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <details className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3 text-xs">
              <summary className="cursor-pointer font-semibold text-slate-200">
                Ou saisir rapidement les chiffres lus sur votre Apple Watch aujourd&apos;hui
              </summary>
              <form
                onSubmit={handleApplyManualAppleWatch}
                className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4"
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={manualSteps}
                  onChange={(e) => setManualSteps(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Pas (ex: 8500)"
                  aria-label="Pas Apple Watch"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-white tabular-nums"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={manualKcal}
                  onChange={(e) => setManualKcal(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Bouger kcal (ex: 340)"
                  aria-label="Calories actives Bouger"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-white tabular-nums"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={manualBpm}
                  onChange={(e) => setManualBpm(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Cardio BPM (ex: 64)"
                  aria-label="Fréquence cardiaque BPM"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-white tabular-nums"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-3 py-2 font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Appliquer
                </button>
              </form>
            </details>
          </div>
        )}

        {/* Actions classiques (Bluetooth Android/Desktop + Import fichier universel) */}
        {!isAppleWatchMode && (
          <div className={`grid grid-cols-1 gap-3 ${hideBleSection ? "" : "sm:grid-cols-2"}`}>
            {!hideBleSection && (
              <div className="rounded-2xl border border-slate-500/25 bg-slate-500/10 p-4">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-xs font-bold text-white">
                    <Bluetooth className="h-4 w-4 text-cyan-300" />
                    Bluetooth Cardio Direct <InfoTip term="ble_hr_0x180d" />
                  </p>
                  {liveBpm ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-300 tabular-nums">
                      <HeartPulse className="h-3 w-3" />
                      {liveBpm} BPM
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {bleDeviceName
                    ? `Connecté à : ${bleDeviceName}`
                    : bleSupported
                      ? "Compatible navigateur : lance la recherche GATT 0x180D."
                      : "Utilisez Chrome Android / Desktop pour le Bluetooth direct, ou importez un fichier ci-contre."}
                </p>
                {bleSupported && (
                  <button
                    type="button"
                    onClick={() => void handleConnectBle()}
                    className="mt-3 w-full rounded-xl bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                  >
                    Connecter un capteur BPM
                  </button>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-slate-500/25 bg-slate-500/10 p-4">
              <p className="flex items-center gap-2 text-xs font-bold text-white">
                <Upload className="h-4 w-4 text-emerald-300" />
                Importer un export montre réel
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Apple Santé (.zip / .xml), Samsung Health (.csv), Garmin / Fitbit (.json)
              </p>
              <label className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400">
                <Upload className="h-3.5 w-3.5" />
                {busyImport ? "Analyse en cours..." : "Choisir un fichier montre"}
                <input
                  type="file"
                  accept=".zip,.xml,.csv,.json,.txt"
                  disabled={busyImport}
                  onChange={(e) => void handleFileImport(e)}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {statusMsg && (
          <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
            {statusMsg}
          </div>
        )}
        {errorMsg && (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Bouton simulation test honnêtement libellé */}
        <div className="border-t border-slate-500/15 pt-3">
          <button
            type="button"
            onClick={handleDemoTestSync}
            className="w-full rounded-2xl border border-slate-500/25 bg-slate-500/10 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-500/20"
          >
            Simuler une synchro montre test (8 450 pas · 68 BPM · démonstration)
          </button>
        </div>
      </div>
    </DetailSheet>
  );
}
