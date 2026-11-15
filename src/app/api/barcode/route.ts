import { NextRequest, NextResponse } from "next/server";
import {
  resolveProductStoreOrigin,
  type ProductStoreOrigin,
} from "@/lib/barcode-store-origin";
import {
  isTierEntitledToPaidQuota,
  verifyEntitlementToken,
} from "@/lib/billing-server";

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
  storeOrigin?: ProductStoreOrigin;
  storeOriginLocked?: boolean;
  visionMatchedFromPhoto?: boolean;
}

interface LocalBarcodeCatalogEntry {
  productName: string;
  brand: string;
  nutriScore: string;
  novaGroup: 1 | 2 | 3 | 4;
  servingLabel: string;
  per100g: BarcodeNutritionPer100g;
  stores?: string;
  brandsTags?: string[];
  countriesTags?: string[];
}

interface OpenFoodFactsProductRaw {
  code?: string;
  product_name_fr?: string;
  product_name?: string;
  brands?: string;
  brands_tags?: string[];
  stores?: string;
  stores_tags?: string[];
  countries?: string;
  countries_tags?: string[];
  nutriscore_grade?: string;
  nova_group?: number;
  serving_size?: string;
  image_front_small_url?: string;
  nutriments?: Record<string, number>;
}

const OFF_FIELDS =
  "code,product_name,product_name_fr,brands,brands_tags,stores,stores_tags,countries,countries_tags,nutriscore_grade,nova_group,serving_size,image_front_small_url,nutriments";

