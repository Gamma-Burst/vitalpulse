import { describe, expect, it } from "vitest";
import {
  signEntitlementToken,
  verifyEntitlementToken,
  verifyStripeWebhookSignature,
} from "../src/lib/billing-server";
import {
  canRunVisionScan,
  canUseLiveWebSearch,
  createDefaultSubscriptionState,
  FREE_DISCOVERY_VISION_SCANS,
  FW_PLUS_DAILY_SOFT_CAP,
  getPlansForPlatform,
  normalizeSubscriptionForToday,
  recordVisionScanUsage,
  recordWebSearchUsage,
  startSevenDayFreeTrial,
} from "../src/lib/billing-bridge";
import {
  buildDeterministicFwAiReply,
  shouldEnableLiveWebSearch,
} from "../src/lib/fw-ai-engine";
import { createHmac } from "crypto";

describe("FolloWeight Play Store & Web Billing", () => {
  it("signe et vérifie un code portable FWPLUS et rejette toute altération ou expiration", () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const token = signEntitlementToken(
      {
        sub: "cus_test_123",
        tier: "founder_lifetime",
        source: "web_followeight",
        exp: nowSec + 3600,
        email: "chris@followeight.com",
        customerId: "cus_test_123",
      },
      "unit-test-secret-key-2026"
    );

    expect(token.startsWith("FWPLUS.")).toBe(true);
    const valid = verifyEntitlementToken(token, nowSec, "unit-test-secret-key-2026");
    expect(valid.valid).toBe(true);
    expect(valid.payload?.tier).toBe("founder_lifetime");
    expect(valid.payload?.email).toBe("chris@followeight.com");

    const tampered = `${token.slice(0, -4)}AAAA`;
    const badSig = verifyEntitlementToken(tampered, nowSec, "unit-test-secret-key-2026");
    expect(badSig.valid).toBe(false);
    expect(badSig.reason).toBe("SIGNATURE_INVALID");

    const expired = verifyEntitlementToken(
      token,
      nowSec + 7200,
      "unit-test-secret-key-2026"
    );
    expect(expired.valid).toBe(false);
    expect(expired.reason).toBe("TOKEN_EXPIRED");
  });

  it("masque Pass Fondateur et mentions Stripe sur Android natif (conformité Google Play)", () => {
    const androidPlans = getPlansForPlatform(true);
    expect(androidPlans.some((p) => p.id === "founder_lifetime")).toBe(false);
    expect(
      androidPlans.some((p) =>
        `${p.channelFr} ${p.nameFr} ${p.highlightsFr.join(" ")}`
          .toLowerCase()
          .includes("stripe")
      )
    ).toBe(false);

    const webPlans = getPlansForPlatform(false);
    expect(webPlans.some((p) => p.id === "founder_lifetime")).toBe(true);
  });

  it("valide correctement les signatures HMAC des webhooks Stripe", () => {
    const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
    const ts = Math.floor(Date.now() / 1000);
    const secret = "whsec_test_followeight";
    const sig = createHmac("sha256", secret)
      .update(`${ts}.${body}`, "utf8")
      .digest("hex");
    expect(verifyStripeWebhookSignature(body, `t=${ts},v1=${sig}`, secret)).toBe(true);
    expect(verifyStripeWebhookSignature(body, `t=${ts},v1=deadbeef`, secret)).toBe(false);
  });

  it("suit les quotas de recherche Web temps réel et réinitialise le compteur au changement de jour", () => {
    let sub = createDefaultSubscriptionState("2026-11-15");
    expect(canUseLiveWebSearch(sub, "2026-11-15").allowed).toBe(true);
    expect(canUseLiveWebSearch(sub, "2026-11-15").limitToday).toBe(1);

    sub = recordWebSearchUsage(sub, "2026-11-15");
    expect(canUseLiveWebSearch(sub, "2026-11-15").allowed).toBe(false);

    const nextDay = normalizeSubscriptionForToday(sub, "2026-11-16");
    expect(nextDay.dailyWebSearchCount).toBe(0);
    expect(canUseLiveWebSearch(nextDay, "2026-11-16").allowed).toBe(true);
  });

  it("applique le Pack Découverte de 5 scans photo IA offerts sans reset quotidien et débloque 80/j avec FW+", () => {
    expect(FREE_DISCOVERY_VISION_SCANS).toBe(5);
    let sub = createDefaultSubscriptionState("2026-11-15");
    const initial = canRunVisionScan(sub, "2026-11-15");
    expect(initial.allowed).toBe(true);
    expect(initial.remaining).toBe(5);
    expect(initial.limit).toBe(5);
    expect(initial.isDiscoveryPack).toBe(true);

    for (let i = 0; i < 5; i += 1) {
      sub = recordVisionScanUsage(sub, "2026-11-15");
    }
    const exhausted = canRunVisionScan(sub, "2026-11-15");
    expect(exhausted.allowed).toBe(false);
    expect(exhausted.remaining).toBe(0);

    // Le pack découverte ne se réinitialise pas le lendemain
    const nextDay = normalizeSubscriptionForToday(sub, "2026-11-16");
    expect(nextDay.visionScansUsedToday).toBe(0);
    expect(nextDay.totalFreeVisionScansUsed).toBe(5);
    expect(canRunVisionScan(nextDay, "2026-11-16").allowed).toBe(false);

    // L'activation de l'essai FW+ 7j débloque immédiatement le plafond FW+ (80/jour)
    const trial = startSevenDayFreeTrial(nextDay, "2026-11-16");
    const trialQuota = canRunVisionScan(trial, "2026-11-16");
    expect(trialQuota.allowed).toBe(true);
    expect(trialQuota.isPlus).toBe(true);
    expect(trialQuota.isDiscoveryPack).toBe(false);
    expect(trialQuota.limit).toBe(FW_PLUS_DAILY_SOFT_CAP);

    const afterPlusScan = recordVisionScanUsage(trial, "2026-11-16");
    expect(afterPlusScan.totalFreeVisionScansUsed).toBe(5);
    expect(afterPlusScan.visionScansUsedToday).toBe(1);
  });
});

