import { describe, expect, it } from "vitest";
import zlib from "node:zlib";
import {
  computeAgeFromBirthDate,
  computeAnthropometrics,
  formatBirthDateFr,
  isValidBirthDateIso,
  resolveEffectiveAge,
} from "@/lib/metabolic-engine";
import {
  buildIosShortcutSyncUrlTemplate,
  extractAndParseWearableFile,
  isAppleTouchDevice,
  parseAppleWatchSyncParams,
} from "@/lib/wearables-bridge";
import type { UserProfile } from "@/types/vitalpulse";

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildSingleEntryZip(entryName: string, contentUtf8: string): Blob {
  const nameBytes = Buffer.from(entryName, "utf8");
  const rawBytes = Buffer.from(contentUtf8, "utf8");
  const compressed = zlib.deflateRawSync(rawBytes);
  const crc = crc32(rawBytes);

  // Local File Header (30 + nameBytes.length)
  const localHeader = Buffer.alloc(30 + nameBytes.length);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(8, 8); // deflate
  localHeader.writeUInt16LE(0, 10);
  localHeader.writeUInt16LE(0, 12);
  localHeader.writeUInt32LE(crc, 14);
  localHeader.writeUInt32LE(compressed.length, 18);
  localHeader.writeUInt32LE(rawBytes.length, 22);
  localHeader.writeUInt16LE(nameBytes.length, 26);
  localHeader.writeUInt16LE(0, 28);
  nameBytes.copy(localHeader, 30);

  const cdOffset = localHeader.length + compressed.length;

  // Central Directory Entry (46 + nameBytes.length)
  const cdEntry = Buffer.alloc(46 + nameBytes.length);
  cdEntry.writeUInt32LE(0x02014b50, 0);
  cdEntry.writeUInt16LE(20, 4);
  cdEntry.writeUInt16LE(20, 6);
  cdEntry.writeUInt16LE(0, 8);
  cdEntry.writeUInt16LE(8, 10);
  cdEntry.writeUInt16LE(0, 12);
  cdEntry.writeUInt16LE(0, 14);
  cdEntry.writeUInt32LE(crc, 16);
  cdEntry.writeUInt32LE(compressed.length, 20);
  cdEntry.writeUInt32LE(rawBytes.length, 24);
  cdEntry.writeUInt16LE(nameBytes.length, 28);
  cdEntry.writeUInt16LE(0, 30);
  cdEntry.writeUInt16LE(0, 32);
  cdEntry.writeUInt16LE(0, 34);
  cdEntry.writeUInt16LE(0, 36);
  cdEntry.writeUInt32LE(0, 38);
  cdEntry.writeUInt32LE(0, 42); // localHeaderOffset
  nameBytes.copy(cdEntry, 46);

  // End of Central Directory (22)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cdEntry.length, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return new Blob([localHeader, compressed, cdEntry, eocd], {
    type: "application/zip",
  });
}

