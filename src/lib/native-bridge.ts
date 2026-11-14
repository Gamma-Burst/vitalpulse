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
