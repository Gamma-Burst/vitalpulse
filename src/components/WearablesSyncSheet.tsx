"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Bluetooth,
  CheckCircle2,
  HeartPulse,
  Info,
  Upload,
  Watch,
} from "lucide-react";
import { DetailSheet } from "@/components/ui/DetailSheet";
import { InfoTip } from "@/components/ui/InfoTip";
import { WearableEcosystem, WearableSyncState } from "@/types/vitalpulse";
import {
  connectBluetoothHeartRate,
  parseWearableExportText,
  supportsWebBluetooth,
  WEARABLE_ECOSYSTEMS,
} from "@/lib/wearables-bridge";
import { triggerLightHaptic } from "@/lib/native-bridge";

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
  const [selectedEco, setSelectedEco] = useState<WearableEcosystem>(
    wearable.ecosystem || "samsung_health"
  );
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [liveBpm, setLiveBpm] = useState<number | null>(
    wearable.lastHeartRateBpm ?? null
  );
  const [bleDeviceName, setBleDeviceName] = useState<string | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      disconnectRef.current?.();
      disconnectRef.current = null;
    };
  }, []);

  function selectEcosystem(eco: WearableEcosystem) {
    triggerLightHaptic();
    setSelectedEco(eco);
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

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const text = await file.text();
      const parsed = parseWearableExportText(file.name, text);
      if (
        !parsed.steps &&
        !parsed.activeKcal &&
        !parsed.weightKg &&
        !parsed.heartRateBpm
      ) {
        setErrorMsg(
          "Aucune métrique reconnue dans ce fichier. Formats acceptés : export.xml Apple Santé, CSV Samsung Health, JSON Garmin/Fitbit."
        );
        return;
      }
      triggerLightHaptic();
      onApplySync({
        wearable: {
          ecosystem: selectedEco,
          deviceName: parsed.sourceLabel,
          lastSyncAt: new Date().toISOString(),
          lastHeartRateBpm: parsed.heartRateBpm ?? wearable.lastHeartRateBpm,
          syncedStepsToday: parsed.steps ?? wearable.syncedStepsToday,
          syncedActiveKcalToday: parsed.activeKcal ?? wearable.syncedActiveKcalToday,
        },
        stepsToday: parsed.steps,
        weightKg: parsed.weightKg,
      });
      setStatusMsg(
        `${parsed.sourceLabel} appliqué : ${parsed.steps ? `${parsed.steps} pas` : ""} ${
          parsed.heartRateBpm ? `· ${parsed.heartRateBpm} BPM` : ""
        } ${parsed.weightKg ? `· ${parsed.weightKg} kg` : ""}`.trim()
      );
    } catch {
      setErrorMsg("Impossible de lire le fichier sélectionné.");
    } finally {
      e.target.value = "";
    }
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
      subtitle="Samsung Galaxy Watch · Apple Watch · Garmin · Fitbit · BLE"
      icon={<Watch className="h-5 w-5 text-cyan-300" />}
      size="lg"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3.5 text-xs text-cyan-100">
          <p className="flex items-center gap-1.5 font-bold">
            <Info className="h-4 w-4 text-cyan-300 shrink-0" />
            Comment fonctionne la connexion dès aujourd&apos;hui
          </p>
          <p className="mt-1 leading-relaxed text-slate-300">
            Dans cette version Web & APK Android, vous pouvez connecter un capteur cardio <strong>Bluetooth LE en direct</strong> ou importer en 1 clic votre fichier d&apos;export <strong>Apple Santé (.xml), Samsung Health (.csv) ou Garmin/Fitbit (.json)</strong>. La synchro automatique en tâche de fond via Google Health Connect / Apple HealthKit est prête côté permissions pour la sortie Play Store / App Store.
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

        {/* Actions réelles : Bluetooth + Import fichier */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                : supportsWebBluetooth()
                  ? "Compatible navigateur : lance la recherche GATT 0x180D."
                  : "Web Bluetooth non supporté ici : passez par Chrome Android ou l'import fichier."}
            </p>
            <button
              type="button"
              onClick={() => void handleConnectBle()}
              className="mt-3 w-full rounded-xl bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
            >
              Connecter un capteur BPM
            </button>
          </div>

          <div className="rounded-2xl border border-slate-500/25 bg-slate-500/10 p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-white">
              <Upload className="h-4 w-4 text-emerald-300" />
              Importer un export montre réel
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Apple Santé (.xml), Samsung Health (.csv), Garmin / Fitbit (.json)
            </p>
            <label className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400">
              <Upload className="h-3.5 w-3.5" />
              Choisir un fichier montre
              <input
                type="file"
                accept=".xml,.csv,.json,.txt"
                onChange={(e) => void handleFileImport(e)}
                className="hidden"
              />
            </label>
          </div>
        </div>

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
