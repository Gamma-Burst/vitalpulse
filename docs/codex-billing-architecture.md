# Architecture Facturation, Abonnements & Coûts IA — FolloWeight (`followeight.com` / `com.followeight.app`)

Document technique d'exécution aligné avec `docs/claude-freemium-strategy.md`, `src/lib/billing-bridge.ts`, `src/components/SubscriptionModal.tsx` et `src/app/api/fw-ai/route.ts`.

---

## 1. Architecture Multi-Canal Conforme Stores & Web

| Canal | Prestataire / SDK | Produits / SKUs | Commission plateforme | Règle de conformité |
|---|---|---|---|---|
| **Android Google Play** (`com.followeight.app`) | **Google Play Billing v7** via `@revenuecat/purchases-capacitor` | `fw_plus_annual` (`29,99 €/an`, essai 7 j) · `fw_plus_monthly` (`4,99 €/mois`) | **15 %** sur la 1re tranche de `1 M$`/an (Small Business Program + abonnements Google Play) | Aucun lien sortant ni mention incitative vers un paiement Stripe externe dans le binaire Google Play hors cadre autorisé. |
| **Web Direct** (`https://followeight.com`) | **Stripe Checkout + Customer Portal + Webhooks** | `fw_plus_annual`, `fw_plus_monthly`, **`fw_founder_5y` (`69,90 €` / 5 ans, 1 000 places)** | **~1,5 % + 0,25 €** (carte EEE) | Synchronisation temps réel vers l'entitlement partagé `fw_plus` via webhook sécurisé. |
| **Apple App Store** (phase ultérieure iOS) | **StoreKit 2** via `@revenuecat/purchases-capacitor` | Mêmes SKUs cross-platform synchronisés par RevenueCat | **15 %** (Small Business Program `< 1 M$`) | Restauration d'achats native (`restorePurchases`) obligatoire dans les réglages. |

---

## 2. Entitlements & Quotas Applicatifs (`src/lib/billing-bridge.ts`)

Cinq états canoniques (`SubscriptionTier`) :

1. **`free` (`FolloWeight Essentiel`, `0 €`, zéro publicité)** :
   - Toutes les fonctions cœur illimitées : scan code-barres OpenFoodFacts, minuteur Jeûne / OMAD + notifications fenêtre, poids lissé EMA + Scale Decoder, mensurations US Navy & photos 100 % locales, 44 exercices / 10 sports + ravitaillement dynamique `sportRefuelKcal`, montres connectées, analyse déterministe du bilan sanguin, Lexique Santé `(?)`.
   - Quotas IA quotidiens (réinitialisation automatique à `00:00` local via `normalizeSubscriptionForToday`) :
     - **`FREE_DAILY_FW_AI_LIMIT = 5`** questions Coach FW AI / jour.
     - **`FREE_DAILY_VISION_SCAN_LIMIT = 3`** scans photo Vision / Frigo IA / jour.
2. **`pro_trial` (`Essai gratuit 7 jours`)** : accès complet `FW+` avec rappel J-2 avant facturation.
3. **`pro_monthly` (`4,99 €/mois`)** : accès complet `FW+` résiliable en 2 clics.
4. **`pro_annual` (`29,99 €/an`, soit `2,49 €/mois`)** : offre recommandée (−50 % par rapport au mensuel).
5. **`founder_lifetime` (`69,90 €` une fois, 5 ans sur `followeight.com`)** : accès `FW+` lié au compte.

Protection anti-abus abonné (`FW+`) : **`FW_PLUS_DAILY_SOFT_CAP = 80` requêtes/jour** (transparente pour un usage humain réel, bloque les scripts/partages de compte).

---

## 3. Unit Economics OpenAI (`gpt-4o-mini` + Vision) & Marge Brute

Hypothèses conservatrices (`gpt-4o-mini` à ~`0,0015 $` / message `FW AI` contextuel, ~`0,0030 $` / scan photo Vision avec compression `1024 px`) et net après commission Play Store Small Business (`15 %`) et TVA UE moyenne (~`17–20 %` selon pays) :

| Profil utilisateur | Usage mensuel estimé | Coût OpenAI / mois | Revenu net mensuel (29,99 €/an) | Marge brute après API |
|---|---|---|---|---|
| **Gratuit actif** (50 % convertissent ou restent organiques) | ~30 msg `FW AI` + 10 scans photo | `~0,075 $` (~`0,07 €`) | `0 €` (coût d'acquisition supporté par `~3–5 %` de conversion `FW+`) | Financé dès `1` abonné annuel pour `~25` gratuits actifs |
| **Abonné `FW+` médian** | ~120 msg `FW AI` + 35 scans photo | `~0,285 $` (~`0,26 €`) | **`~1,77 € / mois` net** (après TVA & 15 % Play) | **`~85,3 %`** (>> seuil cible `80 %`) |
| **Abonné `FW+` intensif** | ~300 msg `FW AI` + 60 scans photo | `~0,630 $` (~`0,58 €`) | **`~1,77 € / mois` net** | **`~67,2 %`** |
| **Usage critique / garde-fous** | Sans appel inutile si alerte clinique déterministe (`buildDeterministicFwAiReply`) | **`0,00 €`** | N/A | **100 % économisé** |

De plus, `OPENAI_API_KEY` est configurée côté serveur Vercel (jamais embarquée dans l'APK Android).

---

## 4. Plan de Déploiement Google Play Console en 3 Phases

1. **Phase 1 — Validation interne & APK / AAB signé (`com.followeight.app`)** :
   - Générer le keystore de signature Play App Signing (`upload-keystore.jks`, conservé hors Git dans les secrets CI GitHub Actions).
   - Compiler le bundle `.aab` (`./gradlew bundleRelease`) et publier en piste **Tests internes** (`Internal testing`) dans Google Play Console.
   - Renseigner la fiche *Sécurité des données* (*Data safety*) : stockage santé local sur l'appareil, aucune revente de données tierces, appels API éphémères pour `FW AI` / Vision avec bouton de signalement conforme Google Play AI Policy.
2. **Phase 2 — Configuration Google Play Billing + RevenueCat** :
   - Activer le compte marchand Google Payments et créer l'abonnement unique `fw_plus` avec deux plans de base (`base-annual` à `29,99 €/an` + offre `trial-7d`, `base-monthly` à `4,99 €/mois`) dans Google Play Console (`Monetize -> Products -> Subscriptions`).
   - Connecter le compte de service Google Play (`Service Account JSON`) dans RevenueCat et créer l'entitlement `fw_plus` relié à `@revenuecat/purchases-capacitor`.
   - Basculer `SubscriptionModal.tsx` et `billing-bridge.ts` de l'activateur local démo (`local_demo`) vers `Purchases.purchasePackage(...)` + `Purchases.restorePurchases()`, et masquer/conditionner les références Stripe Web dans les builds destinés à Google Play.
3. **Phase 3 — Tests fermés (12 testeurs / 14 jours) & Mise en production** :
   - Valider les testeurs sur comptes Google Play *License Testing* (essai 7j accéléré à quelques minutes, renouvellement, annulation, restauration sur changement d'appareil).
   - Après validation, ouvrir la piste **Production** sur Play Store tout en connectant le domaine **`followeight.com`** (DNS Hover → Vercel) pour l'acquisition Web et le Pass Fondateur Stripe.
