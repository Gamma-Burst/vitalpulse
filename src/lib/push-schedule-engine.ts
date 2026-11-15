import type {
  CustomChallenge,
  FastingConfig,
  UserProfile,
} from "@/types/vitalpulse";
import {
  computeFastingLiveStatus,
  formatAllowedDurationFr,
  getDefaultEatingStartHm,
  getProtocolSpec,
} from "@/lib/fasting-engine";

export interface PushScheduledReminderSpec {
  id: string;
  title: string;
  targetValue: number;
  unit: string;
  reminderTime: string; // HH:mm
  completedToday: boolean;
}

export interface PushScheduleSpec {
  fasting: {
    enabled: boolean;
    protocolId: string;
    protocolBadge: string;
    dailyScheduleEnabled: boolean;
    eatingWindowStartHm: string;
    eatHours: number;
    fastHours: number;
    activeEndIso: string | null;
    plannedStartIso: string | null;
  };
  quietHours: {
    start: string;
    end: string;
  };
  reminders: PushScheduledReminderSpec[];
}

export interface DuePushNotification {
  key: string;
  title: string;
  body: string;
  tag: string;
  url: string;
}

export function parseHmToMinutes(hm?: string | null): number | null {
  if (!hm || typeof hm !== "string") return null;
  const match = hm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isInteger(hh) || !Number.isInteger(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return null;
  }
  return hh * 60 + mm;
}

export function formatMinutesAsHm(totalMinutes: number): string {
  const norm = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hh = Math.floor(norm / 60);
  const mm = norm % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function isMinuteInQuietHours(
  minuteOfDay: number,
  quietStartHm?: string | null,
  quietEndHm?: string | null
): boolean {
  const startMin = parseHmToMinutes(quietStartHm);
  const endMin = parseHmToMinutes(quietEndHm);
  if (startMin === null || endMin === null || startMin === endMin) {
    return false;
  }
  if (startMin < endMin) {
    return minuteOfDay >= startMin && minuteOfDay < endMin;
  }
  // Plage nocturne traversant minuit (ex: 22:30 -> 07:30)
  return minuteOfDay >= startMin || minuteOfDay < endMin;
}

export function resolveLocalClockInTimezone(
  nowMs: number,
  timezone: string
): {
  dateKey: string;
  hour: number;
  minute: number;
  minuteOfDay: number;
} {
  const safeTz = (() => {
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(nowMs);
      return timezone;
    } catch {
      return "Europe/Brussels";
    }
  })();

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(nowMs);

  const lookup = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  const year = lookup("year");
  const month = lookup("month");
  const day = lookup("day");
  const rawHour = Number(lookup("hour")) % 24;
  const minute = Number(lookup("minute")) % 60;

  return {
    dateKey: `${year}-${month}-${day}`,
    hour: rawHour,
    minute,
    minuteOfDay: rawHour * 60 + minute,
  };
}

function shiftDateKeyMinusOneDay(dateKey: string): string {
  const parsed = Date.parse(`${dateKey}T12:00:00Z`);
  if (!Number.isFinite(parsed)) return dateKey;
  return new Date(parsed - 86_400_000).toISOString().slice(0, 10);
}

function checkForwardWindow(
  currentDateKey: string,
  currentMin: number,
  targetMin: number,
  toleranceMinutes = 12
): { matched: boolean; eventDateKey: string } {
  const diff = (currentMin - targetMin + 1440) % 1440;
  if (diff > toleranceMinutes) {
    return { matched: false, eventDateKey: currentDateKey };
  }
  // Si la cible était juste avant minuit (ex: 23:55) et qu'il est 00:02, la date de l'événement est la veille.
  const eventDateKey =
    currentMin < targetMin ? shiftDateKeyMinusOneDay(currentDateKey) : currentDateKey;
  return { matched: true, eventDateKey };
}