const LOCAL_FRENCH_BARCODES: Record<string, LocalBarcodeCatalogEntry> = {
  "3017620422003": {
    productName: "Pâte à tartiner noisettes & cacao (exemple test)",
    brand: "Ferrero / Nutella",
    brandsTags: ["ferrero", "nutella"],
    stores: "Aldi, Auchan, Carrefour, Delhaize, Colruyt, Intermarché, E.Leclerc, Lidl",
    countriesTags: ["en:belgium", "en:france", "en:luxembourg"],
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
  "20724696": {
    productName: "Amandes entières",
    brand: "Alesto",
    brandsTags: ["alesto"],
    stores: "Lidl",
    countriesTags: ["en:belgium", "en:france"],
    nutriScore: "A",
    novaGroup: 1,
    servingLabel: "30 g (1 poignée)",
    per100g: {
      kcal: 612,
      proteinG: 21.1,
      carbsG: 9.5,
      fatG: 53.0,
      fiberG: 12.2,
      sugarG: 4.4,
      satFatG: 4.0,
      sodiumMg: 4,
    },
  },
  "3033490004743": {
    productName: "Skyr Nature 0 % MG",
    brand: "Danone",
    brandsTags: ["danone"],
    stores: "Carrefour, Delhaize, E.Leclerc, Auchan, Intermarché",
    countriesTags: ["en:france", "en:belgium"],
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
    brandsTags: ["bjorg"],
    stores: "Carrefour, Delhaize, Colruyt, E.Leclerc, Monoprix",
    countriesTags: ["en:france", "en:belgium"],
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
    stores: "Intermarché, Netto",
    countriesTags: ["en:france"],
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
    brand: "Lindt Excellence",
    brandsTags: ["lindt", "excellence"],
    stores: "Carrefour, Delhaize, Colruyt, E.Leclerc, Auchan",
    countriesTags: ["en:france", "en:belgium", "en:switzerland"],
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

function isBarcodeRequestEntitled(
  req: NextRequest,
  bodyPlus?: boolean,
  bodyToken?: string
): boolean {
  const rawToken =
    bodyToken?.trim() ||
    req.nextUrl.searchParams.get("token")?.trim() ||
    req.headers.get("x-fw-license")?.trim() ||
    "";
  if (rawToken) {
    const verified = verifyEntitlementToken(rawToken);
    if (verified.valid && isTierEntitledToPaidQuota(verified.payload?.tier)) {
      return true;
    }
  }
  return bodyPlus === true || req.nextUrl.searchParams.get("plus") === "1";
}

function buildPayloadFromOpenFoodFacts(
  rawCode: string,
  p: OpenFoodFactsProductRaw,
  entitled: boolean,
  storeHint?: string
): BarcodeProductPayload | null {
  const n = p.nutriments || {};
  const kcalDirect = Number(n["energy-kcal_100g"] ?? n["energy-kcal"] ?? 0);
  const kjFallback = Number(n["energy-kj_100g"] ?? n["energy-kj"] ?? 0);
  const kcal = Math.round(
    kcalDirect > 0 ? kcalDirect : kjFallback > 0 ? kjFallback / 4.184 : 0
  );
  if (kcal <= 0) return null;

  const saltG = Number(n.salt_100g ?? 0);
  const sodiumMg = n.sodium_100g
    ? Math.round(Number(n.sodium_100g) * 1000)
    : Math.round(saltG * 400);
  const novaRaw = Number(p.nova_group || 2);
  const novaGroup = (novaRaw >= 1 && novaRaw <= 4 ? novaRaw : 2) as 1 | 2 | 3 | 4;

  const storeOrigin = entitled
    ? resolveProductStoreOrigin({
        code: rawCode,
        brands: p.brands,
        brandsTags: p.brands_tags,
        stores: p.stores || storeHint,
        storesTags: p.stores_tags,
        countriesTags: p.countries_tags,
      })
    : undefined;

  return {
    found: true,
    code: rawCode,
    productName: p.product_name_fr || p.product_name || `Produit EAN ${rawCode}`,
    brand: p.brands || "Marque renseignée",
    nutriScore: (p.nutriscore_grade || "?").toUpperCase(),
    novaGroup,
    servingLabel: p.serving_size || "100 g",
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
    imageUrl: p.image_front_small_url,
    provider: "openfoodfacts",
    ...(entitled
      ? { storeOrigin, storeOriginLocked: false }
      : { storeOriginLocked: true }),
  };
}

function buildPayloadFromLocal(
  rawCode: string,
  local: LocalBarcodeCatalogEntry,
  entitled: boolean
): BarcodeProductPayload {
  const storeOrigin = entitled
    ? resolveProductStoreOrigin({
        code: rawCode,
        brands: local.brand,
        brandsTags: local.brandsTags,
        stores: local.stores,
        countriesTags: local.countriesTags,
      })
    : undefined;

  return {
    found: true,
    code: rawCode,
    productName: local.productName,
    brand: local.brand,
    nutriScore: local.nutriScore,
    novaGroup: local.novaGroup,
    servingLabel: local.servingLabel,
    per100g: local.per100g,
    provider: "local-catalog",
    ...(entitled
      ? { storeOrigin, storeOriginLocked: false }
      : { storeOriginLocked: true }),
  };
}

async function lookupBarcodePayload(
  rawCode: string,
  entitled: boolean,
  storeHint?: string
): Promise<BarcodeProductPayload | null> {
  try {
    const offRes = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${rawCode}.json?fields=${OFF_FIELDS}`,
      {
        headers: { "User-Agent": "FolloWeight/4.1 (health-app)" },
        signal: AbortSignal.timeout(7000),
      }
    );

    if (offRes.ok) {
      const json = (await offRes.json()) as {
        status?: number;
        product?: OpenFoodFactsProductRaw;
      };
      if (json.status === 1 && json.product) {
        const built = buildPayloadFromOpenFoodFacts(
          rawCode,
          json.product,
          entitled,
          storeHint
        );
        if (built) return built;
      }
    }
  } catch {
    // Repli catalogue local si hors-ligne ou timeout
  }

  const local = LOCAL_FRENCH_BARCODES[rawCode];
  if (local) {
    return buildPayloadFromLocal(rawCode, local, entitled);
  }
  return null;
}

export async function GET(req: NextRequest) {
  const rawCode = (req.nextUrl.searchParams.get("code") || "").replace(/[^0-9]/g, "");
  if (rawCode.length < 8 || rawCode.length > 14) {
    return NextResponse.json(
      { error: "Code-barres invalide (8 à 14 chiffres requis)." },
      { status: 400 }
    );
  }

  const entitled = isBarcodeRequestEntitled(req);
  const payload = await lookupBarcodePayload(rawCode, entitled);
  if (payload) {
    return NextResponse.json(payload);
  }

  return NextResponse.json(
    {
      found: false,
      code: rawCode,
      error:
        "Produit introuvable sur OpenFoodFacts. Essayez un autre code ou utilisez la photo du plat.",
    },
    { status: 404 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      imageBase64?: unknown;
      licenseToken?: unknown;
      allowPlus?: unknown;
    };

    const entitled = isBarcodeRequestEntitled(
      req,
      body.allowPlus === true,
      typeof body.licenseToken === "string" ? body.licenseToken : undefined
    );
    if (!entitled) {
      return NextResponse.json(
        {
          error:
            "Le scan code-barres par caméra/photo est réservé aux membres FolloWeight Plus (FW+).",
        },
        { status: 402 }
      );
    }

    const imageBase64 =
      typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
    if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(imageBase64)) {
      return NextResponse.json(
        { error: "Image de code-barres invalide." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          found: false,
          error:
            "Code-barres illisible sur cette photo. Rapprochez le code-barres bien à plat ou saisissez les chiffres manuellement.",
        },
        { status: 422 }
      );
    }

    const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
    const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 220,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Lis cette photo d'un emballage alimentaire ou de son code-barres. Réponds STRICTEMENT en JSON : {"ean":"les 8 à 14 chiffres exacts sous les barres si lisibles sinon chaîne vide","productNameFr":"nom exact du produit si visible","brand":"marque ou marque distributeur si visible","storeHint":"enseigne probable si logo ou marque propre visible (Lidl, Delhaize, Colruyt, Carrefour, E.Leclerc, Aldi, Intermarché, Auchan, Picard, Magasins U...) sinon chaîne vide"}.`,
              },
              {
                type: "image_url",
                image_url: { url: imageBase64, detail: "high" },
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!oaiRes.ok) {
      return NextResponse.json(
        {
          found: false,
          error:
            "Lecture photo indisponible pour le moment. Saisissez les chiffres EAN manuellement.",
        },
        { status: 502 }
      );
    }

    const oaiJson = (await oaiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = oaiJson.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(rawContent) as {
      ean?: string;
      productNameFr?: string;
      brand?: string;
      storeHint?: string;
    };

    const ean = String(parsed.ean || "").replace(/[^0-9]/g, "");
    const storeHint = parsed.storeHint?.trim() || undefined;

    if (ean.length >= 8 && ean.length <= 14) {
      const exact = await lookupBarcodePayload(ean, true, storeHint);
      if (exact) {
        return NextResponse.json({
          ...exact,
          visionMatchedFromPhoto: true,
        } satisfies BarcodeProductPayload);
      }
    }

    const queryText = [parsed.brand, parsed.productNameFr]
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .join(" ")
      .trim();

    if (queryText.length >= 3) {
      try {
        const searchRes = await fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
            queryText
          )}&search_simple=1&action=process&json=1&page_size=1&fields=${OFF_FIELDS}`,
          {
            headers: { "User-Agent": "FolloWeight/4.1 (health-app)" },
            signal: AbortSignal.timeout(7000),
          }
        );
        if (searchRes.ok) {
          const searchJson = (await searchRes.json()) as {
            products?: OpenFoodFactsProductRaw[];
          };
          const first = searchJson.products?.[0];
          if (first) {
            const matchedCode = (first.code || ean || "00000000").replace(/[^0-9]/g, "") || "00000000";
            const built = buildPayloadFromOpenFoodFacts(
              matchedCode,
              first,
              true,
              storeHint
            );
            if (built) {
              return NextResponse.json({
                ...built,
                visionMatchedFromPhoto: true,
              } satisfies BarcodeProductPayload);
            }
          }
        }
      } catch {
        // Repli erreur propre ci-dessous
      }
    }

    return NextResponse.json(
      {
        found: false,
        code: ean || undefined,
        error:
          "Code-barres ou produit non reconnu sur la photo. Cadrez les barres noires bien nettes ou saisissez les chiffres manuellement.",
      },
      { status: 404 }
    );
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de l'analyse photo du code-barres." },
      { status: 500 }
    );
  }
}
