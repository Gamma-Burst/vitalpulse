import { WearableEcosystem } from "@/types/vitalpulse";

export interface WearableEcosystemSpec {
  id: WearableEcosystem;
  name: string;
  platformNote: string;
  syncMethods: string[];
  accentColor: string;
}

export const WEARABLE_ECOSYSTEMS: WearableEcosystemSpec[] = [
  {
    id: "samsung_health",
    name: "Samsung Galaxy Watch & Health Connect",
    platformNote: "Android 14/15 · Health Connect natif ou export CSV/JSON Samsung Health",
    syncMethods: ["Pas quotidiens", "Dépense active", "Fréquence cardiaque", "Poids"],
    accentColor: "#38BDF8",
  },
  {
    id: "apple_watch",
    name: "Apple Watch & Apple Santé",
    platformNote: "Export XML Apple Santé (App Santé → Exporter) ou HealthKit sur build iOS",
    syncMethods: ["Pas quotidiens", "Anneaux activité", "Cardio BPM", "Poids"],
    accentColor: "#FB7185",
  },
  {
    id: "garmin",
    name: "Garmin Connect",
    platformNote: "Import JSON/CSV Garmin ou diffusion cardio BLE vers téléphone",
    syncMethods: ["Pas", "Calories actives", "Séances sport", "FC repos"],
    accentColor: "#34D399",
  },
  {
    id: "fitbit_pixel",
    name: "Fitbit & Google Pixel Watch",
    platformNote: "Synchronisation Health Connect Android ou fichier JSON Fitbit",
    syncMethods: ["Pas", "Dépense journalière", "Zone active", "Poids"],
    accentColor: "#2DD4BF",
  },
  {
    id: "xiaomi_zepp",
    name: "Xiaomi Mi Band · Amazfit / Zepp",
    platformNote: "Import CSV Zepp Life ou Health Connect Android",
    syncMethods: ["Pas", "Kcal actives", "FC", "Poids"],
    accentColor: "#FBBF24",
  },
  {
    id: "ble_hr",
    name: "Connexion Directe Bluetooth Cardio (BLE 0x180D)",
    platformNote: "Chrome Android / Bureau : lecture BPM en direct de tout capteur/montre diffusant la FC",
    syncMethods: ["Fréquence cardiaque temps réel (BPM)"],
    accentColor: "#F472B6",
  },
];

/**
 * Décode le paquet officiel Bluetooth SIG Heart Rate Measurement (0x2A37).
 * Bit 0 du byte 0 = 0 => uint8 BPM (offset 1) ; Bit 0 = 1 => uint16 LE BPM (offset 1..2).
 */
export function parseHeartRateMeasurement(data: DataView): number {
  if (data.byteLength < 2) return 0;
  const flags = data.getUint8(0);
  const is16Bit = (flags & 0x01) !== 0;
  if (is16Bit && data.byteLength >= 3) {
    return data.getUint16(1, true);
  }
  return data.getUint8(1);
}

