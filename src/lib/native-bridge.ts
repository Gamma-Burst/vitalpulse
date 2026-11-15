"use client";

import type {
  PushScheduleSpec,
} from "@/lib/push-schedule-engine";
import {
  formatMinutesAsHm,
  isMinuteInQuietHours,
  parseHmToMinutes,
} from "@/lib/push-schedule-engine";
import { formatAllowedDurationFr } from "@/lib/fasting-engine";

export interface PlatformCapabilities {
  isCapacitorNative: boolean;
  isAndroid: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasWakeLock: boolean;
  hasMotionSensor: boolean;
}

export function detectPlatformCapabilities(): PlatformCapabilities {
  if (typeof window === "undefined") {
    return {
      isCapacitorNative: false,
      isAndroid: false,
      hasServiceWorker: false,
      hasPushManager: false,
      hasWakeLock: false,
      hasMotionSensor: false,
    };
  }
  const win = window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
  };
  const isCapacitorNative = Boolean(win.Capacitor?.isNativePlatform?.());
  const isAndroid =
    win.Capacitor?.getPlatform?.() === "android" ||
    /Android/i.test(navigator.userAgent);

  return {
    isCapacitorNative,
    isAndroid,
    hasServiceWorker: "serviceWorker" in navigator,
    hasPushManager: "PushManager" in window,
    hasWakeLock: "wakeLock" in navigator,
    hasMotionSensor: "DeviceMotionEvent" in window,
  };
}

/**
 * Compresse côté client toute photo (plat ou frigo) à max 1080px JPEG q=0.78
 * afin d'obtenir un envoi Vision ultra-rapide et un stockage IndexedDB léger.
 */
export async function compressImageFile(file: File, maxDim = 1080): Promise<string> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  if (file.type === "image/svg+xml") {
    return rawUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * ratio));
      const h = Math.max(1, Math.round(img.height * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(rawUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = () => resolve(rawUrl);
    img.src = rawUrl;
  });
}

/**
 * Traite une photo d'évolution corporelle 100 % côté client :
 * 1) Re-dessine dans Canvas pour supprimer EXIF & GPS ;
 * 2) Optionnellement floute/pixelise le haut central (zone visage) avant stockage IndexedDB local.
 */
