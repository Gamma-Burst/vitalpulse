"use client";

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

export async function subscribeBrowserToPush(publicKey: string): Promise<PushSubscription> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Notifications Push non supportées sur ce navigateur.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permission de notification refusée par l'utilisateur.");
  }
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(existing),
    });
    return existing;
  }
  const appServerKey = urlBase64ToUint8Array(publicKey);
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: appServerKey.buffer as ArrayBuffer,
  });
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
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
  if (typeof window === "undefined" || typeof Notification === "undefined") {
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

export async function sendFastingTransitionAlert(payload: {
  key: string;
  title: string;
  body: string;
}): Promise<{ deliveredVia: "service-worker" | "web-notification" | "push" | "in-app-only" }> {
  triggerLightHaptic();
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return { deliveredVia: "in-app-only" };
  }
  if (Notification.permission !== "granted") {
    return { deliveredVia: "in-app-only" };
  }

  let deliveredVia: "service-worker" | "web-notification" | "push" | "in-app-only" = "in-app-only";

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

