"use client";

import React, { useState } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";

export function DeleteLocalDataButton() {
  const [status, setStatus] = useState<"idle" | "working" | "done">("idle");
  const [details, setDetails] = useState<string | null>(null);

  async function handlePurgeAll() {
    setStatus("working");
    setDetails(null);
    const cleanedItems: string[] = [];

    try {
      if (typeof indexedDB !== "undefined") {
        await new Promise<void>((resolve) => {
          const req = indexedDB.deleteDatabase("vitalpulse_idb");
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
          window.setTimeout(resolve, 1200);
        });
        cleanedItems.push("Base locale IndexedDB (vitalpulse_idb)");
      }
    } catch {
      // noop
    }

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && (k.startsWith("vitalpulse") || k.startsWith("followeight"))) {
            keysToRemove.push(k);
          }
        }
        for (const k of keysToRemove) {
          window.localStorage.removeItem(k);
        }
        cleanedItems.push(
          `Préférences locales (${keysToRemove.length} clé${keysToRemove.length > 1 ? "s" : ""})`
        );
      }
    } catch {
      // noop
    }

    try {
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.pushManager) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await sub.unsubscribe();
            cleanedItems.push("Abonnement notifications Push");
          }
        }
      }
    } catch {
      // noop
    }

    setStatus("done");
    setDetails(
      cleanedItems.length > 0
        ? `Supprimé avec succès : ${cleanedItems.join(" · ")}.`
        : "Aucune donnée locale résiduelle détectée sur cet appareil."
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={status === "working"}
        onClick={() => void handlePurgeAll()}
        className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-slate-950 hover:bg-rose-400 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
        {status === "working"
          ? "Suppression en cours..."
          : "Effacer immédiatement toutes mes données locales sur cet appareil"}
      </button>

      {status === "done" && details && (
        <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/15 p-3 text-xs text-emerald-100 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0 mt-0.5" />
          <span>{details}</span>
        </div>
      )}
    </div>
  );
}
