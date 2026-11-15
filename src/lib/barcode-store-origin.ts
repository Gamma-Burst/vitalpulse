export interface ProductStoreOrigin {
  headlineFr: string;
  storesLabelFr: string;
  storesList: string[];
  isExclusivePrivateLabel: boolean;
  confidence: "high" | "medium" | "broad";
  source: "private_label" | "openfoodfacts" | "multi_retailer";
  countriesLabelFr: string | null;
  gs1OriginFr: string | null;
}

export interface ResolveStoreOriginInput {
  code: string;
  brands?: string;
  brandsTags?: string[];
  stores?: string;
  storesTags?: string[];
  countriesTags?: string[];
}

interface PrivateLabelRule {
  store: string;
  displayLabel?: string;
  tokens: string[];
  exactOnlyTokens?: string[];
}

const PRIVATE_LABEL_RULES: PrivateLabelRule[] = [
  {
    store: "Colruyt / Okay",
    displayLabel: "Colruyt / Okay / Spar",
    tokens: ["boni", "boni selection", "everyday", "graindor"],
  },
  {
    store: "Delhaize",
    tokens: ["delhaize", "365", "taste of inspirations", "petits lions"],
  },
  {
    store: "Carrefour",
    tokens: [
      "carrefour",
      "simpl",
      "reflets de france",
      "carrefour bio",
      "carrefour extra",
      "carrefour classic",
      "carrefour sensation",
    ],
  },
  {
    store: "Lidl",
    tokens: [
      "lidl",
      "milbona",
      "crownfield",
      "alesto",
      "chef select",
      "cien",
      "freeway",
      "deluxe",
      "vemondo",
      "combino",
      "kania",
      "solevita",
      "pikok",
      "trattoria alfredo",
      "fin carré",
      "fin carre",
      "bellarom",
      "gelatelli",
      "freshona",
      "ocean sea",
      "italiamo",
      "dulano",
      "harvest basket",
      "sondey",
      "snack day",
    ],
  },
  {
    store: "Aldi",
    tokens: [
      "aldi",
      "milsani",
      "moser roth",
      "gut bio",
      "golden bridge",
      "moreno",
      "choceur",
      "rio d'oro",
      "rio d oro",
      "cucina",
      "pays gourmand",
      "saint alby",
      "roi de trèfle",
      "roi de trefle",
      "trader joe's",
    ],
  },
  {
    store: "E.Leclerc",
    tokens: [
      "e.leclerc",
      "e leclerc",
      "leclerc",
      "marque repère",
      "marque repere",
      "bio village",
      "éco+",
      "eco+",
      "nos régions ont du talent",
      "nos regions ont du talent",
      "délisse",
      "delisse",
      "les croisés",
      "les croises",
      "tablier blanc",
    ],
  },
  {
    store: "Intermarché / Netto",
    tokens: [
      "intermarché",
      "intermarche",
      "chabrior",
      "pâturages",
      "paturages",
      "monique ranou",
      "paquito",
      "top budget",
      "fiorini",
      "saint éloi",
      "saint eloi",
      "odyssée",
      "odyssee",
      "itinéraire des saveurs",
      "itineraire des saveurs",
      "netto",
    ],
  },
  {
    store: "Auchan",
    tokens: ["auchan", "pouce", "mmm!"],
  },
  {
    store: "Magasins U",
    tokens: ["u bio", "u saveurs", "super u", "hyper u", "magasins u"],
    exactOnlyTokens: ["u"],
  },
  {
    store: "Monoprix",
    tokens: ["monoprix", "monoprix gourmet", "monoprix bio"],
  },
  {
    store: "Casino / Franprix",
    tokens: ["casino", "franprix", "leader price"],
  },
  {
    store: "Picard",
    tokens: ["picard"],
  },
  {
    store: "Grand Frais",
    tokens: ["grand frais"],
  },
  {
    store: "Albert Heijn",
    tokens: ["albert heijn", "ah biologisch", "ah terra"],
    exactOnlyTokens: ["ah"],
  },
  {
    store: "Action",
    exactOnlyTokens: ["action"],
    tokens: [],
  },
  {
    store: "Bio-Planet",
    tokens: ["bio-planet", "bio planet"],
  },
  {
    store: "Biocoop",
    tokens: ["biocoop"],
  },
  {
    store: "Naturalia",
    tokens: ["naturalia"],
  },
  {
    store: "La Vie Claire",
    tokens: ["la vie claire"],
  },
  {
    store: "Kazidomi",
    tokens: ["kazidomi"],
  },
  {
    store: "Färm",
    tokens: ["färm", "farm"],
    exactOnlyTokens: ["farm", "färm"],
  },
];

const NATIONAL_BRAND_TOKENS = new Set([
  "danone",
  "ferrero",
  "nutella",
  "nestlé",
  "nestle",
  "bjorg",
  "président",
  "president",
  "fleury michon",
  "bonduelle",
  "barilla",
  "lindt",
  "excellence",
  "lu",
  "haribo",
  "coca-cola",
  "coca cola",
  "alpro",
  "yoplait",
  "herta",
  "panzani",
  "andros",
  "bonne maman",
  "activia",
  "oikos",
  "hipro",
  "yopro",
]);

