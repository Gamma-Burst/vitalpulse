# Relecture indépendante Branding — FolloWeight

- **Réviseur** : Antigravity (inspection multimodale native des PNG + audit géométrique/pixel Python en lecture seule)
- **Date UTC** : `2026-11-14T23:42Z` (`2026-11-15T00:42+01:00`)
- **Périmètre audité** : identité visuelle `FolloWeight` uniquement (`public/brand/**`, `public/icons/**`, `android/app/src/main/res/**`)
- **Contraintes respectées** : aucune modification d'asset ni de code/doc billing, aucune délégation, aucun GPU/RunPod utilisé (`0 pod` démarré), aucun paiement ni déploiement.

---

## Verdict global : **PASS AVEC RÉSERVES CONCRÈTES**

Le kit de marque est **techniquement conforme, déterministe et intégrable** (18 PNG valides, safe zone Android `66/108` respectée avec marge sur les 5 densités, `v26` et `v33` monochrome correctement câblés, palette respectée, zéro microtypographie dans les icônes).

En revanche, l'inspection visuelle réelle des rendus (`followeight-logo-showcase.png`, `qa/contact-sheet.png`, `qa/icon-24.png`, `qa/status-24.png`) et la mesure des contre-formes mettent en évidence **une réserve graphique notable à 24 px** (lecture `FV` plutôt que `FW` par fermeture partielle du premier creux) ainsi que **des résidus Capacitor hors script** dans `android/app/src/main/res/` (notamment `splash.png`). Rien ne bloque la compilation des icônes, mais ces réserves méritent d'être connues ou corrigées selon le niveau d'exigence visé.

---

## 1. Preuve d'inspection réelle des images et fichiers sources

Images réellement ouvertes et inspectées via l'outil image natif (`read_file` binaire `image/png`) + contrôle matriciel PIL :
1. `public/brand/followeight-logo-showcase.png` (`1024×1024`, RGBA)
2. `public/brand/qa/contact-sheet.png` (`1120×680`, RGBA)
3. `public/icons/icon-512.png` (`512×512`) et `public/icons/icon-192.png` (`192×192`)
4. `public/brand/qa/icon-24.png` (`24×24`) et `public/brand/qa/status-24.png` (`24×24`)
5. `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png` (`432×432`)
6. `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (`48×48`), `ic_launcher_round.png` (`48×48`), `ic_launcher_foreground.png` (`108×108`)
7. `android/app/src/main/res/drawable/splash.png` (vérification de cohérence Android)

Fichiers texte/vecteurs lus intégralement :
- `AGENTS.md`, `CLAUDE.md`, `AGENT-MESH.md`, `memory/KERNEL.md`
- `public/brand/followeight-mark.svg`, `followeight-foreground.svg`, `followeight-monochrome.svg`
- `public/brand/source/render-brand.cjs`, `source/verify-assets.py`, `source/followeight-logo-showcase.svg`
- `public/brand/qa/verification.json`
- `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher*.xml`, `mipmap-anydpi-v33/ic_launcher*.xml`, `drawable/ic_launcher_monochrome.xml`, `drawable/ic_stat_followeight.xml`, `values/ic_launcher_background.xml`, `drawable/ic_launcher_background.xml`, `drawable-v24/ic_launcher_foreground.xml`, `values/styles.xml`, `values/strings.xml`, `AndroidManifest.xml`, `public/manifest.webmanifest`, `src/app/layout.tsx`

---

## 2. Contrôle point par point du brief créatif

| Critère du brief | Statut | Constat factuel (visuel & géométrique) |
|---|---|---|
| **F + W fusionnés & remontée fluide** (`8` facultatif) | **PASS avec réserve** | Le `8` est écarté à raison (évite la surcharge). Le `W` part de l'ancrage médian `(145, 240)` du `F` et se termine par une remontée diagonale franche jusqu'à `(370, 158)` (alignée sur le haut du `F`). **Réserve** : (1) le pied du `F` `(145, 346)` et la 1re vallée du `W` `(≈195, 342)` ont un entraxe de ~`50` pour `stroke-width="44"`, ce qui soude les deux bas en un pied quasi-double ; (2) la barre médiane du `F` `(224, 240)` percute le flanc du pic central du `W` `(256, 251)`, créant un épaulement et réduisant le contre-espace gauche à un petit triangle (`63×69 px` en `512`). Le signe tend ainsi à se lire **`FV`** autant que **`FW`**. |
| **Palette obsidienne / émeraude / cyan / touche ambre** | **PASS** | Fond obsidienne profond (`#070C0B` → `#0F2421`, Android `#070C0B`) ; dégradé `flow` émeraude `#10B981` → menthe `#34D399` → cyan `#38BDF8` sur la poussée ascendante ; touche ambre `#FBBF24` (`M258 158H280`, opacité `0 → 0.9`) bien visible à l'extrémité droite de la barre haute du `F` (`392 px` ambrés mesurés sur le showcase, cœur à `RGB(217, 192, 67)`). |
| **Aucune microtypo dans l'icône app** | **PASS** | Zéro balise `<text>`, zéro glyphe secondaire et zéro `<image>` raster dans `followeight-mark.svg`, `public/icons/icon.svg`, `followeight-foreground.svg`, `followeight-monochrome.svg`, les 15 PNG Android et les 2 PNG Web. |
| **Esthétique premium** | **PASS (micro-détail showcase)** | Rendu studio `1024×1024` propre, sombre et maîtrisé (halo émeraude contenu, liseré biseauté, ombre douce). Deux détails mineurs sur la seule planche `followeight-logo-showcase.png` : le reflet haut `M391 184H633` est tracé `2 px` sous le bord supérieur du squircle (`y=182`), et le sous-titre répète le nom (`FolloWeight · followeight.com` juste sous `FolloWeight`). |
| **Lisibilité à 24 px** | **RÉSERVE** | Sur `contact-sheet.png`, `qa/icon-24.png` et `qa/status-24.png`, le contour extérieur (bloc gauche + diagonale montante droite) reste net et identifiable. En revanche, le triangle intérieur ne conserve que **2 à 3 pixels sombres** (`3 px` avec `alpha < 128` sur `status-24.png`), ce qui bouche visuellement la première jambe du `W` à `24 px` (lecture miniature proche de `FV`/`6V`). À `48 px` (`mdpi`), l'ouverture remonte à `8 px` sombres et redevenir lisible. |