export function sanitizePushScheduleSpec(raw: unknown): PushScheduleSpec {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Partial<PushScheduleSpec>;
  const rawFast = (obj.fasting && typeof obj.fasting === "object"
    ? obj.fasting
    : {}) as Partial<PushScheduleSpec["fasting"]>;
  const rawQuiet = (obj.quietHours && typeof obj.quietHours === "object"
    ? obj.quietHours
    : {}) as Partial<PushScheduleSpec["quietHours"]>;
  const rawReminders = Array.isArray(obj.reminders) ? obj.reminders : [];

  const reminders: PushScheduledReminderSpec[] = rawReminders
    .slice(0, 40)
    .map((r) => ({
      id: String(r?.id || "").slice(0, 80),
      title: String(r?.title || "Objectif du jour").slice(0, 100),
      targetValue: Number.isFinite(Number(r?.targetValue)) ? Number(r.targetValue) : 0,
      unit: String(r?.unit || "").slice(0, 24),
      reminderTime:
        parseHmToMinutes(r?.reminderTime) !== null ? String(r.reminderTime).trim() : "",
      completedToday: Boolean(r?.completedToday),
    }))
    .filter((r) => Boolean(r.id) && Boolean(r.reminderTime));

  return {
    fasting: {
      enabled: Boolean(rawFast.enabled),
      protocolId: String(rawFast.protocolId || "none").slice(0, 24),
      protocolBadge: String(rawFast.protocolBadge || "16:8").slice(0, 24),
      dailyScheduleEnabled: Boolean(rawFast.dailyScheduleEnabled),
      eatingWindowStartHm:
        parseHmToMinutes(rawFast.eatingWindowStartHm) !== null
          ? String(rawFast.eatingWindowStartHm).trim()
          : "12:00",
      eatHours: Number.isFinite(Number(rawFast.eatHours))
        ? Math.max(0, Math.min(24, Number(rawFast.eatHours)))
        : 8,
      fastHours: Number.isFinite(Number(rawFast.fastHours))
        ? Math.max(0, Math.min(48, Number(rawFast.fastHours)))
        : 16,
      activeEndIso:
        typeof rawFast.activeEndIso === "string" && Number.isFinite(Date.parse(rawFast.activeEndIso))
          ? rawFast.activeEndIso
          : null,
      plannedStartIso:
        typeof rawFast.plannedStartIso === "string" &&
        Number.isFinite(Date.parse(rawFast.plannedStartIso))
          ? rawFast.plannedStartIso
          : null,
    },
    quietHours: {
      start: parseHmToMinutes(rawQuiet.start) !== null ? String(rawQuiet.start).trim() : "22:30",
      end: parseHmToMinutes(rawQuiet.end) !== null ? String(rawQuiet.end).trim() : "07:30",
    },
    reminders,
  };
}

export function buildPushScheduleSpecFromState(input: {
  fasting: FastingConfig;
  profile: Pick<UserProfile, "quietHours">;
  challenges: CustomChallenge[];
  goalEvaluations?: Record<string, { reachedToday: boolean }>;
  todayKey: string;
  nowMs?: number;
}): PushScheduleSpec {
  const { fasting, profile, challenges, goalEvaluations, todayKey, nowMs = Date.now() } = input;
  const spec = getProtocolSpec(fasting.protocolId);
  const fastHours =
    fasting.protocolId === "none"
      ? 0
      : Math.max(12, Math.min(36, fasting.fastHours || spec.fastHours || 16));
  const eatHours =
    fasting.protocolId === "none" || fasting.protocolId === "5_2"
      ? 0
      : Math.max(0, fasting.eatHours ?? spec.eatHours ?? Math.max(0, 24 - fastHours));
  const eatingWindowStartHm =
    parseHmToMinutes(fasting.eatingWindowStartHm) !== null
      ? String(fasting.eatingWindowStartHm).trim()
      : getDefaultEatingStartHm(fasting.protocolId);
  const enabled =
    fasting.protocolId !== "none" && fasting.notificationsEnabled !== false;
  const dailyScheduleEnabled = Boolean(
    fasting.dailyScheduleEnabled &&
      fasting.protocolId !== "none" &&
      fasting.protocolId !== "5_2" &&
      eatHours > 0
  );

  let activeEndIso: string | null = null;
  let plannedStartIso: string | null = null;
  if (enabled && !dailyScheduleEnabled) {
    const live = computeFastingLiveStatus(fasting, nowMs);
    if ((live.mode === "fasting" || live.mode === "eating_window") && live.endIso) {
      activeEndIso = live.endIso;
    } else if (live.mode === "scheduled" && live.startIso) {
      plannedStartIso = live.startIso;
    }
  }

  const reminders: PushScheduledReminderSpec[] = challenges
    .filter(
      (ch) =>
        ch.active &&
        ch.celebrateNotifications !== false &&
        parseHmToMinutes(ch.reminderTime) !== null
    )
    .slice(0, 35)
    .map((ch) => ({
      id: ch.id,
      title: ch.title,
      targetValue: ch.targetValue,
      unit: ch.unit,
      reminderTime: ch.reminderTime.trim(),
      completedToday: Boolean(
        goalEvaluations?.[ch.id]?.reachedToday ||
          (Array.isArray(ch.completedDates) && ch.completedDates.includes(todayKey))
      ),
    }));

  return {
    fasting: {
      enabled,
      protocolId: fasting.protocolId,
      protocolBadge:
        fasting.protocolId === "custom" ? `${fastHours}:${Math.max(0, 24 - fastHours)}` : spec.badge,
      dailyScheduleEnabled,
      eatingWindowStartHm,
      eatHours,
      fastHours,
      activeEndIso,
      plannedStartIso,
    },
    quietHours: {
      start: profile.quietHours?.start || "22:30",
      end: profile.quietHours?.end || "07:30",
    },
    reminders,
  };
}

