# Guide Complet de Publication Google Play Store & Monétisation — FolloWeight

> Ce guide rassemble tous les éléments techniques, ASO, juridiques et financiers préparés pour lancer **FolloWeight (`com.followeight.app` · `followeight.com`)** sur le **Google Play Store** tout en préservant l'écosystème Web existant.

---

## 1. Architecture Technique & Conformité Validée

- **ID d'application Android :** `com.followeight.app`
- **Version Android actuelle :** `versionCode 2` · `versionName "1.1.0"`
- **SDK Android 2026 :** `compileSdkVersion = 36` · `targetSdkVersion = 36` · AGP `8.13.2` · Gradle `8.13`
- **Plugins Capacitor actifs :** `@capacitor/app@7.1.2`, `@capacitor/haptics@7.0.5`, `@revenuecat/purchases-capacitor@11.3.3` (Play Billing `8.0.0`)
- **`launchMode` :** `singleTop` (requis pour Google Play Billing)
- **Permissions manifest minimalistes :** `INTERNET`, `CAMERA` (`hardware.camera required="false"`), `POST_NOTIFICATIONS` (aucune permission Health Connect / Bluetooth non implémentée nativement, zéro rejet Play Store).
- **Pages légales publiques déployées :**
  - Confidentialité : `https://followeight.com/privacy`
  - Conditions & Avertissement Santé : `https://followeight.com/terms`
  - Suppression des données en 1 clic : `https://followeight.com/delete-account`
  - Signalement IA : `POST https://followeight.com/api/ai-reports`
  - Digital Asset Links : `https://followeight.com/.well-known/assetlinks.json`
- **Conformité Google Play Payments Policy :**
  - Dans l'application Android native, **seuls les abonnements Google Play (`fw_plus_annual`, `fw_plus_monthly`) sont affichés**. Le *Pass Fondateur* Stripe et toute mention de commission store sont automatiquement masqués dans l'app Android.
  - Sur le Web (`followeight.com`), Stripe Checkout et le Pass Fondateur 5 ans (69,90 €) génèrent un code portable HMAC-SHA256 (`FWPLUS.<payload>.<sig>`).

---

## 2. Tarification & Stratégie Anti-Déficit IA

| Formule | Prix TTC | Canal | Marge / Rôle |
|---|---|---|---|
| **FolloWeight Essentiel** | **0 € à vie** | Web & Android | Gratuit sans pub (poids EMA, saisie manuelle EAN, OMAD, 44 exos, 5 msg FW AI/j, Pack découverte 5 scans photo IA offerts, 1 recherche Web/j) |
| **FW+ Annuel (Recommandé)** | **29,99 € / an** (soit **2,49 € / mois**) · **7 j d'essai gratuit** | Google Play & Stripe Web | Formule phare (< 30 €/an vs 60–80 €/an concurrents) |
| **FW+ Mensuel** | **4,99 € / mois** | Google Play & Stripe Web | Sans engagement, point d'entrée flexible |
| **Pass Fondateur 5 ans** | **69,90 € une fois** (~1,17 €/mois) | `followeight.com` (Web uniquement) | Trésorerie directe sans commission store 15–30 % |

### Protection Marge Coût OpenAI (`/api/fw-ai`)
1. Le routeur `shouldEnableLiveWebSearch()` n'active l'outil OpenAI Web Search que lorsque la question porte réellement sur une **marque, un restaurant, une étude scientifique ou une actualité externe** (~15 % des messages).
2. Les questions personnelles quotidiennes passent directement sur **Chat Completions JSON (`~0,0006 $/message`)**.
3. L'outil `web_search_preview` (\$25/1 000 appels) a été remplacé par `web_search` (\$10/1 000 appels = **-60 %**), avec fair-use **5 recherches Web/jour · 30/mois** en FW+ → **> 80 % de marge brute préservée** même sur l'abonnement annuel à 29,99 €.

---

## 3. Fiches Store ASO (Copier-Coller dans Play Console)

### Version Française (`fr-FR` — Principale)
- **Titre de l'app (`27/30 car.`) :**
  `FolloWeight: Nutrition & Jeûne`
- **Description courte (`79/80 car.`) :**
  `Coach IA connecté, scan repas photo & jeûne OMAD. 100 % privé, local, sans pub.`