---

## 3. Contrôle technique des livrables (18 PNG, Safe Zone, Android `v26`/`v33`, Web)

### 3.1. Inventaire et intégrité des 18 PNG (15 Android + 2 Web + 1 Showcase)
Recalcul indépendant des dimensions, modes colorimétriques, canaux alpha et empreintes SHA-256 : **0 écart** avec `public/brand/qa/verification.json`.

- **Showcase (1)** : `public/brand/followeight-logo-showcase.png` — `1024×1024`, `RGBA`, alpha `(255, 255)`, SHA-256 vérifié.
- **Web / PWA (2 + SVG)** :
  - `public/icons/icon-512.png` (`512×512`, `RGBA`, fond plein `alpha=(255,255)`) et `public/icons/icon-192.png` (`192×192`, `RGBA`, fond plein `alpha=(255,255)`).
  - Rayon maximal du monogramme sur les PNG Web : **`33.0 %` de la largeur** (`168.8 px` sur `512 px`), bien en deçà de la limite W3C `maskable` (`40.0 %` = `204.8 px`).
  - `public/icons/icon.svg` est strictement identique octet pour octet (`1 145 octets`) à `public/brand/followeight-mark.svg`.
- **Android Legacy & Round (10)** :
  - `ic_launcher.png` et `ic_launcher_round.png` présents et conformes en `mdpi` (`48×48`), `hdpi` (`72×72`), `xhdpi` (`96×96`), `xxhdpi` (`144×144`), `xxxhdpi` (`192×192`), `RGBA`, coins extérieurs transparents `alpha(0,0)=0` et centre opaque `alpha=255`.

### 3.2. Adaptive Foreground transparent & Safe Zone circulaire `66/108` (`r <= 33/108`)
Contrôle exhaustif de tous les pixels visibles (`alpha > 0`, anticrénelage compris) et du centrage optique (`alpha > 128`) sur les 5 densités `ic_launcher_foreground.png` :

| Densité | Dimensions | Alpha `(min, max)` | Rayon max mesuré (`px`) | Plafond circulaire `66/108` (`px`) | Équivalent `dp` (max `33.00 dp`) | Décalage centre `(dx, dy)` |
|---|---|---|---|---|---|---|
| `mdpi` | `108×108` | `(0, 255)` | `29.707` | `33.000` | `29.71 dp` | `(0.00, 0.00)` |
| `hdpi` | `162×162` | `(0, 255)` | `43.503` | `49.500` | `29.00 dp` | `(0.00, 0.00)` |
| `xhdpi` | `216×216` | `(0, 255)` | `57.554` | `66.000` | `28.78 dp` | `(0.00, 0.00)` |
| `xxhdpi` | `324×324` | `(0, 255)` | `85.349` | `99.000` | `28.45 dp` | `(0.00, 0.00)` |
| `xxxhdpi` | `432×432` | `(0, 255)` | `112.998` | `132.000` | `28.25 dp` | `(0.00, 0.00)` |

