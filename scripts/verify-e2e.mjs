import zlib from "zlib";

const BASE = process.env.VITALPULSE_BASE_URL || "http://localhost:3080";

function makeTinyPngDataUrl() {
  function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) {
      let x = (c ^ buf[i]) & 0xff;
      for (let k = 0; k < 8; k++) x = x & 1 ? 0xedb88320 ^ (x >>> 1) : x >>> 1;
      c = (c >>> 8) ^ x;
    }
    return (c ^ -1) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  }
  const size = 64;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const idx = row + 1 + x * 4;
      const dist = Math.hypot(x - 32, y - 32);
      // Simple dish-like circle: salmon coral + green broccoli + white plate
      if (dist > 26) {
        raw[idx] = 30; raw[idx + 1] = 40; raw[idx + 2] = 48; raw[idx + 3] = 255;
      } else if (x < 32 && y < 34) {
        raw[idx] = 240; raw[idx + 1] = 120; raw[idx + 2] = 110; raw[idx + 3] = 255;
      } else if (x >= 32 && y >= 32) {
        raw[idx] = 60; raw[idx + 1] = 180; raw[idx + 2] = 85; raw[idx + 3] = 255;
      } else {
        raw[idx] = 242; raw[idx + 1] = 235; raw[idx + 2] = 210; raw[idx + 3] = 255;
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function main() {
  const results = {};

  // 1. Home page + manifest + rebrand FolloWeight
  const homeRes = await fetch(BASE);
  const homeHtml = await homeRes.text();
  results.home_status = homeRes.status;
  results.has_manifest_link = homeHtml.includes("manifest.webmanifest");
  results.has_followeight_brand = homeHtml.includes("FolloWeight");

  // 2. Analyze meal (Raster PNG + User Notes)
  const mealRes = await fetch(`${BASE}/api/analyze-meal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: makeTinyPngDataUrl(),
      userNotes: "Pavé de saumon 150g, riz basmati 140g, brocolis, cuit avec 1 c.à.s d'huile d'olive, assiette 26cm, mangé aux 3/4",
      plateDiameterCm: 26,
      portionEatenPct: 75,
      mealType: "lunch",
      specialMode: "standard",
    }),
  });
  const mealJson = await mealRes.json();
  results.analyze_meal_status = mealRes.status;
  results.analyze_meal_provider = mealJson.analysisProvider;
  results.analyze_meal_kcal = mealJson.caloriesCentral;
  results.analyze_meal_range_valid = mealJson.caloriesMin < mealJson.caloriesCentral && mealJson.caloriesCentral < mealJson.caloriesMax;

  // 3. Analyze fridge
  const fridgeRes = await fetch(`${BASE}/api/analyze-fridge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userNotes: "3 œufs, courgettes, tomates cerises, filets de poulet, yaourt grec, riz basmati",
      remainingKcal: 620,
      remainingProteinG: 42,
      remainingFiberG: 10,
      maxMinutes: 20,
    }),
  });
  const fridgeJson = await fridgeRes.json();
  results.analyze_fridge_status = fridgeRes.status;
  results.fridge_recipes_count = Array.isArray(fridgeJson.recipes) ? fridgeJson.recipes.length : 0;
  results.fridge_first_recipe_steps = fridgeJson.recipes?.[0]?.steps?.length ?? 0;

  // 4. Live PubMed Medical feed
  const medRes = await fetch(`${BASE}/api/medical-feed?topic=weight_loss`);
  const medJson = await medRes.json();
  results.medical_feed_status = medRes.status;
  results.pubmed_live_ok = medJson.pubmedLiveOk;
  results.pubmed_articles_count = Array.isArray(medJson.liveArticles) ? medJson.liveArticles.length : 0;
  results.first_pmid = medJson.liveArticles?.[0]?.pmid ?? null;

  // 5. VAPID public key
  const pkRes = await fetch(`${BASE}/api/push/public-key`);
  const pkJson = await pkRes.json();
  results.push_pk_status = pkRes.status;
  results.push_configured = pkJson.configured;

  // 6. Blood panel analysis (FR/SI parsing + CKD-EPI + FIB-4)
  const bloodRes = await fetch(`${BASE}/api/analyze-blood`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rawText:
        "Glycémie 0,94 g/L, HbA1c 5,4 %, LDL 1,15 g/L, Triglycérides 1,10 g/L, Créatinine 9,0 mg/L, ALAT 24 UI/L, ASAT 22 UI/L, Plaquettes 250 G/L",
      context: { fasting: true, pregnant: false },
      profile: { age: 40, sex: "male" },
    }),
  });
  const bloodJson = await bloodRes.json();
  results.analyze_blood_status = bloodRes.status;
  results.blood_evaluated_count = Array.isArray(bloodJson.analysis?.evaluatedMarkers)
    ? bloodJson.analysis.evaluatedMarkers.length
    : 0;
  results.blood_derived_count = Array.isArray(bloodJson.analysis?.derivedMetrics)
    ? bloodJson.analysis.derivedMetrics.length
    : 0;
  results.blood_provider = bloodJson.analysis?.provider ?? null;

  // 7. Barcode API (/api/barcode)
  const barcodeRes = await fetch(`${BASE}/api/barcode?code=3017620422003`);
  const barcodeJson = await barcodeRes.json();
  results.barcode_status = barcodeRes.status;
  results.barcode_found = Boolean(barcodeJson.found);
  results.barcode_kcal = barcodeJson.per100g?.kcal ?? 0;
  results.barcode_nutriscore = barcodeJson.nutriScore ?? null;
  results.barcode_nova = barcodeJson.novaGroup ?? null;

  // 8. FW AI coach endpoint (/api/fw-ai)
  const fwAiRes = await fetch(`${BASE}/api/fw-ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Analyse ma journée en 3 lignes pour ma prise de masse propre",
      context: {
        profile: {
          name: "Test",
          age: 29,
          sex: "male",
          weightKg: 76,
          targetWeightKg: 80,
          primaryGoal: "muscle_gain",
          specialMode: "high_protein_athlete",
        },
        anthro: {
          bmi: 23.4,
          targetIntakeKcal: 2650,
          clinicalFloorKcal: 1700,
          estimatedMaintenanceKcal: 2450,
          perMealProteinBolusG: 38,
          targets: {
            proteinG: 152,
            carbsG: 310,
            fatG: 80,
            fiberG: 34,
            waterMl: 2500,
            sodiumMaxMg: 2400,
          },
        },
        todayBalance: {
          intakeKcal: 1800,
          targetIntakeKcal: 2950,
          sportRefuelKcal: 300,
          remainingToTargetKcal: 1150,
          activeCaloriesKcal: 380,
          workoutMinutes: 55,
          rawSteps: 7400,
          waterMl: 1900,
          macros: { proteinG: 110, carbsG: 190, fatG: 52, fiberG: 22, sodiumMg: 1200 },
        },
      },
    }),
  });
  const fwAiJson = await fwAiRes.json();
  results.fw_ai_status = fwAiRes.status;
  results.fw_ai_provider = fwAiJson.provider ?? null;
  results.fw_ai_has_reply = typeof fwAiJson.replyFr === "string" && fwAiJson.replyFr.length > 20;

  console.log(JSON.stringify(results, null, 2));

  const allOk =
    results.home_status === 200 &&
    results.has_manifest_link &&
    results.has_followeight_brand &&
    results.analyze_meal_status === 200 &&
    results.analyze_meal_kcal > 0 &&
    results.analyze_meal_range_valid &&
    results.analyze_fridge_status === 200 &&
    results.fridge_recipes_count === 3 &&
    results.fridge_first_recipe_steps >= 3 &&
    results.medical_feed_status === 200 &&
    results.push_pk_status === 200 &&
    results.push_configured &&
    results.analyze_blood_status === 200 &&
    results.blood_evaluated_count >= 6 &&
    results.blood_derived_count >= 2 &&
    results.barcode_status === 200 &&
    results.barcode_found &&
    results.barcode_kcal >= 500 &&
    results.fw_ai_status === 200 &&
    results.fw_ai_has_reply;

  if (!allOk) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
