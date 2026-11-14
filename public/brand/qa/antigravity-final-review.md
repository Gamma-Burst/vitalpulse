# Révision finale Branding — FolloWeight

- **Réviseur** : Antigravity (relecture finale ciblée après correctifs parent ; audit initial `antigravity-review.md` conservé intact)
- **Date UTC** : `2026-11-14T23:47Z` (`2026-11-15T00:47+01:00`)
- **Contraintes respectées** : ouverture visuelle réelle uniquement de `public/brand/qa/contact-sheet.png` et `public/brand/followeight-logo-showcase.png` régénérés ; relecture de `public/brand/source/render-brand.cjs` et `public/brand/qa/verification.json` ; aucune modification d'asset ; `0` délégation, `0` paiement, `0` GPU / `0` pod RunPod utilisé.

---

## Verdict final : **PASS FRANC (aucune réserve bloquante)**

Toutes les réserves graphiques et techniques du périmètre branding soulevées lors de l'audit initial sont **effectivement résolues** dans les rendus régénérés :

1. **Ouverture du `FW` et lisibilité réelle à 24 px (`contact-sheet.png` & `render-brand.cjs`)** :
   - Le recul du fût du `F` (`M128`), l'affinage du trait (`stroke-width="40"`, `translate(-1, 4)`), le raccourcissement de la traverse médiane (`H204`) et le décalage du `W` (`M158`, 1re vallée `215`, pic central `270`, 2e vallée `323`, remontée `386`) dégagent nettement l'encoche basse-gauche ainsi que l'espace sous/après la traverse médiane.
   - Vérifié visuellement sur `contact-sheet.png` (`24 px réels`, `48 px réels`, `Barre Android / 24 px` et `Silhouette monochrome`) : le premier creux et le pic central ne se bouchent plus ; le signe se lit désormais clairement **`FW`** (et non plus `FV`) dès `24 px`.

2. **Icône de notification Android 24 dp (`ic_stat_followeight.xml` / `Barre Android / 24 px`)** :
   - Le passage à `scaleX/Y="1.32"` restaure une marge périphérique saine autour de la silhouette blanche dans le carré `24×24`.

3. **Finition Studio (`followeight-logo-showcase.png`)** :
   - Le reflet supérieur (`M391 182H633`) tombe désormais exactement sur l'arête haute du squircle (`y=182`), supprimant le décalage précédent. La signature `"FolloWeight · followeight.com"` est conservée telle que demandée.

4. **Intégrité et Safe Zone (`qa/verification.json`)** :
   - Les **18 PNG obligatoires + 4 PNG QA** (`22` fichiers) correspondent à `100 %` aux empreintes SHA-256 de `verification.json` (`PASS`).
   - Les 5 `ic_launcher_foreground.png` restent strictement dans le cercle garanti `66/108` (`30.08 dp / 33.00 dp` en `xxxhdpi`, `31.757 / 33.000 px` en `mdpi` anticrénelage inclus).

---

## Réserves concrètes restantes (mineures, non bloquantes)

1. **Marge `mdpi` proche du plafond `66/108`** : l'étalement horizontal plus large du `FW` (`128..386`) amène le rayon maximal d'anticrénelage de `mdpi/ic_launcher_foreground.png` à `31.757 px` pour `33.0 px` autorisés. C'est conforme et sans rognage, mais il ne faudra pas augmenter l'échelle `.78` ultérieurement.
2. **Manifeste PWA (`public/manifest.webmanifest`)** : `"purpose": "any maskable"` reste groupé sur la même entrée (fonctionnel grâce au cadrage centré, scission `any` / `maskable` optionnelle lors du futur chantier applicatif hors périmètre actuel, tout comme le splash/renommage `VitalPulse` explicitement exclus de ce lot).

---

## Document Architecture Billing

- `docs/codex-billing-architecture.md` : **non relu** (fichier absent sur disque au moment de cette relecture finale ; aucune attente effectuée conformément à la consigne).