const STORE_CANONICAL_MAP: Record<string, string> = {
  leclerc: "E.Leclerc",
  "e.leclerc": "E.Leclerc",
  "e leclerc": "E.Leclerc",
  intermarche: "Intermarché",
  "intermarché": "Intermarché",
  "super u": "Super U",
  "hyper u": "Hyper U",
  "magasins u": "Magasins U",
  delhaize: "Delhaize",
  "proxy delhaize": "Delhaize",
  "ad delhaize": "Delhaize",
  colruyt: "Colruyt",
  okay: "Okay",
  spar: "Spar",
  carrefour: "Carrefour",
  "carrefour market": "Carrefour Market",
  "carrefour express": "Carrefour Express",
  "carrefour city": "Carrefour City",
  lidl: "Lidl",
  aldi: "Aldi",
  auchan: "Auchan",
  monoprix: "Monoprix",
  franprix: "Franprix",
  casino: "Casino",
  cora: "Cora",
  picard: "Picard",
  "grand frais": "Grand Frais",
  "albert heijn": "Albert Heijn",
  ah: "Albert Heijn",
  action: "Action",
  biocoop: "Biocoop",
  "bio-planet": "Bio-Planet",
  "bio planet": "Bio-Planet",
  naturalia: "Naturalia",
  "la vie claire": "La Vie Claire",
  kazidomi: "Kazidomi",
  migros: "Migros",
  coop: "Coop",
  netto: "Netto",
  bi1: "Bi1",
};