- **Catégorie :** Santé et remise en forme (*Health & Fitness*)
- **Mots-clés prioritaires ciblés :** suivi poids, compteur calories, jeûne intermittent, OMAD, scanner repas photo, coach nutrition IA, code-barres sans pub, fitness 3D.
- **Description longue (`~1 980 car.`) :**
```text
Reprenez le contrôle de votre poids, de vos repas et de votre énergie avec FolloWeight — le coach nutrition, jeûne intermittent et sport 100 % privé et sans publicité.

POURQUOI CHOISIR FOLLOWEIGHT ?
• Poids lissé scientifique (EMA) & Mensurations US Navy : fini la panique des variations d'eau sur la balance. Visualisez votre vraie tendance en 14 jours.
• Scanner Plat & Frigo IA (Photo) + Code-Barres & Enseigne : photographiez votre assiette, scannez un code-barres par caméra/photo (FW+, avec détection du magasin/enseigne) ou recherchez manuellement un code EAN OpenFoodFacts (Nutri-Score & classification NOVA).
• Jeûne Intermittent & OMAD (23:1, 16:8, 20:4, 5:2) : minuteur métabolique en direct avec alertes ouverture/fermeture de fenêtre et suivi d'hydratation.
• 44 Exercices avec Coach 3D Articulé & 10 Disciplines : exécutez vos mouvements correctement grâce au mannequin 3D interactif et au ravitaillement sport automatique (ISSN).
• Bilans Sanguins Éducatifs & Coach FW AI Connecté : importez vos marqueurs (HOMA-IR, TG/HDL, DFG, FIB-4) et posez vos questions à FW AI, connecté à vos chiffres du jour et à la recherche Web scientifique.

CONFIDENTIALITÉ & SÉCURITÉ CLINIQUE
• Zéro pub, zéro revente : vos pesées, mensurations et photos avant/après restent enregistrées localement sur votre appareil (IndexedDB).
• Garde-fous santé intégrés : planchers caloriques protégés, blocage automatique du jeûne et du déficit chez les mineurs (< 18 ans) et durant la grossesse.

VERSION GRATUITE À VIE & ABONNEMENT FW+
La quasi-totalité de l'app (saisie manuelle code EAN, courbe EMA, jeûne OMAD, 44 exercices, bilan sanguin local) reste gratuite à vie.
Passez à FolloWeight Plus (FW+) pour débloquer le Coach FW AI, les scans photo illimités et le scan code-barres caméra/photo avec détection du magasin/enseigne : 7 jours d'essai gratuit puis 29,99 €/an (soit 2,49 €/mois) ou 4,99 €/mois, résiliable en 2 clics depuis Google Play.

FolloWeight est un outil d'éducation bien-être et ne remplace pas un avis médical.
```

### Version Anglaise (`en-US` / `en-GB` — Secondaire)
- **App Name (`29/30 chars`) :**
  `FolloWeight: Fasting & Meals`
- **Short Description (`79/80 chars`) :**
  `AI meal scanner, OMAD fasting timer & smoothed weight curve. Private & ad-free.`

---

## 4. Configuration des Clés & Store (Check-list Actionnable)

### A. Secrets de Signature Android (.aab) dans GitHub Actions
Un keystore d'upload local a déjà été généré hors Git dans `vitalpulse/keystore/followeight-upload.jks` (+ `vitalpulse/android/keystore.properties`, tous deux dans `.gitignore`).

> ⚠️ **Important :** Sauvegardez `vitalpulse/keystore/followeight-upload.jks` et `vitalpulse/android/keystore.properties` dans un dossier cloud sécurisé (Google Drive / 1Password). Ne les perdez jamais et ne les commitez jamais sur Git !

Pour que GitHub Actions signe automatiquement chaque `.aab` de production :
1. Exécutez en PowerShell pour copier le keystore en Base64 :
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("D:\node animaze\node_app\vitalpulse\keystore\followeight-upload.jks")) | Set-Clipboard
   ```
2. Dans **GitHub > `Gamma-Burst/vitalpulse` > Settings > Secrets and variables > Actions**, créez :
   - `ANDROID_KEYSTORE_BASE64` = contenu du presse-papiers
   - `ANDROID_KEY_ALIAS` = `followeight-upload`
   - `ANDROID_KEYSTORE_PASSWORD` = mot de passe lu dans `vitalpulse/android/keystore.properties`
   - `ANDROID_KEY_PASSWORD` = idem
   - `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` = clé publique SDK Android RevenueCat (`goog_...`)

### B. Configuration Google Play Console & RevenueCat
1. Créez l'application `FolloWeight` (`com.followeight.app`) sur **Google Play Console**.
2. Activez **Play App Signing** puis copiez l'empreinte **SHA-256 du certificat de signature d'application** (*App Integrity > App signing key certificate*) et ajoutez-la dans `vitalpulse/public/.well-known/assetlinks.json`.
3. Dans **Monétisation > Produits > Abonnements**, créez :
   - Abonnement `fw_plus_annual` -> forfait de base `annual` (`29,99 €` renouvellement annuel) -> offre `free-trial-7d` (`7 jours gratuits`).
   - Abonnement `fw_plus_monthly` -> forfait de base `monthly` (`4,99 €` renouvellement mensuel).
4. Dans **RevenueCat (`app.revenuecat.com`)** :
   - Projet **FolloWeight**, app Android `com.followeight.app` + compte de service Google Play JSON.
   - Entitlement : `fw_plus`
   - Offering `default` reliant `annual` (`fw_plus_annual:annual`) et `monthly` (`fw_plus_monthly:monthly`).
   - Webhook RevenueCat -> URL `https://followeight.com/api/billing/webhook` avec en-tête `Authorization` = `REVENUECAT_WEBHOOK_AUTH`.