describe("Routage sélectif AI Cost & Garde-fou Grossesse", () => {
  it("évite l'outil Web Search coûteux sur les questions personnelles ou méta", () => {
    expect(shouldEnableLiveWebSearch("Analyse ma journée (calories, protéines, sport)")).toBe(false);
    expect(shouldEnableLiveWebSearch("tu es connecté à internet ?")).toBe(false);
    expect(shouldEnableLiveWebSearch("Pourquoi mon poids varie d'un jour à l'autre ?")).toBe(false);
  });

  it("active la recherche Web temps réel pour marques, restaurants et études scientifiques", () => {
    expect(shouldEnableLiveWebSearch("Combien de calories dans un Big Mac McDo ?")).toBe(true);
    expect(shouldEnableLiveWebSearch("Nouvelle étude PubMed sur la créatine en 2025")).toBe(true);
    expect(shouldEnableLiveWebSearch("Compare Skyr Lidl et YoPro Danone")).toBe(true);
  });

  it("bloque jeûne strict et déficit calorique pendant la grossesse", () => {
    const reply = buildDeterministicFwAiReply({
      question: "Puis-je faire un jeûne OMAD pour maigrir vite ?",
      context: {
        profile: {
          age: 29,
          sex: "female",
          pregnant: true,
          weightKg: 68,
          targetWeightKg: 68,
          primaryGoal: "maintenance",
          specialMode: "standard",
        },
        anthro: {
          bmi: 24.1,
          targetIntakeKcal: 2150,
          clinicalFloorKcal: 1500,
          estimatedMaintenanceKcal: 2150,
          perMealProteinBolusG: 28,
          targets: {
            proteinG: 110,
            carbsG: 240,
            fatG: 75,
            fiberG: 30,
            waterMl: 2300,
            sodiumMaxMg: 2300,
          },
        },
        todayBalance: {
          intakeKcal: 900,
          targetIntakeKcal: 2150,
          sportRefuelKcal: 0,
          remainingToTargetKcal: 1250,
          activeCaloriesKcal: 120,
          workoutMinutes: 0,
          rawSteps: 4500,
          waterMl: 1200,
          macros: { proteinG: 45, carbsG: 100, fatG: 30, fiberG: 12, sodiumMg: 700 },
        },
      },
    });
    expect(reply.safetyGuardTriggered).toBe(true);
    expect(reply.replyFr.toLowerCase()).toContain("grossesse");
  });
});