**Résultat** : **PASS franc** — marge constante de `3.3` à `4.75 dp` à l'intérieur du cercle garanti de `66 dp` de diamètre, centrage parfait.

### 3.3. Références XML Android `v26` et `v33` monochrome
- `AndroidManifest.xml` pointe bien sur `@mipmap/ic_launcher` et `@mipmap/ic_launcher_round`.
- `res/values/ic_launcher_background.xml` définit `#070C0B` (`@color/ic_launcher_background`).
- `res/mipmap-anydpi-v26/ic_launcher.xml` et `ic_launcher_round.xml` référencent `@color/ic_launcher_background` + `@mipmap/ic_launcher_foreground` : **PASS**.
- `res/mipmap-anydpi-v33/ic_launcher.xml` et `ic_launcher_round.xml` ajoutent `<monochrome android:drawable="@drawable/ic_launcher_monochrome"/>` : **PASS**.
- `res/drawable/ic_launcher_monochrome.xml` (`108dp`, `viewport 512×512`, `scale 0.78`, `translate(-1.5, 4)`, `#FFFFFFFF` sur `#00000000`) est aligné géométriquement au pixel près avec `@mipmap/ic_launcher_foreground` : **PASS**.

---

## 4. Réserves concrètes et actions correctives recommandées (par priorité)

1. **[Design / Lisibilité 24 px — Moyenne]** **Aérer l'attache basse-gauche et le triangle interne du `FW`**
   - *Constat* : `stroke-width="44"` combiné au départ du `W` en `(145, 240)` et à la 1re vallée en `x≈195` colle la base du `F` à celle du `W` et referme le contre-espace sous la traverse médiane à `24 px` (d'où une lecture proche de `FV`).
   - *Piste si retouche souhaitée* : décaler légèrement la 1re vallée et le pic central vers la droite (ou réduire `stroke-width` autour de `38–40` avec raccourcissement de la traverse médiane `H210` détachée du pic central du `W`) afin de préserver un jour franc d'au moins `4–5 px` à `24×24`.

2. **[Intégration Android — Moyenne]** **Nettoyer les ressources template Capacitor résiduelles et le Splash Screen**
   - *Constat* : bien que non appelés par `v26`/`v33`, `android/app/src/main/res/drawable/ic_launcher_background.xml` (grille `#26A69A`) et `res/drawable-v24/ic_launcher_foreground.xml` (robot Android) subsistent dans le dépôt. Surtout, `res/values/styles.xml` (`AppTheme.NoActionBarLaunch`) pointe toujours sur `@drawable/splash` (`res/drawable*/splash.png`), qui affiche encore le **logo bleu Capacitor sur fond blanc** au lancement natif.
   - *Piste* : régénérer ou basculer le splash Android sur fond `#070C0B` avec le monogramme `FolloWeight`, et supprimer les deux XML template orphelins (`drawable/ic_launcher_background.xml` et `drawable-v24/ic_launcher_foreground.xml`).

3. **[Icône de barre d'état Android — Basse]** **Marge périphérique de `ic_stat_followeight.xml`**
   - *Constat* : avec `scaleX/Y="1.5"` dans `24dp`, le tracé plein occupe `18×16 dp` mais l'anticrénelage touche `x=0..23` (`status-24.png`).
   - *Piste* : abaisser `scaleX/Y` de `1.5` à `1.32` pour garantir `2 dp` de marge nette (`20×20 dp` utiles dans `24×24 dp` selon les spécifications Material Status Bar).

4. **[Finition Showcase & Manifeste PWA — Basse]**
   - Dans `render-brand.cjs` (ligne 65), aligner le reflet supérieur sur la courbe haute du squircle (`y=182` au lieu de `y=184`) et éviter le doublon texte `FolloWeight` / `FolloWeight · followeight.com`.
   - Dans `public/manifest.webmanifest`, séparer `"purpose": "any"` et `"purpose": "maskable"` en entrées distinctes (et prévoir l'alignement du nom `VitalPulse` → `FolloWeight` dans `manifest.webmanifest`, `src/app/layout.tsx` et `android/.../strings.xml` lors du lot applicatif dédié).
