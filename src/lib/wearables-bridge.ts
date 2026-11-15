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
    platformNote: "iPhone : Scan capture Forme/Santé, Raccourci iOS 1-clic ou export ZIP/XML Apple Santé",
    syncMethods: ["Anneaux Forme (IA)", "Raccourci iOS 1-clic", "Export ZIP/XML", "Cardio BPM"],
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
  exerciseMinutes?: number;
  weightKg?: number;
  heartRateBpm?: number;
  sourceLabel: string;
}

/**
 * Détecte un appareil Apple tactile (iPhone / iPad / iPod) où Safari/WebKit
 * bloque l'API Web Bluetooth dans tous les navigateurs iOS.
 */
export function isAppleTouchDevice(
  userAgent?: string,
  platform?: string,
  maxTouchPoints?: number
): boolean {
  const ua =
    userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const plat =
    platform ??
    (typeof navigator !== "undefined" ? navigator.platform : "");
  const touches =
    maxTouchPoints ??
    (typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0);

  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (/Macintosh/i.test(ua) && touches > 1) return true;
  if (/iPhone|iPad|iPod/i.test(plat)) return true;
  return false;
}

/**
 * URL modèle destinée à l'app Raccourcis (Shortcuts) sur iPhone :
 * permet d'injecter directement les pas, kcal actives, cardio et poids du jour
 * dans FolloWeight en 1 toucher depuis l'iPhone.
 */
export function buildIosShortcutSyncUrlTemplate(origin = "https://followeight.com"): string {
  const cleanOrigin = (origin || "https://followeight.com").replace(/\/$/, "");
  return `${cleanOrigin}/?aw_sync=1&steps=[Pas]&kcal=[EnergieActive]&bpm=[FrequenceCardiaque]&weight=[PoidsKg]&ex=[MinutesExercice]`;
}

function toBoundedMetric(raw: string | null | undefined, min: number, max: number, allowFloat = false): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/\s+/g, "").replace(",", ".");
  if (!cleaned || /^\[.*\]$/.test(cleaned)) return undefined;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return allowFloat ? +n.toFixed(1) : Math.round(n);
}

/**
 * Parse les paramètres d'URL envoyés par un Raccourci iOS (`?aw_sync=1&...` ou `#aw_sync=1&...`).
 */
export function parseAppleWatchSyncParams(
  search: string,
  hash = ""
): ParsedWearableSnapshot | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  if (hash) {
    const cleanHash = hash.startsWith("#") ? hash.slice(1) : hash;
    const hashQuery = cleanHash.includes("?") ? cleanHash.split("?")[1] : cleanHash;
    if (hashQuery && hashQuery.includes("=")) {
      const hp = new URLSearchParams(hashQuery);
      hp.forEach((v, k) => {
        if (!params.has(k)) params.set(k, v);
      });
    }
  }

  const marker = params.get("aw_sync") || params.get("source");
  if (marker !== "1" && marker !== "true" && marker !== "apple_shortcut") {
    return null;
  }

  const steps = toBoundedMetric(params.get("steps") ?? params.get("pas"), 0, 120000);
  const activeKcal = toBoundedMetric(params.get("kcal") ?? params.get("activeKcal"), 1, 6000);
  const exerciseMinutes = toBoundedMetric(params.get("ex") ?? params.get("exercise"), 1, 600);
  const heartRateBpm = toBoundedMetric(params.get("bpm") ?? params.get("hr"), 30, 230);
  const weightKg = toBoundedMetric(params.get("weight") ?? params.get("poids"), 30, 280, true);

  if (
    steps === undefined &&
    activeKcal === undefined &&
    exerciseMinutes === undefined &&
    heartRateBpm === undefined &&
    weightKg === undefined
  ) {
    return null;
  }

  return {
    steps,
    activeKcal,
    exerciseMinutes,
    heartRateBpm,
    weightKg,
    sourceLabel: "Apple Watch · Raccourci iOS",
  };
}