const COUNTRY_NAME_MAP: Record<string, string> = {
  belgium: "Belgique",
  belgique: "Belgique",
  france: "France",
  luxembourg: "Luxembourg",
  switzerland: "Suisse",
  suisse: "Suisse",
  netherlands: "Pays-Bas",
  "pays-bas": "Pays-Bas",
  germany: "Allemagne",
  allemagne: "Allemagne",
  italy: "Italie",
  italie: "Italie",
  spain: "Espagne",
  espagne: "Espagne",
  "united-kingdom": "Royaume-Uni",
  "united kingdom": "Royaume-Uni",
  portugal: "Portugal",
  canada: "Canada",
};

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeToken(value: string): string {
  return stripAccents(
    value
      .toLowerCase()
      .replace(/^[a-z]{2}:/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function splitDelimitedList(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;/|]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function resolveGs1PrefixOriginFr(eanCode: string): string | null {
  const digits = eanCode.replace(/[^0-9]/g, "");
  if (digits.length === 8) {
    const prefix2 = Number(digits.slice(0, 2));
    if (prefix2 >= 20 && prefix2 <= 29) {
      return "Code enseigne court (EAN-8 rayon/MDD)";
    }
    return null;
  }
  if (digits.length < 12 || digits.length > 14) {
    return null;
  }
  const normalized13 = digits.length === 12 ? `0${digits}` : digits.slice(-13);
  const p3 = Number(normalized13.slice(0, 3));
  if (!Number.isFinite(p3)) return null;

  if (p3 >= 200 && p3 <= 299) return "Code rayon / enseigne interne (GS1 20–29)";
  if (p3 >= 300 && p3 <= 379) return "France (GS1 30–37)";
  if (p3 >= 400 && p3 <= 440) return "Allemagne (GS1 40–44)";
  if (p3 >= 500 && p3 <= 509) return "Royaume-Uni (GS1 50)";
  if (p3 >= 540 && p3 <= 549) return "Belgique & Luxembourg (GS1 54)";
  if (p3 >= 760 && p3 <= 769) return "Suisse (GS1 76)";
  if (p3 >= 800 && p3 <= 839) return "Italie (GS1 80–83)";
  if (p3 >= 840 && p3 <= 849) return "Espagne (GS1 84)";
  if (p3 >= 870 && p3 <= 879) return "Pays-Bas (GS1 87)";
  if (p3 >= 0 && p3 <= 139) return "États-Unis / Canada (GS1 00–13)";
  return null;
}

function formatCountriesLabel(countriesTags?: string[]): string | null {
  if (!Array.isArray(countriesTags) || countriesTags.length === 0) return null;
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const tag of countriesTags) {
    const clean = normalizeToken(tag);
    if (!clean) continue;
    const mapped = COUNTRY_NAME_MAP[clean];
    if (mapped && !seen.has(mapped)) {
      seen.add(mapped);
      labels.push(mapped);
    }
  }
  if (labels.length === 0) return null;
  return labels.slice(0, 4).join(", ");
}

function normalizeStoreName(raw: string): string {
  const withoutLang = raw.replace(/^[a-z]{2}:/i, "").trim();
  const hyphenToSpace = withoutLang.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  const lower = stripAccents(hyphenToSpace).toLowerCase();
  const direct = STORE_CANONICAL_MAP[lower];
  if (direct) return direct;
  return hyphenToSpace
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function collectStoreCandidates(stores?: string, storesTags?: string[]): string[] {
  const rawItems = [
    ...splitDelimitedList(stores),
    ...(Array.isArray(storesTags) ? storesTags : []),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of rawItems) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const normalized = normalizeStoreName(trimmed);
    if (!normalized) continue;
    const dedupKey = stripAccents(normalized).toLowerCase();
    if (!seen.has(dedupKey)) {
      seen.add(dedupKey);
      out.push(normalized);
    }
  }
  return out;
}

function findMatchingPrivateLabel(brandCandidates: string[]): {
  store: string;
  matchedBrand: string;
} | null {
  const normalizedCandidates = brandCandidates
    .map((b) => ({ raw: b.trim(), norm: normalizeToken(b) }))
    .filter((b) => b.norm.length > 0);

  for (const rule of PRIVATE_LABEL_RULES) {
    const exactTokens = (rule.exactOnlyTokens ?? []).map(normalizeToken);
    const flexTokens = rule.tokens.map(normalizeToken);

    for (const candidate of normalizedCandidates) {
      if (exactTokens.includes(candidate.norm)) {
        return { store: rule.store, matchedBrand: candidate.raw };
      }
      for (const token of flexTokens) {
        if (!token) continue;
        if (
          candidate.norm === token ||
          candidate.norm.startsWith(`${token} `) ||
          candidate.norm.endsWith(` ${token}`) ||
          candidate.norm.includes(` ${token} `) ||
          (token.length >= 4 && candidate.norm.includes(token))
        ) {
          return { store: rule.store, matchedBrand: candidate.raw };
        }
      }
    }
  }
  return null;
}

function isNationalBrand(brandCandidates: string[]): boolean {
  for (const raw of brandCandidates) {
    const norm = normalizeToken(raw);
    if (!norm) continue;
    for (const national of NATIONAL_BRAND_TOKENS) {
      const nNorm = normalizeToken(national);
      if (norm === nNorm || norm.includes(nNorm)) {
        return true;
      }
    }
  }
  return false;
}

export function resolveProductStoreOrigin(
  input: ResolveStoreOriginInput
): ProductStoreOrigin {
  const gs1OriginFr = resolveGs1PrefixOriginFr(input.code);
  const countriesLabelFr = formatCountriesLabel(input.countriesTags);
  const brandCandidates = [
    ...splitDelimitedList(input.brands),
    ...(Array.isArray(input.brandsTags) ? input.brandsTags.map((t) => t.replace(/^[a-z]{2}:/i, "").replace(/-/g, " ")) : []),
  ];

  // 1. Priorité MDD Belgique / France / Europe
  const privateLabel = findMatchingPrivateLabel(brandCandidates);
  const storesList = collectStoreCandidates(input.stores, input.storesTags);

  if (privateLabel) {
    const mergedStores = storesList.some(
      (s) => stripAccents(s).toLowerCase() === stripAccents(privateLabel.store).toLowerCase()
    )
      ? storesList
      : [privateLabel.store, ...storesList];
    const cleanBrandLabel = privateLabel.matchedBrand.trim();
    const isSameAsStore =
      stripAccents(cleanBrandLabel).toLowerCase() ===
      stripAccents(privateLabel.store).toLowerCase();
    return {
      headlineFr: "Enseigne exclusive détectée",
      storesLabelFr: isSameAsStore
        ? privateLabel.store
        : `${privateLabel.store} (marque propre ${cleanBrandLabel})`,
      storesList: mergedStores,
      isExclusivePrivateLabel: true,
      confidence: "high",
      source: "private_label",
      countriesLabelFr,
      gs1OriginFr,
    };
  }

  // 2. Magasins OpenFoodFacts avec protection anti-faux-positif sur grandes marques nationales
  const nationalBrand = isNationalBrand(brandCandidates);
  if (storesList.length > 0) {
    if (nationalBrand && storesList.length <= 2) {
      return {
        headlineFr: "Grande distribution (multi-enseignes)",
        storesLabelFr: `Vendu en supermarchés (signalé notamment chez ${storesList.join(", ")})`,
        storesList,
        isExclusivePrivateLabel: false,
        confidence: "broad",
        source: "multi_retailer",
        countriesLabelFr,
        gs1OriginFr,
      };
    }
    if (storesList.length >= 3) {
      return {
        headlineFr: "Disponible dans ces enseignes",
        storesLabelFr: storesList.slice(0, 6).join(", "),
        storesList,
        isExclusivePrivateLabel: false,
        confidence: "medium",
        source: "openfoodfacts",
        countriesLabelFr,
        gs1OriginFr,
      };
    }
    return {
      headlineFr: "Magasin(s) référencé(s)",
      storesLabelFr: storesList.join(", "),
      storesList,
      isExclusivePrivateLabel: false,
      confidence: "medium",
      source: "openfoodfacts",
      countriesLabelFr,
      gs1OriginFr,
    };
  }

  // 3. Repli honnête multi-enseignes
  return {
    headlineFr: "Grande distribution / Magasins spécialisés",
    storesLabelFr: "Produit multi-enseignes (enseigne non exclusive)",
    storesList: [],
    isExclusivePrivateLabel: false,
    confidence: "broad",
    source: "multi_retailer",
    countriesLabelFr,
    gs1OriginFr,
  };
}
