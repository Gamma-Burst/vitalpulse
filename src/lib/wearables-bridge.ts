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
function toBoundedPositive(raw: unknown, min: number, max: number): number | undefined {
  if (raw === null || raw === undefined || typeof raw === "boolean") return undefined;
  const normalized = typeof raw === "string" ? raw.trim().replace(",", ".") : raw;
  if (normalized === "") return undefined;
  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0 || num < min || num > max) return undefined;
  return num;
}

export function parseWearableExportText(
  fileName: string,
  content: string
): ParsedWearableSnapshot {
  const lower = fileName.toLowerCase();
  const trimmed = content.trim();

  // 1. Apple Santé export.xml — regrouper par startDate (YYYY-MM-DD) pour ne jamais sommer plusieurs années
  if (lower.endsWith(".xml") || trimmed.includes("<HealthData") || trimmed.includes("HKQuantityTypeIdentifier")) {
    const stepsByDate = new Map<string, number>();
    const kcalByDate = new Map<string, number>();
    let lastValidWeight: number | undefined;
    let lastWeightDate = "";
    let lastValidHr: number | undefined;
    let lastHrDate = "";
    let matchedRecordTags = 0;

    const recordRegex = /<Record\b([^>]*?)(?:\/>|>)/gi;
    let m: RegExpExecArray | null;
    while ((m = recordRegex.exec(trimmed)) !== null) {
      matchedRecordTags += 1;
      const attrs = m[1];
      const typeMatch = attrs.match(/\btype="([^"]+)"/i);
      const valMatch = attrs.match(/\bvalue="([^"]+)"/i);
      if (!typeMatch || !valMatch) continue;
      const recType = typeMatch[1];
      const dateMatch = attrs.match(/\bstartDate="(\d{4}-\d{2}-\d{2})/i);
      const dateKey = dateMatch ? dateMatch[1] : "undated";

      if (recType === "HKQuantityTypeIdentifierStepCount") {
        const v = toBoundedPositive(valMatch[1], 1, 65000);
        if (v !== undefined) {
          stepsByDate.set(dateKey, (stepsByDate.get(dateKey) ?? 0) + v);
        }
      } else if (recType === "HKQuantityTypeIdentifierActiveEnergyBurned") {
        const v = toBoundedPositive(valMatch[1], 1, 6000);
        if (v !== undefined) {
          kcalByDate.set(dateKey, (kcalByDate.get(dateKey) ?? 0) + v);
        }
      } else if (recType === "HKQuantityTypeIdentifierBodyMass") {
        const v = toBoundedPositive(valMatch[1], 30, 250);
        if (v !== undefined && (dateKey === "undated" || dateKey >= lastWeightDate)) {
          lastValidWeight = +v.toFixed(1);
          if (dateKey !== "undated") lastWeightDate = dateKey;
        }
      } else if (recType === "HKQuantityTypeIdentifierHeartRate") {
        const v = toBoundedPositive(valMatch[1], 30, 240);
        if (v !== undefined && (dateKey === "undated" || dateKey >= lastHrDate)) {
          lastValidHr = Math.round(v);
          if (dateKey !== "undated") lastHrDate = dateKey;
        }
      }
    }

    const pickLatestSum = (map: Map<string, number>, maxVal: number): number | undefined => {
      if (map.size === 0) return undefined;
      const datedKeys = [...map.keys()].filter((k) => k !== "undated").sort();
      const targetKey = datedKeys.length > 0 ? datedKeys[datedKeys.length - 1] : "undated";
      const total = map.get(targetKey);
      return total !== undefined && total > 0 ? Math.min(maxVal, Math.round(total)) : undefined;
    };

    let steps = pickLatestSum(stepsByDate, 65000);
    let activeKcal = pickLatestSum(kcalByDate, 6000);

    // Fallback si XML simplifié sans balise <Record ...>
    if (matchedRecordTags === 0) {
      let rawSteps = 0;
      const stepRegex = /HKQuantityTypeIdentifierStepCount"[^>]*value="(\d+(?:\.\d+)?)"/g;
      while ((m = stepRegex.exec(trimmed)) !== null) {
        const v = toBoundedPositive(m[1], 1, 65000);
        if (v !== undefined) rawSteps += v;
      }
      steps = rawSteps > 0 ? Math.min(65000, Math.round(rawSteps)) : undefined;

      let rawKcal = 0;
      const kcalRegex = /HKQuantityTypeIdentifierActiveEnergyBurned"[^>]*value="(\d+(?:\.\d+)?)"/g;
      while ((m = kcalRegex.exec(trimmed)) !== null) {
        const v = toBoundedPositive(m[1], 1, 6000);
        if (v !== undefined) rawKcal += v;
      }
      activeKcal = rawKcal > 0 ? Math.min(6000, Math.round(rawKcal)) : undefined;

      const weightMatches = [...trimmed.matchAll(/HKQuantityTypeIdentifierBodyMass"[^>]*value="(\d+(?:\.\d+)?)"/g)];
      for (const wm of weightMatches) {
        const v = toBoundedPositive(wm[1], 30, 250);
        if (v !== undefined) lastValidWeight = +v.toFixed(1);
      }
      const hrMatches = [...trimmed.matchAll(/HKQuantityTypeIdentifierHeartRate"[^>]*value="(\d+(?:\.\d+)?)"/g)];
      for (const hm of hrMatches) {
        const v = toBoundedPositive(hm[1], 30, 240);
        if (v !== undefined) lastValidHr = Math.round(v);
      }
    }

    return {
      steps,
      activeKcal,
      weightKg: lastValidWeight,
      heartRateBpm: lastValidHr,
      sourceLabel: "Import Apple Santé XML",
    };
  }

  // 2. JSON Samsung / Garmin / Fitbit / générique
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown> | Array<Record<string, unknown>>;
      const obj = Array.isArray(parsed) ? parsed[parsed.length - 1] ?? {} : parsed;
      const stepsVal = toBoundedPositive(
        obj.steps ?? obj.step_count ?? obj.totalSteps ?? obj.dailySteps,
        1,
        100000
      );
      const kcalVal = toBoundedPositive(
        obj.activeKcal ?? obj.activeKilocalories ?? obj.calories ?? obj.calorie,
        1,
        8000
      );
      const weightVal = toBoundedPositive(obj.weightKg ?? obj.weight ?? obj.bodyMassKg, 30, 250);
      const hrVal = toBoundedPositive(
        obj.heartRateBpm ?? obj.restingHeartRate ?? obj.heartRate ?? obj.bpm,
        30,
        240
      );

      return {
        steps: stepsVal !== undefined ? Math.round(stepsVal) : undefined,
        activeKcal: kcalVal !== undefined ? Math.round(kcalVal) : undefined,
        weightKg: weightVal !== undefined ? +weightVal.toFixed(1) : undefined,
        heartRateBpm: hrVal !== undefined ? Math.round(hrVal) : undefined,
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
    const findCol = (names: string[], min: number, max: number): number | undefined => {
      const idx = header.findIndex((h) => names.some((n) => h.includes(n)));
      if (idx === -1) return undefined;
      return toBoundedPositive(last[idx], min, max);
    };
    const steps = findCol(["step", "pas"], 1, 100000);
    const activeKcal = findCol(["kcal", "calor", "energy"], 1, 8000);
    const weightKg = findCol(["weight", "poids", "mass"], 30, 250);
    const heartRateBpm = findCol(["heart", "bpm", "pulse", "fc"], 30, 240);
    if (steps || activeKcal || weightKg || heartRateBpm) {
      return {
        steps: steps !== undefined ? Math.round(steps) : undefined,
        activeKcal: activeKcal !== undefined ? Math.round(activeKcal) : undefined,
        weightKg: weightKg !== undefined ? +weightKg.toFixed(1) : undefined,
        heartRateBpm: heartRateBpm !== undefined ? Math.round(heartRateBpm) : undefined,
        sourceLabel: "Import Samsung / CSV",
      };
    }
  }

  // 4. Fallback regex libre
  const stepsM = trimmed.match(/(\d{3,6})\s*(?:pas|steps)/i);
  const bpmM = trimmed.match(/(\d{2,3})\s*(?:bpm)/i);
  const weightM = trimmed.match(/(\d{2,3}(?:[.,]\d)?)\s*(?:kg)/i);
  const stepsParsed = stepsM ? toBoundedPositive(stepsM[1], 100, 100000) : undefined;
  const bpmParsed = bpmM ? toBoundedPositive(bpmM[1], 30, 240) : undefined;
  const weightParsed = weightM ? toBoundedPositive(weightM[1], 30, 250) : undefined;
  return {
    steps: stepsParsed !== undefined ? Math.round(stepsParsed) : undefined,
    heartRateBpm: bpmParsed !== undefined ? Math.round(bpmParsed) : undefined,
    weightKg: weightParsed !== undefined ? +weightParsed.toFixed(1) : undefined,
    sourceLabel: "Import texte montre",
  };
}