function createAppleHealthXmlAccumulator() {
  const stepsByDate = new Map<string, number>();
  const kcalByDate = new Map<string, number>();
  const exerciseByDate = new Map<string, number>();
  let latestWeight: { date: string; kg: number } | undefined;
  let latestHr: { date: string; bpm: number } | undefined;
  let tail = "";

  const feedChunk = (chunk: string) => {
    const combined = tail + chunk;
    const lastClose = combined.lastIndexOf(">");
    if (lastClose === -1) {
      tail = combined.slice(-2048);
      return;
    }
    const completePart = combined.slice(0, lastClose + 1);
    const nextRecStart = combined.lastIndexOf("<Record", lastClose);
    if (nextRecStart > lastClose) {
      tail = combined.slice(nextRecStart);
    } else {
      tail = combined.slice(lastClose + 1);
    }

    const recordRe = /<Record\b([^>]+?)>/g;
    let m: RegExpExecArray | null;
    while ((m = recordRe.exec(completePart)) !== null) {
      const attrs = m[1];
      const typeM = attrs.match(/type="([^"]+)"/);
      if (!typeM) continue;
      const recType = typeM[1];
      const valM = attrs.match(/value="([^"]+)"/);
      const dateM = attrs.match(/startDate="(\d{4}-\d{2}-\d{2})/);
      if (!valM || !dateM) continue;
      const dateKey = dateM[1];

      if (recType === "HKQuantityTypeIdentifierStepCount") {
        const v = toBoundedMetric(valM[1], 0, 120000);
        if (v !== undefined) stepsByDate.set(dateKey, (stepsByDate.get(dateKey) ?? 0) + v);
      } else if (recType === "HKQuantityTypeIdentifierActiveEnergyBurned") {
        const v = toBoundedMetric(valM[1], 1, 6000);
        if (v !== undefined) kcalByDate.set(dateKey, (kcalByDate.get(dateKey) ?? 0) + v);
      } else if (recType === "HKQuantityTypeIdentifierAppleExerciseTime") {
        const v = toBoundedMetric(valM[1], 1, 600);
        if (v !== undefined) exerciseByDate.set(dateKey, (exerciseByDate.get(dateKey) ?? 0) + v);
      } else if (recType === "HKQuantityTypeIdentifierBodyMass") {
        const v = toBoundedMetric(valM[1], 30, 280, true);
        if (v !== undefined && (!latestWeight || dateKey >= latestWeight.date)) {
          latestWeight = { date: dateKey, kg: v };
        }
      } else if (recType === "HKQuantityTypeIdentifierHeartRate") {
        const v = toBoundedMetric(valM[1], 30, 230);
        if (v !== undefined && (!latestHr || dateKey >= latestHr.date)) {
          latestHr = { date: dateKey, bpm: v };
        }
      }
    }
  };

  const finish = (sourceLabel = "Apple Santé (export XML)"): ParsedWearableSnapshot => {
    if (tail) {
      feedChunk("\n>");
      tail = "";
    }
    const allDates = [
      ...Array.from(stepsByDate.keys()),
      ...Array.from(kcalByDate.keys()),
      ...Array.from(exerciseByDate.keys()),
    ].sort();
    const latestDate = allDates.length > 0 ? allDates[allDates.length - 1] : undefined;

    return {
      steps: latestDate ? stepsByDate.get(latestDate) : undefined,
      activeKcal: latestDate ? kcalByDate.get(latestDate) : undefined,
      exerciseMinutes: latestDate ? exerciseByDate.get(latestDate) : undefined,
      weightKg: latestWeight?.kg,
      heartRateBpm: latestHr?.bpm,
      sourceLabel: latestDate ? `${sourceLabel} · ${latestDate}` : sourceLabel,
    };
  };

  return { feedChunk, finish };
}

interface ZipXmlTarget {
  name: string;
  compMethod: number;
  compSize: number;
  localHeaderOffset: number;
}

function readUint64AsNumber(view: DataView, offset: number): number {
  const low = view.getUint32(offset, true);
  const high = view.getUint32(offset + 4, true);
  return high * 4294967296 + low;
}