### C. Variables d'Environnement Vercel (`vitalpulse` / `followeight.com`)
Ajoutez dans **Vercel > Settings > Environment Variables** :
- `FOLLOWEIGHT_STRIPE_SECRET_KEY` (`sk_live_...`)
- `FOLLOWEIGHT_STRIPE_WEBHOOK_SECRET` (`whsec_...` pointant vers `https://followeight.com/api/billing/webhook`)
- `BILLING_HMAC_SECRET` (chaîne aléatoire >= 32 caractères)
- `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` (`goog_...`)
- `REVENUECAT_SECRET_API_KEY` (`sk_...`)
- `REVENUECAT_WEBHOOK_AUTH` (jeton secret partagé avec RevenueCat)

---

## 5. Réponses Exactes Play Console (Sécurité des Données & Santé)

### Formulaire « Sécurité des données » (*Data Safety*)
- **L'app collecte ou partage-t-elle des données utilisateur ?** Oui (uniquement les données envoyées à OpenAI/OpenFoodFacts lors des actions utilisateur explicites et l'identifiant d'achat RevenueCat/Google Play).
- **Données chiffrées en transit :** Oui (HTTPS TLS).
- **Lien de suppression des données / compte :** `https://followeight.com/delete-account`
- **Lien de confidentialité :** `https://followeight.com/privacy`
- **Catégories à déclarer :**
  - *Photos (Assiette / Frigo uniquement)* : traitées de manière **éphémère** (*processed ephemerally*) pour estimation nutritionnelle, non partagées avec des tiers publicitaires. Note : les **photos corporelles avant/après** restent **100 % sur l'appareil**.
  - *Activité dans l'app / Historique d'achats* : géré par Google Play Billing / RevenueCat pour déverrouiller `FW+`.
  - *Pub / Tracking* : Aucun SDK publicitaire, aucune donnée vendue.

### Déclaration « Applications de santé » (*Health Apps Declaration*)
Cases à cocher dans Play Console :
- ✅ **Activité physique et remise en forme** (*Activity and fitness*)
- ✅ **Nutrition et gestion du poids** (*Nutrition and weight management*)
- ✅ **Gestion du sommeil / jeûne bien-être** (ou laisser uniquement Activité & Nutrition si jeûne inclus dans gestion du poids)
- ❌ Ne PAS cocher *Aide à la décision clinique* ou *Dispositif médical*.

---

## 6. Assets Visuels Générés (`vitalpulse/store-assets/`)
- `icon-512x512.png` (`512×512`) — Icône officielle haute résolution Play Store
- `feature-graphic-1024x500.png` (`1024×500`) — Image de présentation Play Store (conforme featuring : sans prix ni mention « gratuit »)
- `01-dashboard-nutrition.png` à `06-coach-3d-exercices.png` (`1080×1920`) — 6 captures annotées issues de la vraie interface `followeight.com`
- Vidéos promotionnelles dans `d:\node animaze\node_app\videos\followeight-promo\out\` :
  - `followeight-google-play-promo-16x9.mp4` (`1920×1080`, sortie neutre conforme Google Play)
  - `followeight-launch-reel-9x16.mp4` (`1080×1920`, format Reels/Shorts avec offre d'essai)

> 💡 **Rappel compte développeur Google Play personnel (créé après nov. 2023) :** Si votre compte Play Console est un compte personnel récent, prévoyez **12 testeurs inscrits en Test fermé pendant 14 jours continus** avant l'ouverture du bouton *Publier en Production*.
