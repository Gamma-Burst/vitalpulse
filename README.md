# VitalPulse — Coach Nutrition, Métabolisme & Forme (Web PWA + Android)

Application complète Web (Next.js App Router PWA déployable sur Vercel) et Android native (Capacitor 7) conçue lors d'un brainstorm croisé à 3 intelligences (**Antigravity + Claude Opus 5.5 + Codex**).

## Fonctionnalités Clés

- **Photo de plat préparé + Zone de texte libre en dessous** : La Vision IA propose les ingrédients et portions (échelle par diamètre d'assiette), tandis que vos précisions écrites (huiles, sauces, grammes, pourcentage mangé) priment et s'ancrent sur la table officielle **ANSES Ciqual**.
- **Fourchette honnête & Clarificateur 1-clic** : Calcule `kcal ± marge` avec ajustement instantané huile/sauce et conservation permanente des photos + révisions + comparateur côte à côte.
- **Frigo → Recettes étape par étape (« Ferme ta journée »)** : Analyse photo du frigo + notes texte et génère 3 recettes adaptées aux calories, protéines et fibres restantes du jour, avec minuteurs intégrés, maintien d'écran allumé (`Wake Lock`) et ajout au journal en 1 clic.
- **Vrai Bilan Corporel Multi-Indices** : `IMC OMS` + `Ratio Tour de taille / Taille (WtHR < 0,50 NICE/HAS)` + `Body Roundness Index (BRI JAMA 2024)` + `Relative Fat Mass (RFM %)` + détection automatique des profils musclés + `BMR` Mifflin-St Jeor + plancher de sécurité clinique.
- **Podomètre, 24 Exercices Quotidiens & Zéro Double Comptage** : Déduction automatique des pas effectués pendant les séances et calcul des `METs nets (MET - 1)` selon le **Compendium of Physical Activities 2024**, plus mode **Journée difficile (2 min)** et micro-séances **VILPA 3×1 min**.
- **Analytique Multi-Jours & Décodeur de Balance** : Graphique interactif Activité + Calories ingérées vs dépensées + Déficit/Surplus quotidien, courbe poids brut vs moyenne lissée `EMA` et explication physiologique des variations d'eau liées au sel ou au glycogène.
- **Notifications Web Push VAPID & Veille Médicale Live** : Challenges personnalisés avec rappels Push + interrogation directe de **NCBI PubMed E-utilities**.

## Lancement Local

```bash
npm install
cp .env.example .env.local # puis renseigner OPENAI_API_KEY et clés VAPID
npm run dev
```

## Déploiement Vercel & Android APK

- **Web (Vercel)** : Déploiement direct via `vercel.json` et `.env.local` (sans exposer `OPENAI_API_KEY` ni `VAPID_PRIVATE_KEY` côté client).
- **Android (Capacitor)** : Le dossier `android/` contient les permissions `CAMERA`, `POST_NOTIFICATIONS`, `ACTIVITY_RECOGNITION` et `android.permission.health.READ_STEPS`. Le workflow [`.github/workflows/ci-and-android-apk.yml`](.github/workflows/ci-and-android-apk.yml) compile automatiquement l'APK Android dès le push sur GitHub.