export async function processBodyProgressPhoto(
  file: File,
  options: { blurFace: boolean; maxDim?: number }
): Promise<string> {
  const maxDim = options.maxDim ?? 1280;
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  if (file.type === "image/svg+xml") {
    return rawUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * ratio));
      const h = Math.max(1, Math.round(img.height * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(rawUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      if (options.blurFace) {
        const fx = Math.round(w * 0.25);
        const fw = Math.round(w * 0.5);
        const fh = Math.round(h * 0.22);
        ctx.save();
        ctx.filter = "blur(18px)";
        ctx.drawImage(canvas, fx, 0, fw, fh, fx, 0, fw, fh);
        ctx.restore();
        ctx.fillStyle = "rgba(11, 18, 21, 0.35)";
        ctx.fillRect(fx, Math.round(fh * 0.25), fw, Math.round(fh * 0.55));
        ctx.fillStyle = "rgba(226, 232, 240, 0.85)";
        ctx.font = `bold ${Math.max(12, Math.round(w * 0.024))}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("Visage masqué (local)", w / 2, Math.round(fh * 0.56));
      }

      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(rawUrl);
    img.src = rawUrl;
  });
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Brussels";
  } catch {
    return "Europe/Brussels";
  }
}

function areServerKeysEqual(
  existingKey: ArrayBuffer | null | undefined,
  expectedKey: Uint8Array
): boolean {
  if (!existingKey) return false;
  const actual = new Uint8Array(existingKey);
  if (actual.length !== expectedKey.length) return false;
  for (let i = 0; i < actual.length; i += 1) {
    if (actual[i] !== expectedKey[i]) return false;
  }
  return true;
}

export async function subscribeBrowserToPush(
  publicKey: string,
  scheduleSpec?: PushScheduleSpec
): Promise<PushSubscription> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Notifications Push non supportées sur ce navigateur.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permission de notification refusée par l'utilisateur.");
  }
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const appServerKey = urlBase64ToUint8Array(publicKey);
  const existing = await reg.pushManager.getSubscription();
  const timezone = getBrowserTimezone();

  if (existing && areServerKeysEqual(existing.options?.applicationServerKey, appServerKey)) {
    const targetRoute = scheduleSpec ? "/api/push/sync-schedule" : "/api/push/subscribe";
    await fetch(targetRoute, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: existing.toJSON(),
        timezone,
        ...(scheduleSpec ? { scheduleSpec } : {}),
      }),
    });
    return existing;
  }

  if (existing) {
    await existing.unsubscribe().catch(() => false);
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: appServerKey.buffer as ArrayBuffer,
  });
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      timezone,
      ...(scheduleSpec ? { scheduleSpec } : {}),
    }),
  });
  return sub;
}

export function triggerLightHaptic(): void {
  if (typeof window === "undefined") return;
  const isNative = Boolean(
    (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.(),
  );
  if (isNative) {
    void import("@capacitor/haptics")
      .then(({ Haptics, ImpactStyle }) =>
        Haptics.impact({ style: ImpactStyle.Light }),
      )
      .catch(() => {
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          navigator.vibrate(10);
        }
      });
    return;
  }
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(10);
    } catch {
      // Ignorer si navigateur bloque la vibration sans geste utilisateur
    }
  }
}

type BackInterceptHandler = () => boolean;
const backInterceptStack: BackInterceptHandler[] = [];
let backListenerBound = false;

function ensureCapacitorBackListener(): void {
  if (backListenerBound || typeof window === "undefined") return;
  const isNative = Boolean(
    (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.(),
  );
  if (!isNative) return;
  backListenerBound = true;
  void import("@capacitor/app")
    .then(({ App }) =>
      App.addListener("backButton", ({ canGoBack }) => {
        for (let i = backInterceptStack.length - 1; i >= 0; i -= 1) {
          try {
            if (backInterceptStack[i]()) {
              return;
            }
          } catch {
            // Poursuivre vers le handler inférieur
          }
        }
        if (canGoBack && window.history.length > 1) {
          window.history.back();
        } else {
          void App.exitApp();
        }
      }),
    )
    .catch(() => {
      backListenerBound = false;
    });
}

export function pushBackIntercept(handler: BackInterceptHandler): () => void {
  backInterceptStack.push(handler);
  ensureCapacitorBackListener();
  return () => {
    const idx = backInterceptStack.lastIndexOf(handler);
    if (idx !== -1) {
      backInterceptStack.splice(idx, 1);
    }
  };
}

export async function requestFastingNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }
  const caps = detectPlatformCapabilities();
  if (caps.isCapacitorNative) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const curr = await LocalNotifications.checkPermissions();
      if (curr.display === "granted") return true;
      const req = await LocalNotifications.requestPermissions();
      return req.display === "granted";
    } catch {
      return false;
    }
  }
  if (typeof Notification === "undefined") {
    return false;
  }
  try {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const perm = await Notification.requestPermission();
    return perm === "granted";
  } catch {
    return false;
  }
}

export async function syncNativeAndroidScheduledNotifications(
  spec: PushScheduleSpec
): Promise<boolean> {
  if (!detectPlatformCapabilities().isCapacitorNative) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return false;

    const channelId = "followeight_reminders";
    await LocalNotifications.createChannel({
      id: channelId,
      name: "Rappels Jeûne & Objectifs",
      description: "Ouverture fenêtre repas, reprise du jeûne et rappels quotidiens d'objectifs",
      importance: 5,
      visibility: 1,
      vibration: true,
    }).catch(() => {});

    const managedIds = Array.from({ length: 99 }, (_, i) => ({ id: 1001 + i }));
    await LocalNotifications.cancel({ notifications: managedIds }).catch(() => {});

    const notifications: Array<{
      id: number;
      title: string;
      body: string;
      channelId: string;
      schedule: { on?: { hour: number; minute: number }; at?: Date; allowWhileIdle: boolean };
    }> = [];

    if (
      spec.fasting.enabled &&
      spec.fasting.dailyScheduleEnabled &&
      spec.fasting.eatHours > 0 &&
      spec.fasting.eatHours < 24
    ) {
      const openMin = parseHmToMinutes(spec.fasting.eatingWindowStartHm);
      if (openMin !== null) {
        const closeMin = (openMin + Math.round(spec.fasting.eatHours * 60)) % 1440;
        const closeHm = formatMinutesAsHm(closeMin);
        const eatDurationText = formatAllowedDurationFr(spec.fasting.eatHours);

        notifications.push({
          id: 1001,
          title: `🍽️ Fenêtre repas ouverte · ${spec.fasting.protocolBadge}`,
          body: `Vous pouvez manger pendant ${eatDurationText} (jusqu'à ${closeHm}).`,
          channelId,
          schedule: {
            on: { hour: Math.floor(openMin / 60), minute: openMin % 60 },
            allowWhileIdle: true,
          },
        });
        notifications.push({
          id: 1002,
          title: `⏳ Reprise du jeûne · ${spec.fasting.protocolBadge}`,
          body: `Votre fenêtre repas de ${eatDurationText} est terminée. Reprise du jeûne pour ${spec.fasting.fastHours} h.`,
          channelId,
          schedule: {
            on: { hour: Math.floor(closeMin / 60), minute: closeMin % 60 },
            allowWhileIdle: true,
          },
        });
      }
    } else if (spec.fasting.enabled && !spec.fasting.dailyScheduleEnabled) {
      const nowMs = Date.now();
      if (spec.fasting.activeEndIso) {
        const endMs = Date.parse(spec.fasting.activeEndIso);
        if (Number.isFinite(endMs) && endMs > nowMs + 5000) {
          notifications.push({
            id: 1003,
            title: `🎉 Objectif de jeûne atteint · ${spec.fasting.protocolBadge}`,
            body: `Votre session de ${spec.fasting.fastHours} h est terminée.`,
            channelId,
            schedule: { at: new Date(endMs), allowWhileIdle: true },
          });
        }
      }
      if (spec.fasting.plannedStartIso) {
        const startMs = Date.parse(spec.fasting.plannedStartIso);
        if (Number.isFinite(startMs) && startMs > nowMs + 5000) {
          notifications.push({
            id: 1004,
            title: `⏳ Début de votre jeûne planifié · ${spec.fasting.protocolBadge}`,
            body: `C'est l'heure de démarrer votre période de jeûne de ${spec.fasting.fastHours} h.`,
            channelId,
            schedule: { at: new Date(startMs), allowWhileIdle: true },
          });
        }
      }
    }

    const activeReminders = spec.reminders.slice(0, 40);
    for (let i = 0; i < activeReminders.length; i += 1) {
      const rem = activeReminders[i];
      const remMin = parseHmToMinutes(rem.reminderTime);
      if (remMin === null) continue;
      if (isMinuteInQuietHours(remMin, spec.quietHours.start, spec.quietHours.end)) {
        continue;
      }
      notifications.push({
        id: 1010 + i,
        title: `🎯 Rappel objectif · ${rem.title}`,
        body: `Cap du jour : ${rem.targetValue} ${rem.unit}.`.trim(),
        channelId,
        schedule: {
          on: { hour: Math.floor(remMin / 60), minute: remMin % 60 },
          allowWhileIdle: true,
        },
      });
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
    return true;
  } catch {
    return false;
  }
}