describe("FolloWeight v4.3 — Date de naissance, Apple Watch iOS & ZIP streaming", () => {
  it("calcule exactement l'âge avant et le jour même de l'anniversaire et gère les dates bissextiles", () => {
    expect(computeAgeFromBirthDate("1991-03-14", new Date(2026, 2, 13))).toBe(34);
    expect(computeAgeFromBirthDate("1991-03-14", new Date(2026, 2, 14))).toBe(35);
    expect(isValidBirthDateIso("2000-02-29", new Date(2026, 10, 15))).toBe(true);
    expect(isValidBirthDateIso("1991-02-31", new Date(2026, 10, 15))).toBe(false);
    expect(isValidBirthDateIso("2030-01-01", new Date(2026, 10, 15))).toBe(false);
    expect(formatBirthDateFr("1991-03-14")).toContain("1991");
  });

  it("priorise la date de naissance dans resolveEffectiveAge et déclenche minorSafetyLock si < 18 ans", () => {
    const yearMinor = new Date().getFullYear() - 16;
    const minorDob = `${yearMinor}-01-01`;
    expect(resolveEffectiveAge({ age: 30, birthDate: minorDob })).toBe(16);

    const minorProfile: UserProfile = {
      name: "Lucas",
      age: 30, // valeur périmée volontaire pour tester la priorité de birthDate
      birthDate: minorDob,
      sex: "male",
      heightCm: 172,
      weightKg: 62,
      targetWeightKg: 60,
      activityProfile: "active",
      primaryGoal: "fat_loss",
      weeklyPaceKg: -0.5,
      dailyStepGoal: 9000,
      specialMode: "standard",
      quietHours: { start: "22:00", end: "07:00" },
    };

    const report = computeAnthropometrics(minorProfile);
    expect(report.minorSafetyLock).toBe(true);
  });

  it("détecte les appareils iOS et parse proprement les paramètres Raccourci iOS ?aw_sync=1 et #aw_sync=1", () => {
    expect(
      isAppleTouchDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15",
        "iPhone",
        5
      )
    ).toBe(true);
    expect(
      isAppleTouchDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 5)
    ).toBe(true);
    expect(
      isAppleTouchDevice(
        "Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/131.0.0.0 Mobile",
        "Linux aarch64",
        5
      )
    ).toBe(false);

    const tpl = buildIosShortcutSyncUrlTemplate("https://followeight.com");
    expect(tpl).toContain("https://followeight.com/?aw_sync=1&steps=[Pas]");

    const fromQuery = parseAppleWatchSyncParams(
      "?aw_sync=1&steps=9240&kcal=410&bpm=62&weight=74,5&ex=38"
    );
    expect(fromQuery).not.toBeNull();
    expect(fromQuery?.steps).toBe(9240);
    expect(fromQuery?.activeKcal).toBe(410);
    expect(fromQuery?.heartRateBpm).toBe(62);
    expect(fromQuery?.weightKg).toBe(74.5);
    expect(fromQuery?.exerciseMinutes).toBe(38);
    expect(fromQuery?.sourceLabel).toContain("Apple Watch");

    const fromHash = parseAppleWatchSyncParams("", "#aw_sync=1&steps=6100&bpm=68");
    expect(fromHash?.steps).toBe(6100);
    expect(fromHash?.heartRateBpm).toBe(68);

    expect(parseAppleWatchSyncParams("?steps=5000")).toBeNull();
  });

  it("extrait en streaming apple_health_export/export.xml depuis un véritable fichier export.zip compressé deflate-raw", async () => {
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="fr_FR">
  <Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-11-14 09:00:00 +0100" value="3000" />
  <Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-11-15 08:30:00 +0100" value="4200" />
  <Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-11-15 17:45:00 +0100" value="5100" />
  <Record type="HKQuantityTypeIdentifierActiveEnergyBurned" startDate="2026-11-15 09:10:00 +0100" value="280" />
  <Record type="HKQuantityTypeIdentifierActiveEnergyBurned" startDate="2026-11-15 18:10:00 +0100" value="145" />
  <Record type="HKQuantityTypeIdentifierAppleExerciseTime" startDate="2026-11-15 18:12:00 +0100" value="36" />
  <Record type="HKQuantityTypeIdentifierBodyMass" startDate="2026-11-14 07:00:00 +0100" value="74.1" />
  <Record type="HKQuantityTypeIdentifierBodyMass" startDate="2026-11-15 07:05:00 +0100" value="73.4" />
  <Record type="HKQuantityTypeIdentifierHeartRate" startDate="2026-11-15 18:20:00 +0100" value="61" />
</HealthData>`;

    const zipBlob = buildSingleEntryZip("apple_health_export/export.xml", sampleXml);
    const parsed = await extractAndParseWearableFile(zipBlob, "export.zip");

    expect(parsed.steps).toBe(9300);
    expect(parsed.activeKcal).toBe(425);
    expect(parsed.exerciseMinutes).toBe(36);
    expect(parsed.weightKg).toBe(73.4);
    expect(parsed.heartRateBpm).toBe(61);
    expect(parsed.sourceLabel).toContain("export.zip");
    expect(parsed.sourceLabel).toContain("2026-11-15");
  });
});