export function evaluateDueScheduledNotifications(params: {
  nowMs: number;
  timezone: string;
  spec: PushScheduleSpec;
  firedKeys: string[];
}): DuePushNotification[] {
  const { nowMs, timezone, spec, firedKeys } = params;
  const firedSet = new Set(Array.isArray(firedKeys) ? firedKeys : []);
  const due: DuePushNotification[] = [];

  const clock = resolveLocalClockInTimezone(nowMs, timezone);

  // 1) Jeûne intermittent en cycle quotidien (ouverture & fermeture fenêtre repas)
  if (spec.fasting.enabled && spec.fasting.dailyScheduleEnabled) {
    const eatStartMin = parseHmToMinutes(spec.fasting.eatingWindowStartHm);
    if (
      eatStartMin !== null &&
      spec.fasting.eatHours > 0 &&
      spec.fasting.eatHours < 24
    ) {
      const eatDurationText = formatAllowedDurationFr(spec.fasting.eatHours);
      const closeMin = (eatStartMin + Math.round(spec.fasting.eatHours * 60)) % 1440;
      const openHm = formatMinutesAsHm(eatStartMin);
      const closeHm = formatMinutesAsHm(closeMin);

      const openCheck = checkForwardWindow(clock.dateKey, clock.minuteOfDay, eatStartMin, 12);
      const openKey = `fast-eat-open:${openCheck.eventDateKey}:${openHm}`;
      if (openCheck.matched && !firedSet.has(openKey)) {
        due.push({
          key: openKey,
          title: `🍽️ Fenêtre repas ouverte · ${spec.fasting.protocolBadge}`,
          body: `Vous êtes autorisé(e) à manger pendant ${eatDurationText} (jusqu'à ${closeHm}). Privilégiez protéines et fibres.`,
          tag: `fw-fast-open-${openCheck.eventDateKey}`,
          url: "/",
        });
      }

      const closeCheck = checkForwardWindow(clock.dateKey, clock.minuteOfDay, closeMin, 12);
      const closeKey = `fast-close:${closeCheck.eventDateKey}:${closeHm}`;
      if (closeCheck.matched && !firedSet.has(closeKey)) {
        due.push({
          key: closeKey,
          title: `⏳ Reprise du jeûne · ${spec.fasting.protocolBadge}`,
          body: `Votre fenêtre repas de ${eatDurationText} est terminée. Reprise du jeûne pour ${spec.fasting.fastHours} h — pensez à bien vous hydrater.`,
          tag: `fw-fast-close-${closeCheck.eventDateKey}`,
          url: "/",
        });
      }
    }
  }

  // 2) Jeûne ponctuel (sans cycle quotidien) : fin ou démarrage planifié
  if (spec.fasting.enabled && !spec.fasting.dailyScheduleEnabled) {
    if (spec.fasting.activeEndIso) {
      const endMs = Date.parse(spec.fasting.activeEndIso);
      const elapsedSinceEnd = nowMs - endMs;
      const endKey = `fast-once-end:${spec.fasting.activeEndIso}`;
      if (
        Number.isFinite(endMs) &&
        elapsedSinceEnd >= 0 &&
        elapsedSinceEnd <= 20 * 60_000 &&
        !firedSet.has(endKey)
      ) {
        due.push({
          key: endKey,
          title: `🎉 Objectif de jeûne atteint · ${spec.fasting.protocolBadge}`,
          body: `Félicitations ! Votre session de ${spec.fasting.fastHours} h est terminée. Vous pouvez ouvrir votre repas sereinement.`,
          tag: "fw-fast-once-end",
          url: "/",
        });
      }
    }

    if (spec.fasting.plannedStartIso) {
      const startMs = Date.parse(spec.fasting.plannedStartIso);
      const elapsedSinceStart = nowMs - startMs;
      const startKey = `fast-once-start:${spec.fasting.plannedStartIso}`;
      if (
        Number.isFinite(startMs) &&
        elapsedSinceStart >= 0 &&
        elapsedSinceStart <= 20 * 60_000 &&
        !firedSet.has(startKey)
      ) {
        due.push({
          key: startKey,
          title: `⏳ Début de votre jeûne planifié · ${spec.fasting.protocolBadge}`,
          body: `C'est l'heure de démarrer votre période de jeûne de ${spec.fasting.fastHours} h. Bonne séance !`,
          tag: "fw-fast-once-start",
          url: "/",
        });
      }
    }
  }

  // 3) Rappels quotidiens des objectifs / challenges personnalisés (hors quietHours et si pas déjà accompli)
  const inQuietHours = isMinuteInQuietHours(
    clock.minuteOfDay,
    spec.quietHours.start,
    spec.quietHours.end
  );
  if (!inQuietHours) {
    for (const rem of spec.reminders) {
      if (rem.completedToday) continue;
      const remMin = parseHmToMinutes(rem.reminderTime);
      if (remMin === null) continue;
      const remCheck = checkForwardWindow(clock.dateKey, clock.minuteOfDay, remMin, 12);
      const remHm = formatMinutesAsHm(remMin);
      const remKey = `rem:${rem.id}:${remCheck.eventDateKey}:${remHm}`;
      if (remCheck.matched && !firedSet.has(remKey)) {
        due.push({
          key: remKey,
          title: `🎯 Rappel objectif · ${rem.title}`,
          body: `Cap du jour : ${rem.targetValue} ${rem.unit}. Ouvrez FolloWeight pour enregistrer votre progression !`.trim(),
          tag: `fw-rem-${rem.id}-${remCheck.eventDateKey}`,
          url: "/",
        });
      }
    }
  }

  return due;
}