export async function syncPushScheduleEverywhere(
  spec: PushScheduleSpec,
  options?: { promptPermission?: boolean }
): Promise<{
  mode: "native-android" | "web-push" | "unavailable";
  synced: boolean;
  reason?: string;
}> {
  if (typeof window === "undefined") {
    return { mode: "unavailable", synced: false };
  }

  if (detectPlatformCapabilities().isCapacitorNative) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted" && options?.promptPermission) {
        perm = await LocalNotifications.requestPermissions();
      }
      if (perm.display !== "granted") {
        return {
          mode: "native-android",
          synced: false,
          reason: "Permission de notifications Android refusée.",
        };
      }
      const ok = await syncNativeAndroidScheduledNotifications(spec);
      return {
        mode: "native-android",
        synced: ok,
        ...(ok ? {} : { reason: "Impossible de planifier les alarmes Android." }),
      };
    } catch (err) {
      return {
        mode: "native-android",
        synced: false,
        reason: err instanceof Error ? err.message : "Erreur notifications Android.",
      };
    }
  }

  if (
    typeof Notification === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return {
      mode: "web-push",
      synced: false,
      reason: "Ouvrez FolloWeight dans Chrome ou Samsung Internet (hors mini-navigateur WhatsApp) pour activer les Push.",
    };
  }

  if (Notification.permission === "denied") {
    return {
      mode: "web-push",
      synced: false,
      reason: "Notifications bloquées dans les réglages Chrome/Samsung du site.",
    };
  }

  if (Notification.permission !== "granted" && !options?.promptPermission) {
    return {
      mode: "web-push",
      synced: false,
      reason: "Permission non encore accordée.",
    };
  }

  try {
    const pkRes = await fetch("/api/push/public-key");
    const pkJson = (await pkRes.json()) as { publicKey?: string };
    if (!pkJson?.publicKey) {
      return {
        mode: "web-push",
        synced: false,
        reason: "Clé VAPID publique absente.",
      };
    }
    await subscribeBrowserToPush(pkJson.publicKey, spec);
    return { mode: "web-push", synced: true };
  } catch (err) {
    return {
      mode: "web-push",
      synced: false,
      reason: err instanceof Error ? err.message : "Activation Push impossible.",
    };
  }
}

