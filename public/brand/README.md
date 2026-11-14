# FolloWeight — identité et livraison

Création du 15 novembre 2026 (Europe/Brussels), pour **FolloWeight · followeight.com**.

## Direction retenue

Monogramme original **F + W**, construit en tracés vectoriels épais de 40 unités. Le F porte la lecture du nom ; ses branches se fondent dans les deux vallées arrondies du W. Le premier creux du W est ouvert pour préserver la lecture à 24 px, après une première relecture indépendante. La branche droite remonte avec fluidité pour représenter la progression des habitudes. Elle n'exprime pas une hausse du poids. La courbe est la variante retenue dans le brief « courbe ascendante / 8 métabolique » : il n'y a pas de 8 littéral ajouté.

Fond obsidienne `#070C0B → #0F2421`, émeraude `#10B981 → #34D399`, pointe cyan `#38BDF8`, reflet ambre `#FBBF24`. Le fond plein du maître évite les coins transparents dans les usages PWA maskable et Play Store. Les coins et masques Android sont traités dans les exports propres à chaque usage. Aucune lettre minuscule, signature ou URL dans les icônes.

Repères visuels effectivement consultés : **LADDER** (monogramme épais, contraste élevé) et **Strava** (symbole compact immédiatement identifiable), sur la [sélection officielle App Store Awards 2025](https://developer.apple.com/app-store/app-store-awards-2025/) consultée en novembre 2026. Il s'agit de références de lisibilité ; aucun classement des ventes 2026 ni résultat commercial de FolloWeight n'est revendiqué. Les marques de référence ne sont pas incluses dans les fichiers livrés.

Le showcase est un **rendu vectoriel studio à suréchantillonnage ×4**, utilisant exactement le même dessin que le maître : éclairage, ombre, lueur diffuse, plaque obsidienne et mot-symbole. Ce n'est pas une sortie générée par IA. La signature exacte « FolloWeight · followeight.com » est conservée. La typographie de la source du showcase utilise Segoe UI ; le PNG est autonome.

## Fichiers de production

| Chemin depuis la racine du projet | Format / dimensions |
|---|---|
| `public/brand/followeight-mark.svg` | SVG vectoriel, `viewBox="0 0 512 512"` |
| `public/brand/followeight-logo-showcase.png` | PNG RGBA, 1024 × 1024 |
| `public/icons/icon.svg` | Copie exacte du maître SVG |
| `public/icons/icon-512.png` | PNG RGBA, 512 × 512 |
| `public/icons/icon-192.png` | PNG RGBA, 192 × 192 |
| `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` | PNG RGBA, 48 × 48 |
| `android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png` | PNG RGBA, 48 × 48 |
| `android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png` | PNG RGBA, 108 × 108 |
| `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` | PNG RGBA, 72 × 72 |
| `android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png` | PNG RGBA, 72 × 72 |
| `android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png` | PNG RGBA, 162 × 162 |
| `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` | PNG RGBA, 96 × 96 |
| `android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png` | PNG RGBA, 96 × 96 |
| `android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png` | PNG RGBA, 216 × 216 |
| `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` | PNG RGBA, 144 × 144 |
| `android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png` | PNG RGBA, 144 × 144 |
| `android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png` | PNG RGBA, 324 × 324 |
| `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` | PNG RGBA, 192 × 192 |
| `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png` | PNG RGBA, 192 × 192 |
| `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png` | PNG RGBA, 432 × 432 |
| `android/app/src/main/res/values/ic_launcher_background.xml` | Couleur exacte `#070C0B` |
| `docs/codex-billing-architecture.md` | Architecture, coûts et plan de livraison en français |

## Compléments d'intégration et sources

- `public/brand/followeight-foreground.svg` : calque transparent, sans fond, centré dans le canevas adaptatif.
- `public/brand/followeight-monochrome.svg` : monogramme blanc sur transparence.
- `android/app/src/main/res/drawable/ic_launcher_monochrome.xml` : icône thématique Android.
- `android/app/src/main/res/drawable/ic_stat_followeight.xml` : ressource monochrome vectorielle 24 dp pour la barre de notification, à sélectionner dans le futur code de notification.
- `android/app/src/main/res/mipmap-anydpi-v33/ic_launcher.xml` et `ic_launcher_round.xml` : raccordement des trois couches, dont `monochrome`, sur Android 13+.
- `public/brand/source/render-brand.cjs` : rendu reproductible de tous les assets, via Sharp déjà installé.
- `public/brand/source/followeight-logo-showcase.svg` : source éditable du showcase 1024 × 1024.
- `public/brand/source/verify-assets.py` : validation Pillow, XML, SHA-256 et géométrie de la zone protégée.
- `public/brand/qa/contact-sheet.png` : planche de contrôle, 1120 × 680 RGBA.
- `public/brand/qa/icon-24.png`, `icon-48.png`, `status-24.png` : contrôles à taille réelle 24, 48 et 24 px, RGBA.
- `public/brand/qa/verification.json` : dimensions, modes, empreintes et résultat des contrôles.
- `public/brand/qa/antigravity-review.md` : première relecture indépendante ; ses réserves sur la lecture du W ont motivé la révision finale.
- `public/brand/qa/antigravity-final-review.md` : relecture de la version corrigée, verdict **PASS**, sans réserve bloquante.
- `public/brand/codex-billing-architecture.md` : copie de livraison du document canonique `docs/codex-billing-architecture.md`.
- `public/brand/delivery-receipt.json` : inventaire final et empreintes de chaque fichier livré.
- `public/brand/followeight-delivery.zip` : pack complet conservant les chemins d'intégration.
- `public/brand/source/package-delivery.py` : reproduction du pack et contrôle CRC de l'archive.

## Vérifications et limites

Les 18 PNG requis sont décodés avec Pillow ; les 4 PNG de contrôle le sont également. Le maître et sa copie sont identiques, sans texte ni image matricielle embarquée. Les premiers plans Android ont un alpha transparent et tous leurs pixels non transparents, y compris l'anticrénelage, restent dans le cercle central de diamètre 66 dp du canevas 108 dp. Référence : [Adaptive icons — Android Developers](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive).

Les XML adaptatifs Android 8+ existants pointent déjà sur les nouveaux premiers plans. Les nouveaux XML Android 13+ ajoutent la couche monochrome. Les anciens drawables générés par le gabarit Capacitor, non référencés par ces icônes adaptatives, n'ont pas été supprimés.

Contrôle visuel effectué sur le showcase et la planche incluant le 24 px réel. Aucun APK n'a été compilé et aucun émulateur ou téléphone n'a été lancé. Le renommage global de VitalPulse dans les écrans, le manifeste et les identifiants du package reste distinct de cette livraison graphique. Aucune publication, aucun achat, aucun appel OpenAI facturé et aucun pod RunPod lancé ou utilisé pour cette mission.

## Reproduction

Depuis la racine du dépôt :

```powershell
node public/brand/source/render-brand.cjs
& 'C:\Python314\python.exe' public/brand/source/verify-assets.py
```

Le premier script régénère les ressources graphiques de cette mission ; le second recrée le reçu de vérification. Les modifications préexistantes des fichiers métier sont conservées.