export function supportsWebBluetooth(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export async function connectBluetoothHeartRate(
  onBpm: (bpm: number, deviceName: string) => void
): Promise<{ deviceName: string; disconnect: () => void }> {
  if (!supportsWebBluetooth()) {
    throw new Error(
      "Web Bluetooth n'est pas disponible sur ce navigateur. Utilisez Chrome Android/Desktop ou importez un fichier d'export montre."
    );
  }
  const nav = navigator as unknown as {
    bluetooth: {
      requestDevice: (opts: { filters?: Array<{ services: Array<number | string> }>; optionalServices?: Array<number | string> }) => Promise<{
        name?: string;
        gatt?: {
          connect: () => Promise<{
            disconnect: () => void;
            getPrimaryService: (svc: string) => Promise<{
              getCharacteristic: (ch: string) => Promise<{
                startNotifications: () => Promise<void>;
                addEventListener: (ev: string, fn: (e: Event) => void) => void;
              }>;
            }>;
          }>;
        };
      }>;
    };
  };

  const device = await nav.bluetooth.requestDevice({
    filters: [{ services: ["heart_rate"] }],
    optionalServices: ["battery_service"],
  });

  if (!device.gatt) {
    throw new Error("Appareil Bluetooth sans profil GATT compatible.");
  }

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService("heart_rate");
  const char = await service.getCharacteristic("heart_rate_measurement");
  const deviceName = device.name || "Capteur Cardio BLE";

  char.addEventListener("characteristicvaluechanged", (ev: Event) => {
    const target = ev.target as unknown as { value?: DataView };
    if (target?.value) {
      const bpm = parseHeartRateMeasurement(target.value);
      if (bpm > 25 && bpm < 240) {
        onBpm(bpm, deviceName);
      }
    }
  });
  await char.startNotifications();

  return {
    deviceName,
    disconnect: () => {
      try {
        server.disconnect();
      } catch {
        // noop
      }
    },
  };
}

export interface ParsedWearableSnapshot {
  steps?: number;
  activeKcal?: number;
  weightKg?: number;
  heartRateBpm?: number;
  sourceLabel: string;
}

/**
 * Parseur universel pour imports Apple Santé XML, Samsung Health CSV/JSON, Garmin ou Fitbit JSON.
 */
export function parseWearableExportText(
  fileName: string,
  content: string
): ParsedWearableSnapshot {
  const lower = fileName.toLowerCase();
  const trimmed = content.trim();

  // 1. Apple Santé export.xml
  if (lower.endsWith(".xml") || trimmed.includes("<HealthData") || trimmed.includes("HKQuantityTypeIdentifier")) {
    let steps = 0;
    const stepRegex = /HKQuantityTypeIdentifierStepCount"[^>]*value="(\d+(?:\.\d+)?)"/g;
    let m: RegExpExecArray | null;
    while ((m = stepRegex.exec(trimmed)) !== null) {
      steps += Number(m[1]);
    }
    const weightMatch = trimmed.match(/HKQuantityTypeIdentifierBodyMass"[^>]*value="(\d+(?:\.\d+)?)"/);
    const hrMatch = trimmed.match(/HKQuantityTypeIdentifierHeartRate"[^>]*value="(\d+(?:\.\d+)?)"/);
    let activeKcal = 0;
    const kcalRegex = /HKQuantityTypeIdentifierActiveEnergyBurned"[^>]*value="(\d+(?:\.\d+)?)"/g;
    while ((m = kcalRegex.exec(trimmed)) !== null) {
      activeKcal += Number(m[1]);
    }
    return {
      steps: steps > 0 ? Math.round(steps) : undefined,
      activeKcal: activeKcal > 0 ? Math.round(activeKcal) : undefined,
      weightKg: weightMatch ? +Number(weightMatch[1]).toFixed(1) : undefined,
      heartRateBpm: hrMatch ? Math.round(Number(hrMatch[1])) : undefined,
      sourceLabel: "Import Apple Santé XML",
    };
  }

  // 2. JSON Samsung / Garmin / Fitbit / générique
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown> | Array<Record<string, unknown>>;
      const obj = Array.isArray(parsed) ? parsed[parsed.length - 1] ?? {} : parsed;
      const stepsRaw = obj.steps ?? obj.step_count ?? obj.totalSteps ?? obj.dailySteps;
      const kcalRaw = obj.activeKcal ?? obj.activeKilocalories ?? obj.calories ?? obj.calorie;
      const weightRaw = obj.weightKg ?? obj.weight ?? obj.bodyMassKg;
      const hrRaw = obj.heartRateBpm ?? obj.restingHeartRate ?? obj.heartRate ?? obj.bpm;

      return {
        steps: Number.isFinite(Number(stepsRaw)) ? Math.round(Number(stepsRaw)) : undefined,
        activeKcal: Number.isFinite(Number(kcalRaw)) ? Math.round(Number(kcalRaw)) : undefined,
        weightKg: Number.isFinite(Number(weightRaw)) ? +Number(weightRaw).toFixed(1) : undefined,
        heartRateBpm: Number.isFinite(Number(hrRaw)) ? Math.round(Number(hrRaw)) : undefined,
        sourceLabel: lower.includes("garmin")
          ? "Import Garmin JSON"
          : lower.includes("fitbit")
            ? "Import Fitbit JSON"
            : "Import Montre JSON",
      };
    } catch {
      // continue vers parseur CSV/texte
    }
  }

  // 3. CSV Samsung Health / générique (`steps,calorie,heart_rate,weight` ou lignes clés)
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length >= 2) {
    const header = lines[0].toLowerCase().split(/[,;]/).map((h) => h.trim());
    const last = lines[lines.length - 1].split(/[,;]/).map((c) => c.trim());
    const findCol = (names: string[]): number | undefined => {
      const idx = header.findIndex((h) => names.some((n) => h.includes(n)));
      if (idx === -1) return undefined;
      const v = Number((last[idx] || "").replace(",", "."));
      return Number.isFinite(v) && v > 0 ? v : undefined;
    };
    const steps = findCol(["step", "pas"]);
    const activeKcal = findCol(["kcal", "calor", "energy"]);
    const weightKg = findCol(["weight", "poids", "mass"]);
    const heartRateBpm = findCol(["heart", "bpm", "pulse", "fc"]);
    if (steps || activeKcal || weightKg || heartRateBpm) {
      return {
        steps: steps ? Math.round(steps) : undefined,
        activeKcal: activeKcal ? Math.round(activeKcal) : undefined,
        weightKg: weightKg ? +weightKg.toFixed(1) : undefined,
        heartRateBpm: heartRateBpm ? Math.round(heartRateBpm) : undefined,
        sourceLabel: "Import Samsung / CSV",
      };
    }
  }

  // 4. Fallback regex libre
  const stepsM = trimmed.match(/(\d{3,5})\s*(?:pas|steps)/i);
  const bpmM = trimmed.match(/(\d{2,3})\s*(?:bpm)/i);
  const weightM = trimmed.match(/(\d{2,3}(?:[.,]\d)?)\s*(?:kg)/i);
  return {
    steps: stepsM ? Number(stepsM[1]) : undefined,
    heartRateBpm: bpmM ? Number(bpmM[1]) : undefined,
    weightKg: weightM ? Number(weightM[1].replace(",", ".")) : undefined,
    sourceLabel: "Import texte montre",
  };
}
