import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface BarcodeNutritionPer100g {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  satFatG: number;
  sodiumMg: number;
}

export interface BarcodeProductPayload {
  found: boolean;
  code: string;
  productName: string;
  brand: string;
  nutriScore: string;
  novaGroup: 1 | 2 | 3 | 4;
  servingLabel: string;
  per100g: BarcodeNutritionPer100g;
  imageUrl?: string;
  provider: "openfoodfacts" | "local-catalog";
}

const LOCAL_FRENCH_BARCODES: Record<string, Omit<BarcodeProductPayload, "found" | "code" | "provider">> = {
  "3017620422003": {
    productName: "Pâte à tartiner noisettes & cacao (exemple test)",
    brand: "Ferrero / Référence EAN",
    nutriScore: "E",
    novaGroup: 4,
    servingLabel: "15 g (1 c. à café bombée)",
    per100g: {
      kcal: 539,
      proteinG: 6.3,
      carbsG: 57.5,
      fatG: 30.9,
      fiberG: 3.4,
      sugarG: 56.3,
      satFatG: 10.6,
      sodiumMg: 42,
    },
  },
  "3033490004743": {
    productName: "Skyr Nature 0 % MG",
    brand: "Danone / Référence laitière",
    nutriScore: "A",
    novaGroup: 1,
    servingLabel: "140 g (1 pot)",
    per100g: {
      kcal: 62,
      proteinG: 10.0,
      carbsG: 4.0,
      fatG: 0.2,
      fiberG: 0,
      sugarG: 4.0,
      satFatG: 0.1,
      sodiumMg: 38,
    },
  },
  "3229820129488": {
    productName: "Flocons d'avoine complets bio",
    brand: "Bjorg",
    nutriScore: "A",
    novaGroup: 1,
    servingLabel: "45 g (1 bol)",
    per100g: {
      kcal: 368,
      proteinG: 13.5,
      carbsG: 58.7,
      fatG: 7.0,
      fiberG: 10.0,
      sugarG: 1.2,
      satFatG: 1.2,
      sodiumMg: 7,
    },
  },
  "3250391378623": {
    productName: "Filets de blanc de poulet rôti",
    brand: "Référence charcuterie maigre",
    nutriScore: "B",
    novaGroup: 3,
    servingLabel: "120 g",
    per100g: {
      kcal: 108,
      proteinG: 22.0,
      carbsG: 1.0,
      fatG: 1.6,
      fiberG: 0,
      sugarG: 0.7,
      satFatG: 0.5,
      sodiumMg: 620,
    },
  },
  "3045320094004": {
    productName: "Chocolat Noir 85 % Cacao",
    brand: "Excellence",
    nutriScore: "D",
    novaGroup: 3,
    servingLabel: "20 g (2 carrés)",
    per100g: {
      kcal: 584,
      proteinG: 12.5,
      carbsG: 19.0,
      fatG: 46.0,
      fiberG: 15.0,
      sugarG: 14.0,
      satFatG: 28.0,
      sodiumMg: 8,
    },
  },
};

export async function GET(req: NextRequest) {
  const rawCode = (req.nextUrl.searchParams.get("code") || "").replace(/[^0-9]/g, "");
  if (rawCode.length < 8 || rawCode.length > 14) {
    return NextResponse.json(
      { error: "Code-barres invalide (8 à 14 chiffres requis)." },
      { status: 400 }
    );
  }

  try {
    const offRes = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${rawCode}.json?fields=product_name,product_name_fr,brands,nutriscore_grade,nova_group,serving_size,image_front_small_url,nutriments`,
      {
        headers: { "User-Agent": "FolloWeight/4.0 (health-app)" },
        signal: AbortSignal.timeout(7000),
      }
    );

    if (offRes.ok) {
      const json = (await offRes.json()) as {
        status?: number;
        product?: {
          product_name_fr?: string;
          product_name?: string;
          brands?: string;
          nutriscore_grade?: string;
          nova_group?: number;
          serving_size?: string;
          image_front_small_url?: string;
          nutriments?: Record<string, number>;
        };
      };

      if (json.status === 1 && json.product) {
        const n = json.product.nutriments || {};
        const kcal = Math.round(
          Number(n["energy-kcal_100g"] ?? n["energy-kcal"] ?? 0)
        );
        if (kcal > 0) {
          const saltG = Number(n.salt_100g ?? 0);
          const sodiumMg = n.sodium_100g
            ? Math.round(Number(n.sodium_100g) * 1000)
            : Math.round(saltG * 400);
          const novaRaw = Number(json.product.nova_group || 2);
          const novaGroup = (novaRaw >= 1 && novaRaw <= 4 ? novaRaw : 2) as 1 | 2 | 3 | 4;

          const payload: BarcodeProductPayload = {
            found: true,
            code: rawCode,
            productName:
              json.product.product_name_fr || json.product.product_name || `Produit EAN ${rawCode}`,
            brand: json.product.brands || "Marque renseignée",
            nutriScore: (json.product.nutriscore_grade || "?").toUpperCase(),
            novaGroup,
            servingLabel: json.product.serving_size || "100 g",
            per100g: {
              kcal,
              proteinG: +Number(n.proteins_100g ?? 0).toFixed(1),
              carbsG: +Number(n.carbohydrates_100g ?? 0).toFixed(1),
              fatG: +Number(n.fat_100g ?? 0).toFixed(1),
              fiberG: +Number(n.fiber_100g ?? 0).toFixed(1),
              sugarG: +Number(n.sugars_100g ?? 0).toFixed(1),
              satFatG: +Number(n["saturated-fat_100g"] ?? 0).toFixed(1),
              sodiumMg,
            },
            imageUrl: json.product.image_front_small_url,
            provider: "openfoodfacts",
          };
          return NextResponse.json(payload);
        }
      }
    }
  } catch {
    // Repli catalogue local si hors-ligne ou timeout
  }

  const local = LOCAL_FRENCH_BARCODES[rawCode];
  if (local) {
    return NextResponse.json({
      found: true,
      code: rawCode,
      ...local,
      provider: "local-catalog",
    } satisfies BarcodeProductPayload);
  }

  return NextResponse.json(
    {
      found: false,
      code: rawCode,
      error: "Produit introuvable sur OpenFoodFacts. Essayez un autre code ou utilisez la photo du plat.",
    },
    { status: 404 }
  );
}