async function locateZipTargetEntry(blob: Blob): Promise<ZipXmlTarget> {
  const tailLen = Math.min(blob.size, 65557);
  const tailBuf = await blob.slice(blob.size - tailLen, blob.size).arrayBuffer();
  const tailView = new DataView(tailBuf);

  let eocdPos = -1;
  for (let i = tailBuf.byteLength - 22; i >= 0; i--) {
    if (tailView.getUint32(i, true) === 0x06054b50) {
      const commentLen = tailView.getUint16(i + 20, true);
      if (i + 22 + commentLen === tailBuf.byteLength) {
        eocdPos = i;
        break;
      }
    }
  }
  if (eocdPos === -1) {
    throw new Error("Archive ZIP invalide ou corrompue (EOCD introuvable).");
  }

  let cdSize = tailView.getUint32(eocdPos + 12, true);
  let cdOffset = tailView.getUint32(eocdPos + 16, true);

  if (cdOffset === 0xffffffff || cdSize === 0xffffffff) {
    const locPos = eocdPos - 20;
    if (locPos >= 0 && tailView.getUint32(locPos, true) === 0x07064b50) {
      const z64Offset = readUint64AsNumber(tailView, locPos + 8);
      const z64Buf = await blob.slice(z64Offset, z64Offset + 56).arrayBuffer();
      const z64View = new DataView(z64Buf);
      if (z64View.getUint32(0, true) === 0x06064b50) {
        cdSize = readUint64AsNumber(z64View, 40);
        cdOffset = readUint64AsNumber(z64View, 48);
      }
    }
  }

  const cdBuf = await blob.slice(cdOffset, cdOffset + cdSize).arrayBuffer();
  const cdView = new DataView(cdBuf);
  const decoder = new TextDecoder("utf-8");

  let cursor = 0;
  let fallbackCandidate: ZipXmlTarget | null = null;

  while (cursor + 46 <= cdBuf.byteLength) {
    if (cdView.getUint32(cursor, true) !== 0x02014b50) break;
    const compMethod = cdView.getUint16(cursor + 10, true);
    let compSize = cdView.getUint32(cursor + 20, true);
    let uncompSize = cdView.getUint32(cursor + 24, true);
    const nameLen = cdView.getUint16(cursor + 28, true);
    const extraLen = cdView.getUint16(cursor + 30, true);
    const commentLen = cdView.getUint16(cursor + 32, true);
    let localHeaderOffset = cdView.getUint32(cursor + 42, true);

    const name = decoder.decode(new Uint8Array(cdBuf, cursor + 46, nameLen));

    if (
      (compSize === 0xffffffff || uncompSize === 0xffffffff || localHeaderOffset === 0xffffffff) &&
      extraLen >= 4
    ) {
      let exPos = cursor + 46 + nameLen;
      const exEnd = exPos + extraLen;
      while (exPos + 4 <= exEnd) {
        const headerId = cdView.getUint16(exPos, true);
        const dataSize = cdView.getUint16(exPos + 2, true);
        if (headerId === 0x0001) {
          let zPtr = exPos + 4;
          if (uncompSize === 0xffffffff && zPtr + 8 <= exPos + 4 + dataSize) {
            uncompSize = readUint64AsNumber(cdView, zPtr);
            zPtr += 8;
          }
          if (compSize === 0xffffffff && zPtr + 8 <= exPos + 4 + dataSize) {
            compSize = readUint64AsNumber(cdView, zPtr);
            zPtr += 8;
          }
          if (localHeaderOffset === 0xffffffff && zPtr + 8 <= exPos + 4 + dataSize) {
            localHeaderOffset = readUint64AsNumber(cdView, zPtr);
          }
          break;
        }
        exPos += 4 + dataSize;
      }
    }

    const lower = name.toLowerCase();
    const isAppleExportXml =
      !lower.startsWith("__macosx/") &&
      (lower === "export.xml" || lower.endsWith("/export.xml"));

    if (isAppleExportXml) {
      return { name, compMethod, compSize, localHeaderOffset };
    }

    if (
      !fallbackCandidate &&
      !lower.startsWith("__macosx/") &&
      !lower.endsWith("export_cda.xml") &&
      (lower.endsWith(".xml") || lower.endsWith(".csv") || lower.endsWith(".json"))
    ) {
      fallbackCandidate = { name, compMethod, compSize, localHeaderOffset };
    }

    cursor += 46 + nameLen + extraLen + commentLen;
  }

  if (fallbackCandidate) return fallbackCandidate;
  throw new Error(
    "Aucun fichier export.xml (ni CSV/JSON) trouvé dans l'archive ZIP Apple Santé."
  );
}