export async function sendFastingTransitionAlert(payload: {
  key: string;
  title: string;
  body: string;
}): Promise<{
  deliveredVia:
    | "capacitor-local"
    | "service-worker"
    | "web-notification"
    | "push"
    | "in-app-only";
}> {
  triggerLightHaptic();
  if (typeof window !== "undefined" && detectPlatformCapabilities().isCapacitorNative) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display === "granted") {
        await LocalNotifications.createChannel({
          id: "followeight_reminders",
          name: "Rappels Jeûne & Objectifs FolloWeight",
          description: "Ouverture repas, reprise du jeûne et rappels d'objectifs",
          importance: 5,
          visibility: 1,
          vibration: true,
        }).catch(() => {});
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor((Date.now() / 1000) % 900000) + 2000,
              title: payload.title,
              body: payload.body,
              channelId: "followeight_reminders",
              schedule: { at: new Date(Date.now() + 400), allowWhileIdle: true },
              extra: { url: "/", key: payload.key },
            },
          ],
        });
        return { deliveredVia: "capacitor-local" };
      }
    } catch {
      // Fallback vers ServiceWorker / Notification web
    }
  }
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return { deliveredVia: "in-app-only" };
  }
  if (Notification.permission !== "granted") {
    return { deliveredVia: "in-app-only" };
  }

  let deliveredVia:
    | "capacitor-local"
    | "service-worker"
    | "web-notification"
    | "push"
    | "in-app-only" = "in-app-only";

  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: payload.key,
        data: { url: "/" },
      });
      deliveredVia = "service-worker";

      if ("PushManager" in window) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          void fetch("/api/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subscription: sub.toJSON(),
              title: payload.title,
              body: payload.body,
              url: "/",
            }),
          }).catch(() => {});
          deliveredVia = "push";
        }
      }
      return { deliveredVia };
    } catch {
      // Poursuivre sur Notification directe
    }
  }

  try {
    new Notification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      tag: payload.key,
    });
    return { deliveredVia: "web-notification" };
  } catch {
    return { deliveredVia: "in-app-only" };
  }
}

export function scheduleServiceWorkerFastingAlert(params: {
  delayMs: number;
  key: string;
  title: string;
  body: string;
}): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (params.delayMs <= 0 || params.delayMs > 2 * 3600_000) return;
  if (typeof Notification !== "undefined" && Notification.permission !== "granted") return;

  try {
    const controller = navigator.serviceWorker.controller;
    if (controller) {
      controller.postMessage({
        type: "VP_SCHEDULE_FASTING_ALERT",
        ...params,
      });
    }
  } catch {
    // Ignore background worker message errors
  }
}

export function triggerCelebrationHaptic(): void {
  triggerLightHaptic();
  if (typeof window === "undefined") return;
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate([80, 50, 140]);
    } catch {
      // Ignorer si navigateur bloque la vibration sans geste utilisateur
    }
  }
}

export function getNotificationPermissionState():
  | "granted"
  | "denied"
  | "default"
  | "unsupported" {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }
  return Notification.permission;
}

export async function sendGoalCelebrationNotification(payload: {
  key: string;
  title: string;
  body: string;
}): Promise<boolean> {
  triggerCelebrationHaptic();
  const res = await sendFastingTransitionAlert(payload);
  return res.deliveredVia !== "in-app-only";
}