async function readStreamChunks(
  stream: ReadableStream<Uint8Array>,
  onText: (chunk: string) => void
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.byteLength > 0) {
      onText(decoder.decode(value, { stream: true }));
    }
  }
  const rest = decoder.decode();
  if (rest) onText(rest);
}

/**
 * Lit et analyse un fichier wearable (.zip Apple Santé en streaming sans saturer la RAM,
 * .xml volumineux, .csv, .json ou .txt).
 */
export async function extractAndParseWearableFile(
  file: Blob,
  fileName = "export.xml"
): Promise<ParsedWearableSnapshot> {
  const magic = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const isZipMagic =
    magic.length >= 4 &&
    magic[0] === 0x50 &&
    magic[1] === 0x4b &&
    (magic[2] === 0x03 || magic[2] === 0x05);

  if (isZipMagic || fileName.toLowerCase().endsWith(".zip")) {
    const target = await locateZipTargetEntry(file);
    const lhBuf = await file
      .slice(target.localHeaderOffset, target.localHeaderOffset + 30)
      .arrayBuffer();
    const lhView = new DataView(lhBuf);
    if (lhView.getUint32(0, true) !== 0x04034b50) {
      throw new Error("En-tête ZIP local invalide.");
    }
    const lhNameLen = lhView.getUint16(26, true);
    const lhExtraLen = lhView.getUint16(28, true);
    const dataStart = target.localHeaderOffset + 30 + lhNameLen + lhExtraLen;
    const dataSlice = file.slice(dataStart, dataStart + target.compSize);

    let textStream: ReadableStream<Uint8Array>;
    if (target.compMethod === 0) {
      textStream = dataSlice.stream();
    } else if (target.compMethod === 8) {
      if (typeof DecompressionStream === "undefined") {
        throw new Error(
          "Votre navigateur ne supporte pas la décompression ZIP locale (exportez export.xml ou utilisez le Raccourci iOS)."
        );
      }
      textStream = dataSlice
        .stream()
        .pipeThrough(new DecompressionStream("deflate-raw"));
    } else {
      throw new Error(`Méthode de compression ZIP non supportée (${target.compMethod}).`);
    }

    if (target.name.toLowerCase().endsWith(".xml")) {
      const acc = createAppleHealthXmlAccumulator();
      await readStreamChunks(textStream, acc.feedChunk);
      return acc.finish("Apple Santé (export.zip)");
    }

    let collected = "";
    await readStreamChunks(textStream, (chunk) => {
      collected += chunk;
    });
    return parseWearableExportText(target.name, collected);
  }

  // Gros XML (> 2 Mo) : lecture streaming anti-crash iOS Safari
  if (fileName.toLowerCase().endsWith(".xml") && file.size > 2 * 1024 * 1024) {
    const acc = createAppleHealthXmlAccumulator();
    await readStreamChunks(file.stream(), acc.feedChunk);
    return acc.finish("Apple Santé (export.xml)");
  }

  const rawText = await file.text();
  if (rawText.includes("<HealthData") || rawText.includes("HKQuantityTypeIdentifier")) {
    const acc = createAppleHealthXmlAccumulator();
    acc.feedChunk(rawText);
    return acc.finish("Apple Santé (export XML)");
  }
  return parseWearableExportText(fileName, rawText);
}

export interface ParsedWearableSnapshotInternal extends ParsedWearableSnapshot {}

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
