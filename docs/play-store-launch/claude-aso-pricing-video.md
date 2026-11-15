# FolloWeight — Marché fin 2026, prix, fiche Google Play (ASO) et vidéo démo 40 s

> **Produit** : FolloWeight · `https://followeight.com` · package Android `com.followeight.app`
> **Rédigé le** 15 novembre 2026 par Claude (Opus 5.5), agent local, à la demande du propriétaire.
> **Bases utilisées** : `docs/claude-freemium-strategy.md` (décisions de prix et benchmark), code lu le 15/11/2026 (`src/lib/billing-bridge.ts`, `src/lib/fw-ai-engine.ts`, `src/app/api/fw-ai/route.ts`, `src/app/api/analyze-meal/route.ts`, `src/components/FwAiCoachView.tsx`, `src/components/coach/ExerciseCoach3D.tsx`, `src/components/SubscriptionModal.tsx`, `src/lib/wearables-bridge.ts`, `src/components/FastingView.tsx`, `capacitor.config.ts`), recherches web du 15/11/2026 (sources en fin de document).
> **Statut** : document de travail prêt à l'emploi. **Rien n'a été publié, soumis ni rendu.** Toute publication (Play Console, YouTube, réseaux) reste soumise à l'accord explicite du propriétaire.
> **Chemin réel** : le fichier `src/components/ExerciseCoach3D.tsx` cité dans la demande se trouve en réalité dans `src/components/coach/ExerciseCoach3D.tsx`.

---

## Sommaire

0. [À lire d'abord : 5 bloquants trouvés dans le code](#0-à-lire-dabord--5-bloquants-trouvés-dans-le-code)
1. [Notre offre face au marché fin 2026](#1-notre-offre-face-au-marché-fin-2026)
2. [Fiche Google Play ASO, prête à copier-coller (FR + EN)](#2-fiche-google-play-aso-prête-à-copier-coller-fr--en)
3. [Vidéo démo 40 s : script, storyboard et prompts](#3-vidéo-démo-40-s--script-storyboard-et-prompts)
4. [Annexes : audit des promesses, comptages, sources](#4-annexes--audit-des-promesses-comptages-sources)

---

## 0. À lire d'abord : 5 bloquants trouvés dans le code

Ces points ne relèvent pas du marketing, mais ils conditionnent la fiche et la vidéo. Les promesses de la section 2 ont été écrites pour rester vraies **même si ces points ne sont pas encore corrigés**. Les lignes « à ajouter après livraison » sont signalées à part.

| # | Constat (vérifié dans le code le 15/11/2026) | Risque | Correction recommandée |
|---|---|---|---|
| **P0-1** | **Aucun contrôle de quota côté serveur.** `src/app/api/fw-ai/route.ts` et `src/app/api/analyze-meal/route.ts` ne vérifient ni le forfait ni le nombre d'appels. Le quota 5 + 3 n'existe que dans l'état local (`billing-bridge.ts`, `source: "local_demo"`). | N'importe qui peut appeler l'API sans limite, donc **coût IA non plafonné**. Une réinstallation remet aussi le compteur à zéro. | Compteur côté serveur par compte ou appareil (prévu au §2.3 de la stratégie), avec limitation de débit par IP. |
| **P0-2** | **L'app Android est une coquille Capacitor qui charge `https://followeight.com`** (`capacitor.config.ts`, `server.url`). La fenêtre d'abonnement affiche la carte **Pass Fondateur** avec « Achat direct sur followeight.com » et « Aucune commission store 15–30 % » (`SubscriptionModal.tsx` et `billing-bridge.ts`). | Politique Paiements Google Play : l'app ne doit pas orienter vers un achat web de contenu numérique en dehors d'un programme inscrit. Risque de **refus ou de retrait** de l'app. | Masquer la carte Fondateur et la mention de commission quand `isCapacitorNative` vaut vrai (`src/lib/native-bridge.ts` existe déjà). Garder seulement « J'ai déjà un Pass : me connecter ». |
| **P0-3** | **Pas encore de facturation Google Play réelle** : RevenueCat n'est pas installé (`package.json`) et l'essai est simulé localement. | La fiche ne peut pas annoncer un essai qui ne fonctionne pas encore. | Brancher `@revenuecat/purchases-capacitor` avant de publier la fiche et la vidéo qui mentionnent l'essai. |
| **P0-4** | **« Illimité » contre un plafond dur de 80 par jour** : `FW_PLUS_DAILY_SOFT_CAP = 80` bloque les messages **et** les scans d'un abonné, puis lui affiche la fenêtre d'abonnement. La stratégie prévoit 150 messages et 40 scans, avec un ralentissement plutôt qu'une coupure. | « Illimité » sans limite annoncée = pratique commerciale potentiellement trompeuse. Montrer un paywall à quelqu'un qui paie déjà nuit à la confiance. | Choisir **un** seuil, l'écrire dans les CGV, passer sur un petit modèle au lieu de bloquer, et ne jamais ouvrir le paywall pour un abonné. La fiche dit « sans limite quotidienne (usage personnel raisonnable) ». |
| **P0-5** | **La fiche anglaise vise une app encore en français** : toutes les chaînes de l'interface sont en français (`replyFr`, `nameFr`…). | Une fiche anglaise sur une interface 100 % française déçoit et attire des avis négatifs. | Publier la fiche EN seulement avec l'interface EN, ou garder la ligne « The app is currently in French » prévue en 2.2. |

**Autres écarts à corriger avant la campagne (P1)**

- **Coût de la recherche Web non chiffré dans la stratégie.** La route utilise `web_search_preview` avec `gpt-4o-mini`. D'après la grille OpenAI consultée le 15/11/2026, cet outil coûte **25 $ / 1 000 appels** avec un modèle sans raisonnement, contre ≈ 0,0015 $ pour un message sans recherche. Le prompt dit « Utilise librement la recherche Web ». Détail chiffré en 1.4.
- **Grossesse non transmise au coach.** `FwAiCoachView.tsx` n'envoie pas de champ `pregnant` dans le contexte : le garde-fou grossesse de `fw-ai-engine.ts` ne peut donc pas se déclencher depuis le chat. `FastingView.tsx` avertit seulement en dessous de 18 ans ou d'un IMC de 18,5. → Ajouter « enceinte / allaitante » au profil. **La fiche ne promet pas ce verrou.**
- **Persona « médecin » dans un prompt.** `analyze-meal/route.ts` commence par « Tu es un médecin nutritionniste… ». Cela contredit le positionnement « ni médecin ni diététicien » et peut ressortir dans les réponses. → « Tu es un assistant d'estimation nutritionnelle… ».
- **Promesse santé dans le lexique.** `glossary-terms.ts` présente « Phase Jeûne 20 h+ : Recyclage cellulaire (Autophagie) ». Ce contenu peut rester dans le lexique s'il est nuancé et sourcé, mais **jamais** dans la fiche, les captures ou la vidéo.
- **Bluetooth.** Web Bluetooth n'existe pas dans la WebView Android : la connexion directe de la ceinture cardio (BLE) ne fonctionnera pas dans l'app Play. La fiche parle donc d'**import** de données de montre, pas de synchronisation en direct.
- **Tu ou vous.** La stratégie choisit le tutoiement, mais l'interface et FW AI vouvoient. La fiche et la vidéo tutoient : il faut aligner l'app (ou réécrire la fiche au vouvoiement).

---

## 1. Notre offre face au marché fin 2026

### 1.1 Ce qui a changé en 2026

| Acteur | Fait 2026 vérifié | Conséquence pour FolloWeight |
|---|---|---|
| **MyFitnessPal × Cal AI** | MyFitnessPal a annoncé le **rachat de Cal AI le 2 mars 2026**. Cal AI reste une app séparée, désormais reliée à la base alimentaire de MFP. Montant non publié. | Le leader du journal et le leader de la photo IA appartiennent au même groupe. La photo IA devient une fonction standard : **elle ne suffira plus à nous distinguer.** |
| **MyFitnessPal Premium** | **79,99 $/an** (19,99 $/mois). Le **scan code-barres est payant** depuis 2022. | La critique la plus fréquente des utilisateurs reste notre meilleur angle : **le scan gratuit pour toujours**. |
| **MacroFactor** | Nutrition **71,99 $/an**. **Bundle Nutrition + Workouts 89,99 $/an** pour les abonnés arrivés depuis le 1er janvier 2026. **Pas de version gratuite** (essai de 7 jours). | FW+ (29,99 €/an) réunit nutrition, entraînement, jeûne et IA. Il coûte **1/3 du bundle MacroFactor**. |
| **Foodvisor** | ≈ **83,99 $/an** aux États-Unis (mi-2026). | La photo IA chère reste la norme. |
| **YAZIO PRO** | Jusqu'à ≈ **47,90 €/an** selon le pays et la promotion (plancher observé à 29,99 €). | C'est le concurrent européen le plus proche par le prix. Notre argument face à lui : **une version gratuite plus riche** (jeûne avancé, coach 3D, IA). |

*Prix publics relevés par des tiers ou sur les pages officielles. Ils varient selon le pays et la date. Les prix US sont hors taxes, les prix UE TTC. À revérifier en boutique avant toute communication comparative (art. L122-1 du Code de la consommation).*

### 1.2 Pourquoi notre grille est le bon point d'équilibre

**Rappel de l'offre**

- **Gratuit, sans limite de durée** : scan code-barres illimité, jeûne 16:8, 20:4 et OMAD, coach 3D (44 exercices), courbe de poids lissée (EMA), bilan sanguin ponctuel, montres, zéro pub. S'y ajoutent **5 questions FW AI et 3 scans photo par jour**.
- **FW+** : **29,99 €/an** avec 7 jours d'essai, ou **4,99 €/mois**.
- **Pass Fondateur 5 ans** : **69,90 €**, vendu uniquement sur `followeight.com`, limité à 1 000 places.

**L'équilibre tient sur quatre forces à la fois.**

| Force | Comment la grille la sert | Chiffre clé |
|---|---|---|
| **1. Acquisition** | Tout ce qui ne coûte rien à servir (scan, jeûne, courbes, 3D) est gratuit. C'est exactement ce que MFP, Cronometer et YAZIO font payer. On gagne la comparaison avant même de parler de prix. | Scan payant chez MFP, version gratuite inexistante chez MacroFactor |
| **2. Monétisation** | On ne fait payer que ce qui coûte : l'IA. Les quotas 5 + 3 font goûter la valeur sans exposer le budget. | Revenu net d'un annuel via Play : **21,24 €** (stratégie §3.3) |
| **3. Perception du prix** | 29,99 € reste sous le seuil des 30 €. L'annuel revient à 2,50 €/mois, soit −50 % face au mensuel. | **−62 %** face à MFP (79,99 $), **−58 %** face à MacroFactor Nutrition (71,99 $), **−67 %** face au bundle MacroFactor (89,99 $), **−64 %** face à Foodvisor US (83,99 $), **−37 %** face au haut de fourchette YAZIO (47,90 €) |
| **4. Trésorerie** | Le Pass Fondateur encaisse 5 ans d'un coup, sur le web, sans commission de store. Il finance l'acquisition de lancement. | 69,90 € = 2,3 années d'annuel. Net web direct ≈ **56,60 €** contre 49,51 € s'il était vendu dans l'app |

**Pourquoi ne pas descendre à 19,99 €** : le net Play tomberait à ≈ 14,16 € par an (19,99 € TTC → 16,66 € HT → −15 %). Le coût IA d'un abonné typique (≈ 4-5 €/an hors recherche Web, stratégie §4.10) en absorberait plus de 30 %. Et un prix plus bas ne rendrait pas la version gratuite plus attirante.

**Pourquoi ne pas monter tout de suite à 39,99 €** : un nouvel entrant sans avis ne peut pas s'aligner sur MFP. Le test 34,99 / 39,99 € reste prévu à M+3, sur les nouveaux utilisateurs seulement (stratégie §3.9).

**Honnêteté sur notre position** : nous ne sommes **pas** les moins chers partout. Cal AI (29,99-39,99 $) et le prix plancher de YAZIO (29,99 €) sont au même niveau. Notre avantage n'est pas le prix seul. C'est **le prix le plus bas du marché *et* la version gratuite la plus complète**.

### 1.3 Le nouveau fossé concurrentiel (après le rachat de Cal AI)

La photo IA se banalise. FolloWeight doit donc mettre en avant ce que MFP et Cal AI ne peuvent pas copier facilement sans abîmer leur propre modèle :

1. **Gratuit là où eux font payer** : le scan code-barres et le jeûne. MFP ne peut pas rendre le scan gratuit sans perdre un levier de Premium.
2. **L'honnêteté comme fonction visible** :
   - une **fourchette** de calories (`caloriesMin` à `caloriesMax` dans `analyze-meal`) plutôt qu'un chiffre faussement exact ;
   - des **sources citées** par FW AI (puces cliquables dans `FwAiCoachView.tsx`) ;
   - une mention IA permanente et un bouton « Signaler » ;
   - un prix affiché avant toute souscription.
3. **Un ancrage français et européen** : Nutri-Score et NOVA dès le scan (`api/barcode` lit `nutriscore_grade` et `nova_group` sur Open Food Facts), références ANSES, HAS et OMS, données de santé stockées sur le téléphone. Les apps américaines ne parlent pas cette langue.
4. **Le coach 3D intégré**. MacroFactor vend son app d'entraînement à part. Chez nous, le coach 3D tourne à 360°, se ralentit et colore les muscles sollicités, dans la même app, **gratuitement**.

### 1.4 Le risque de coût caché : la recherche Web

**Hypothèses de calcul** :

- recherche déclenchée sur **30 %** des questions : hypothèse, car le prompt pousse à chercher, **à mesurer** ;
- outil `web_search_preview` avec un modèle sans raisonnement : 25 $ / 1 000 appels ;
- outil `web_search` actuel : 10 $ / 1 000 appels, plus un bloc fixe de 8 000 jetons d'entrée pour `gpt-4o-mini`, soit ≈ 0,0112 $ par appel ;
- grille OpenAI à confirmer sur la page officielle.

| Profil | Coût IA mensuel sans recherche (stratégie §4.10) | Avec `web_search_preview` sur 30 % des questions | Avec `web_search` sur 10 % des questions |
|---|---|---|---|
| Gratuit typique (24 questions/mois) | ≈ 0,07 $ | ≈ **0,25 $** (×3,6) | ≈ 0,10 $ |
| FW+ typique (160 messages/mois) | ≈ 0,30-0,45 $ | ≈ **1,50-1,65 $** | ≈ 0,48-0,63 $ |

Un abonné annuel rapporte environ 1,77 € net par mois. Avec la version actuelle du code, la recherche Web peut donc **absorber l'essentiel de la marge d'un abonné actif**.

**Correctifs, du moins coûteux au plus coûteux** :

1. Passer de `web_search_preview` à `web_search`.
2. Ne lancer la recherche que pour les questions qui en ont besoin : une enseigne, un restaurant, un produit précis, une étude, l'actualité. Un filtre simple par mots-clés suffit pour commencer.
3. En gratuit, limiter la recherche à **1 question par jour**. En FW+, la laisser libre dans l'usage raisonnable.
4. Ajouter le **taux de questions avec recherche Web** au KPI hebdomadaire « coût IA / revenu net ≤ 20 % ».

### 1.5 Améliorations de l'offre (sans toucher aux prix)

| Amélioration | Pourquoi | Statut |
|---|---|---|
| **Prix de lancement garanti** : « Ton prix reste 29,99 €/an tant que tu restes abonné » | Réduit la peur d'une hausse. Google Play gère des groupes d'abonnés qui gardent leur ancien prix. Prépare le test à 34,99 € sans trahir les premiers abonnés. | À ajouter au paywall et aux CGV |
| **Usage raisonnable chiffré et identique partout** (CGV, paywall, code) | Rend « illimité » défendable juridiquement (P0-4) | À trancher : 80 (code) ou 150/40 (stratégie) |
| **Pass Fondateur : remboursement au prorata si le service s'arrête** | Fort signal de confiance pour un achat de 5 ans. Engagement financier à décider. | Décision du propriétaire (stratégie §3.1) |
| **Garder 5 questions + 3 scans** | Un quota qui baisse casse une promesse. On joue d'abord sur le modèle « nano » et la limitation de la recherche Web. | À maintenir |
| **FW+ Duo à 44,99 €/an** | Cal AI a une offre famille à 59,99 $ | Phase 2 (après 6 mois de données) |

### 1.6 Micro-optimisations UX : plus de conversions, sans perdre la confiance

Classées par **effet attendu / effort**. Les effets sont des **hypothèses à mesurer** (tests A/B RevenueCat ou expériences de fiche Play Console), pas des promesses.

| # | Optimisation | Où | Effet attendu (à mesurer) | Garde-fou confiance / Play |
|---|---|---|---|---|
| 1 | **Parcours « déclic en 90 secondes »** : à la fin de l'onboarding, proposer 1 scan photo (non décompté), 1 scan code-barres et l'explication de la courbe lissée. Le paywall vient **après** ces trois moments. | `OnboardingWizard.tsx` | Activation J1 et départs d'essai | Le paywall de fin d'onboarding reste sautable, avec « Continuer gratuitement » de même poids |
| 2 | **Paywall avec frise de l'essai** : « Aujourd'hui : tout débloqué → J5 : rappel → J7 : 29,99 €/an, annulable dans Google Play » | `SubscriptionModal.tsx` | Départs d'essai, moins de remboursements | Le montant réellement débité est le plus visible. **Le rappel doit exister réellement** (notification push) avant d'être affiché |
| 3 | **Aperçu personnalisé** : flouter une vraie réponse FW AI ou une tendance multi-bilans calculée sur les données de l'utilisateur | Déclencheurs 2, 4 et 6 de la stratégie | Désir lié à **ses** données, pas à une promesse générique | Pas de faux chiffres. Si la donnée manque, ne pas afficher d'aperçu |
| 4 | **Quota épuisé = porte de sortie gratuite** : « 3 scans photo utilisés. Le scan code-barres reste illimité » avec un bouton direct vers le scan | `MealScannerView.tsx` | Moins de frustration, rétention J7 | Aucun paywall pendant un jeûne, après une hausse de poids ou après un message de sécurité (stratégie §3.6) |
| 5 | **Masquer le Pass Fondateur dans l'app Android** (P0-2). Garder « J'ai déjà un Pass : me connecter » | `SubscriptionModal.tsx` + `native-bridge.ts` | Évite un refus Play | Politique Paiements Google Play |
| 6 | **Demande d'avis au bon moment** (API In-App Review) : après une série de 4 jours sur 7, la 1re baisse de tendance EMA ou une séance terminée. **Jamais** après un paywall ou une hausse sur la balance | Nouveau hook | Note moyenne, donc conversion de la fiche | Règles Google : pas de récompense, pas de question préalable « Tu aimes l'app ? », Google limite lui-même la fréquence |
| 7 | **Badge de confidentialité sur le paywall** : « Tes données de santé restent sur ton téléphone » | `SubscriptionModal.tsx` | Confiance au moment de payer | Doit correspondre exactement à la section Sécurité des données |
| 8 | **Passage mensuel → annuel** au 2e renouvellement : « 29,99 € au lieu de 59,88 € » | RevenueCat | Revenu par abonné | Pas de fausse remise. Le calcul est réel (12 × 4,99 €) |
| 9 | **Expériences de fiche Play** : capture n° 1 (photo contre code-barres), description courte A/B | Play Console | Taux visite → installation | Uniquement des textes conformes (§2.4) |
| 10 | **Compteur rassurant** : « Encore 2 questions aujourd'hui » plutôt que « 3/5 utilisées » | `FwAiCoachView.tsx` | Moins d'anxiété | Ne jamais décompter une réponse de sécurité (déjà fait : `incrementQuota = !safetyGuardTriggered`) |

**À ne jamais faire** :

- compte à rebours factice ;
- croix de fermeture minuscule ;
- abonnement hebdomadaire ;
- fausse remise barrée « −70 % » ;
- paywall à l'ouverture ;
- notification promotionnelle pendant une fenêtre de jeûne ;
- avant/après corporels ;
- chiffres de perte de poids promis.

---

## 2. Fiche Google Play ASO, prête à copier-coller (FR + EN)

### 2.0 Règles appliquées (Google Play, vérifiées le 15/11/2026)

- **Titre** (30 caractères au plus) : pas de mots de classement ou de promotion (« meilleur », « n° 1 », « top », « gratuit », « sans pub »), pas d'emoji, pas de majuscules continues hors marque. Le **titre** porte le plus de poids pour le référencement.
- **Captures, image de présentation, vidéo** : Google recommande d'éviter les mots « gratuit », « meilleur », « n° 1 », les prix, les promotions et les badges de store. Une non-conformité ne bloque pas la fiche, mais **exclut des mises en avant** de Google Play. → Les captures disent « illimité, inclus pour tous », pas « gratuit ». Le mot « gratuit » reste dans la description et dans les publicités sociales.
- **Noms de concurrents** : aucun dans la fiche. Google sanctionne les références à d'autres apps hors contexte. L'angle « anti-MyFitnessPal » reste **implicite** (« reste gratuit »).
- **Santé** : aucune promesse de résultat, aucun diagnostic, aucun « soigne », « guérit » ou « perds X kg ». Mentions IA transparentes.
- **Pass Fondateur** : **absent de la fiche Play**, car il n'est vendu que sur le web (P0-2).
- **Comptage** : caractères Unicode, espaces et ponctuation compris (« û », « é » et « ’ » comptent pour 1). Les comptages ci-dessous ont été vérifiés par script (annexe 4.2).

### 2.1 Fiche française

**Titre (30/30)**
<!-- check:title_fr max=30 -->
```text
FolloWeight : Calories & Jeûne
```
*Variante (29/30)* : `FolloWeight : Calories, Jeûne`

**Description courte (78/80)**
<!-- check:short_fr max=80 -->
```text
Calories en photo, scan code-barres illimité, jeûne, coach IA et 3D. Sans pub.
```

**Description complète (≤ 3 500 caractères, comptage exact en annexe 4.2)**
<!-- check:full_fr max=3500 -->
```text
FolloWeight t'aide à comprendre ce que tu manges, à suivre ton poids sans pression et à mieux bouger. Compteur de calories en photo, scan code-barres illimité, jeûne intermittent, coach sportif 3D et coach IA : tout est réuni dans une seule app, sans publicité.

CALORIES EN PHOTO, AVEC UNE FOURCHETTE HONNÊTE
Prends ton assiette ou ton frigo en photo. L'IA reconnaît les aliments, estime les portions et te donne une fourchette de calories (par exemple 520 à 610 kcal) plutôt qu'un chiffre faussement précis. Un filet d'huile, une portion entamée ? Tu ajustes en un geste.
• 3 scans photo par jour inclus.

SCAN CODE-BARRES ILLIMITÉ
Scanne tes produits et retrouve calories, protéines, glucides, lipides, Nutri-Score et degré de transformation (NOVA). Illimité dans la version gratuite, sans abonnement.

FW AI, TON COACH IA
Pose tes questions comme à un ami : « Que manger ce soir avec ce qu'il me reste ? », « Pourquoi la balance a pris 600 g ? ». FW AI s'appuie sur ta journée (calories, protéines, pas, jeûne, séances) et peut chercher sur le Web en temps réel en citant ses sources.
• 5 questions par jour incluses.
FW AI est une intelligence artificielle : ses réponses peuvent contenir des erreurs et ne remplacent pas un avis médical. Chaque réponse peut être signalée.

COACH SPORTIF 3D
44 exercices animés en 3D : fais tourner le coach à 360°, ralentis le geste et vois les muscles sollicités. 10 disciplines (course, vélo, football…) avec des calories d'effort calculées sans double comptage.

COURBE DE POIDS LISSÉE
Ton poids varie de 800 g d'un jour à l'autre ? La courbe lissée (moyenne mobile exponentielle) sépare ta tendance réelle des variations d'eau, et le Décodeur de balance t'explique pourquoi. Mensurations, tour de taille, IMC et photos d'évolution restent sur ton téléphone.

JEÛNE INTERMITTENT
Minuteur 16:8, 20:4 et OMAD (un repas par jour), avec une notification à l'ouverture et à la fermeture de ta fenêtre repas. Par sécurité, FolloWeight n'applique aucun déficit calorique avant 18 ans et déconseille le jeûne avant 18 ans ou en cas d'IMC bas.

BILAN SANGUIN EXPLIQUÉ
Saisis ou colle les résultats de ton laboratoire : chaque marqueur est expliqué en mots simples, avec des questions à poser à ton médecin. Outil éducatif, sans diagnostic.

MONTRES CONNECTÉES
Importe tes pas et tes séances depuis Samsung Health, Garmin, Fitbit, Zepp ou un export Apple Santé.

FW+ (OPTIONNEL)
FW AI et scans photo sans limite quotidienne (usage personnel raisonnable). Abonnement mensuel ou annuel ; l'annuel commence par 7 jours d'essai gratuit. Annulable à tout moment dans Google Play.

CONFIDENTIALITÉ
Tes données de santé sont enregistrées sur ton téléphone. Ce que tu envoies à l'IA (photo, question, bilan, résumé de ta journée) passe par nos serveurs et notre fournisseur d'IA, uniquement pour l'analyse.

AVERTISSEMENT
FolloWeight est un outil de bien-être et d'éducation nutritionnelle. Il ne pose aucun diagnostic et ne remplace pas un professionnel de santé. Si tu es enceinte, allaites, suis un traitement ou as un problème de santé, demande l'avis de ton médecin avant de jeûner ou de changer ton alimentation.

Données alimentaires : Open Food Facts (licence ODbL).
```

**Lignes à ajouter seulement quand la fonction est livrée et testée** (chacune ≤ 1 ligne, garder le total ≤ 3 500) :

- Sous FW+ : `Suivi de plusieurs bilans sanguins dans le temps et export PDF pour ton médecin.` (aucun générateur PDF ni tendance multi-bilans trouvés dans le code au 15/11)
- Sous FW+ : `Périodisation de tes séances et progression des charges.` (seule la saisie du tonnage existe dans `ActivityCoachView.tsx`)
- Sous FW+ : `Rappel 2 jours avant la fin de l'essai.` (aucun rappel d'essai trouvé)
- Sous MONTRES : `Synchronisation automatique avec Health Connect.` (aucun plugin Health Connect natif dans `package.json` à ce jour)

### 2.2 English listing

**Title (28/30)**
<!-- check:title_en max=30 -->
```text
FolloWeight: Calorie Counter
```
*Variant (30/30)*: `FolloWeight: Calorie & Fasting`. « Calorie counter » est la requête la plus recherchée en anglais. La variante place le jeûne dans le titre : à tester avec une expérience de fiche.

**Short description (79/80)**
<!-- check:short_en max=80 -->
```text
Photo calorie counter, unlimited barcode scans, fasting, 3D & AI coach. No ads.
```

**Full description (≤ 3,500 characters)**
<!-- check:full_en max=3500 -->
```text
FolloWeight helps you understand what you eat, track your weight without pressure and move better. Photo calorie counter, unlimited barcode scanner, intermittent fasting, 3D workout coach and AI coach, all in one app with no ads.

PHOTO CALORIES WITH AN HONEST RANGE
Snap your plate or your fridge. The AI recognizes foods, estimates portions and gives you a calorie range (for example 520 to 610 kcal) instead of a falsely precise number. A drizzle of oil, a half-eaten portion? Adjust it in one tap.
• 3 photo scans per day included.

UNLIMITED BARCODE SCANNER
Scan your groceries to see calories, protein, carbs, fat, Nutri-Score and processing level (NOVA). Unlimited in the free version, no subscription needed.

FW AI, YOUR AI COACH
Ask the way you would ask a friend: "What can I eat tonight with what I have left?", "Why did the scale jump 600 g?" FW AI uses your day (calories, protein, steps, fasting, workouts) and can search the web in real time, citing its sources.
• 5 questions per day included.
FW AI is an artificial intelligence: its answers may contain mistakes and are not medical advice. Every answer can be reported.

3D WORKOUT COACH
44 exercises animated in 3D: rotate the coach 360°, slow the movement down and see which muscles are working. 10 sports (running, cycling, football…) with workout calories counted once, never twice.

SMOOTHED WEIGHT TREND
Up 800 g overnight? The smoothed trend line (exponential moving average) separates your real trend from water swings, and the Scale Decoder explains why. Measurements, waist, BMI and progress photos stay on your phone.

INTERMITTENT FASTING
16:8, 20:4 and OMAD (one meal a day) timers, with a notification when your eating window opens and closes. For safety, FolloWeight never sets a calorie deficit under 18 and advises against fasting under 18 or with a low BMI.

BLOOD TEST EXPLAINED
Type or paste your lab results: each marker is explained in plain words, with questions to ask your doctor. Educational tool, no diagnosis.

SMARTWATCHES
Import your steps and workouts from Samsung Health, Garmin, Fitbit, Zepp or an Apple Health export.

FW+ (OPTIONAL)
FW AI and photo scans with no daily limit (fair personal use). Monthly or yearly plan; the yearly plan starts with a 7-day free trial. Cancel anytime in Google Play.

PRIVACY
Your health data is stored on your phone. What you send to the AI (photo, question, lab results, summary of your day) goes through our servers and our AI provider for the analysis only.

DISCLAIMER
FolloWeight is a wellness and nutrition education tool. It does not diagnose and does not replace a health professional. If you are pregnant, breastfeeding, on medication or have a health condition, ask your doctor before fasting or changing your diet.

The app is currently in French; English is coming soon.

Food data: Open Food Facts (ODbL license).
```
> **Retirer la ligne « The app is currently in French… »** dès que l'interface anglaise est livrée (P0-5).

### 2.3 Texte des 6 captures d'écran

**Format** : portrait 9:16, 1080 × 1920 px minimum (Google recommande au moins 4 captures de 1080 px ou plus pour être éligible aux mises en avant ; à revérifier dans la Play Console).
**Mise en page** : titre en haut (2 lignes au plus, 64-72 px, graisse 800), sous-titre en dessous (34-40 px), **vraie capture de l'app** en dessous.
**Règles** :

- pas de cadre de téléphone obligatoire ;
- pas de « gratuit », de prix ni de badge Google Play ;
- les chiffres visibles sont ceux réellement affichés par l'app pendant la capture, à partir des données de démonstration `src/data/demo-seed.ts`. On ne retouche aucun chiffre.

**Ordre** : les 3 premières captures s'affichent dans les résultats de recherche. Elles portent les 3 arguments les plus forts.

| # | Écran réel à capturer | Titre FR | Sous-titre FR | Title EN | Subtitle EN |
|---|---|---|---|---|---|
| 1 | `MealScannerView` : résultat photo avec la carte fourchette `caloriesMin–caloriesMax` | Ton assiette en une photo | Une fourchette honnête, pas un chiffre magique | Your plate, one photo | An honest range, not a magic number |
| 2 | `BarcodeScannerModal` : fiche produit Open Food Facts avec Nutri-Score et NOVA | Scan code-barres illimité | Inclus pour tous · données Open Food Facts | Unlimited barcode scans | Included for everyone · Open Food Facts data |
| 3 | `FwAiCoachView` : réponse avec puce « Recherche Web temps réel », sources et bandeau IA | FW AI cite ses sources | Ta journée + le Web en direct, sources à l'appui | FW AI cites its sources | Your day + the live web, sources included |
| 4 | `ExerciseCoach3D` : squat en vue 3/4, muscles colorés, mention « Glissez pour tourner à 360° » visible | Le bon geste, en 3D | 44 exercices à 360°, muscles en couleur | See every move in 3D | 44 exercises in 360°, muscles highlighted |
| 5 | Courbe de poids : points bruts + courbe EMA + message du Décodeur | Ta vraie tendance de poids | La courbe lissée ne panique pas pour un kilo d'eau | Your real weight trend | A smooth line that stays calm over water weight |
| 6 | Montage en 3 bandes : anneau de jeûne, carte de bilan expliqué, feuille d'import montre | Jeûne, bilan, montre | 16:8 à OMAD · bilan expliqué · montres importées | Fasting, labs, watch | 16:8 to OMAD · labs explained · watch import |

Comptages (titres ≤ 26 caractères, sous-titres ≤ 52, vérifiés en annexe 4.2).

### 2.4 Contrôle de conformité de la fiche (à cocher avant envoi)

- [ ] Aucun mot interdit dans le titre (« gratuit », « meilleur », « n° 1 », « top », « sans pub », emoji)
- [ ] Aucun nom de concurrent dans les textes, captures ou vidéo de la fiche
- [ ] Aucune promesse de perte de poids chiffrée ni de diagnostic
- [ ] Chaque fonction citée existe dans la version Android publiée (annexe 4.1)
- [ ] Section Sécurité des données cohérente avec « Confidentialité » (photos et bilans envoyés au fournisseur d'IA, conservation, chiffrement)
- [ ] Déclaration des apps de santé remplie, politique de confidentialité en ligne
- [ ] Pass Fondateur absent de la fiche et de l'app Android (P0-2)
- [ ] Essai de 7 jours réellement branché sur Google Play Billing (P0-3)
- [ ] Fiche EN publiée seulement avec l'interface EN, ou avec la ligne « currently in French » (P0-5)

---

## 3. Vidéo démo 40 s : script, storyboard et prompts

### 3.0 Principe créatif : le « Pont du Quotidien »

**Idée** : partir d'un geste que tout le monde fait déjà (photographier son assiette, scanner un produit, regarder sa montre, monter sur la balance) et montrer que FolloWeight **répond** à ce geste. La vidéo suit **une seule journée** de la même personne, de midi au lendemain matin. Une heure discrète s'affiche à l'écran (12:30 → 18:00 → 19:00 → 19:45 → 7:00) : le spectateur comprend sans explication que l'app accompagne une vraie journée.

**Personnage** : une femme d'environ 38 ans, silhouette ordinaire, tenue du quotidien. **Pas un mannequin fitness**, aucun plan qui insiste sur le corps, aucun avant/après. C'est cohérent avec le ton de FW AI, qui ne commente jamais le corps, et avec les règles publicitaires de Meta et Google sur la minceur. La casting reste au choix du propriétaire. Les prompts H3 décrivent ce personnage pour assurer la continuité.

**Deux masters, un seul montage** :

| Master | Format | Usage | Fin |
|---|---|---|---|
| **A — Play Store** | 16:9, 1920 × 1080, 30 i/s | Vidéo de la fiche (URL YouTube **classique**, pas un Short) : publique ou non répertoriée, intégrable, **monétisation désactivée**, sans limite d'âge | **Fin neutre sans prix ni essai** (réplique 6-Play). Les prix, l'essai et les badges dans la vidéo de la fiche font perdre l'éligibilité aux mises en avant |
| **B — Reels / Shorts / TikTok** | 9:16, 1080 × 1920, 30 i/s | Réseaux sociaux | **CTA complet** : `Essai 7 jours gratuit · Google Play & followeight.com` + mention légale du prix après l'essai |

**Répartition des images** :

| Type d'image | Durée | Part |
|---|---|---|
| Plans de vie réelle générés par **MiniMax H3** | ≈ 10 s | 25 % |
| **Vraies captures de l'app** | ≈ 22 s | 55 % |
| Carton final **Remotion** | 8 s | 20 % |

**Règle absolue : l'interface de l'app n'est jamais générée par H3.** Un modèle vidéo invente du texte et des chiffres. Dans les plans H3, le téléphone est toujours **de dos ou hors netteté**, puis on coupe sur une vraie capture.

**Outils** :

- Remotion **4.0.543** en version exacte (charger le skill `remotion-best-practices` avant le travail) ;
- MiniMax H3 via H3 Continuity Studio, avec mémoire de personnage `memory: "selected"` sur le même cast pour les 5 plans ;
- Xiaomi MiMo pour la voix (3.3) ;
- Stable Audio local pour la musique, Earshot pour les bruitages ;
- contrôle final avec `tools/director-qa-gate.mjs` avant toute publication.

Si H3 tourne sur RunPod, les règles permanentes s'appliquent : budget, échéance, garde-fou, heartbeat, puis arrêt confirmé `EXITED`.

### 3.1 Les 6 répliques françaises (texte exact pour Xiaomi MiMo TTS)

Débit mesuré sur le texte écrit, espaces et ponctuation compris, rapporté à la **fenêtre de voix** de chaque scène. Cible : **10-12 caractères par seconde**.

| # | Fenêtre voix | Réplique exacte (texte affiché en sous-titre) | Car. | Débit |
|---|---|---|---|---|
| **1** | 0,15 → 6,65 s | `Tu photographies déjà ton assiette ? Elle te répond : une fourchette honnête.` | 77 | 11,8 c/s |
| **2** | 7,15 → 12,55 s | `Le scan code-barres ? Chez nous, il reste gratuit. À vie.` | 57 | 10,6 c/s |
| **3** | 12,95 → 18,55 s | `Ton coach 3D montre le geste. Tourne-le : les muscles s'allument.` | 65 | 11,6 c/s |
| **4** | 18,95 → 25,15 s | `FW AI cherche sur le Web, cite ses sources, et lit ta montre.` | 61 | 9,8 c/s* |
| **5** | 25,55 → 31,75 s | `Jeûne, bilan sanguin, et une courbe qui ne panique pas pour un kilo d'eau.` | 74 | 11,9 c/s |
| **6** (réseaux, master B) | 32,15 → 37,75 s | `FW+ gratuit pendant 7 jours. Sur Google Play et followeight.com.` | 64 | 11,4 c/s |
| **6-Play** (master A) | 32,15 → 37,75 s | `FolloWeight : tes repas, ton poids, ton sport. Enfin lisibles.` | 62 | 11,1 c/s |

\* « FW AI » se prononce « èf-double-vé A-I », plus long à l'oral qu'à l'écrit : le débit parlé réel est proche de 11 c/s.

**Accroche 0-3 s** : la première phrase de la réplique 1, `Tu photographies déjà ton assiette ?` (36 caractères en 3,0 s, soit 12,0 c/s). C'est le « pont » : on part d'une habitude que le spectateur a déjà.

**Variantes d'accroche à tester en A/B** sur les réseaux, à la place de la première phrase de la réplique 1 :

- `Midi. Ton assiette. Combien ?` (29 car.)
- `La balance affiche plus un kilo ?` (33 car.). Elle demande de remonter la scène 5 en ouverture : c'est un autre montage.

**Variante sûre de la réplique 4**, à utiliser si l'import de montre n'est pas disponible dans la version Android publiée : `FW AI cherche sur le Web, cite ses sources, et connaît ta journée.` (66 car., 10,6 c/s).

**Entrée envoyée au TTS (texte normalisé pour la prononciation)**. Le sous-titre garde le texte exact du tableau.

| # | Entrée TTS |
|---|---|
| 1 | `Tu photographies déjà ton assiette ? Elle te répond : une fourchette honnête.` |
| 2 | `Le scan code-barres ? Chez nous, il reste gratuit. À vie.` |
| 3 | `Ton coach trois D montre le geste. Tourne-le : les muscles s'allument.` |
| 4 | `F W A I cherche sur le Web, cite ses sources, et lit ta montre.` |
| 5 | `Jeûne, bilan sanguin, et une courbe qui ne panique pas pour un kilo d'eau.` |
| 6 | `F W plus, gratuit pendant sept jours. Sur Google Play et follo-weight point com.` |
| 6-Play | `Follo-weight : tes repas, ton poids, ton sport. Enfin lisibles.` |

### 3.2 Chronologie maîtresse (Remotion 30 i/s, 1 200 images)

| Scène | Temps | Images @30 | Contenu | Voix |
|---|---|---|---|---|
| 1 | 0,00 → 7,00 s | 0 → 210 | Accroche + photo d'assiette → fourchette | R1 |
| 2 | 7,00 → 12,80 s | 210 → 384 | Scan code-barres gratuit à vie | R2 |
| 3 | 12,80 → 18,80 s | 384 → 564 | Coach 3D à 360° | R3 |
| 4 | 18,80 → 25,40 s | 564 → 762 | FW AI connecté au Web + montres / Apple Santé | R4 |
| 5 | 25,40 → 32,00 s | 762 → 960 | Jeûne OMAD, bilan sanguin, courbe EMA | R5 |
| 6 | 32,00 → 40,00 s | 960 → 1 200 | CTA (B) ou fin neutre (A) | R6 / R6-Play, puis carton muet 37,75 → 40,00 s |

### 3.3 Storyboard détaillé

Conventions :

- **H3** = plan généré (prompt en 3.4) ;
- **UI** = vraie capture d'écran animée dans Remotion ;
- **RC** = élément graphique Remotion.

Chaque transition est **différente** : aucune animation n'est rejouée d'une scène à l'autre.

Les durées H3 suivent la grille 24 i/s `17k + 5` des nouveaux plans : 39 images = 1,625 s, 56 images = 2,333 s, 73 images = 3,042 s. Chaque plan est ensuite coupé à la durée indiquée.

#### Scène 1 : 0,00 → 7,00 s · « Midi, l'assiette répond »

| Plan | Temps | Image | Caméra (départ → arrivée, motivation) | Texte à l'écran | Son |
|---|---|---|---|---|---|
| 1A · H3 (73 images) | 0,00 → 3,00 | Vue plongeante à 45° sur une vraie assiette de midi (saumon, riz, haricots verts) sur une table en chêne. La main droite lève un téléphone **de dos** au-dessus de l'assiette. | `[Push in]` lent, de 60 cm à 40 cm de l'assiette, 35 mm. Le bord flou d'un verre d'eau passe au premier plan. **Motivation** : la curiosité, on se rapproche de ce qu'on veut savoir. | Pastille horaire `12:30` en haut à gauche (16:9) ou à y ≥ 220 px (9:16) | Ambiance cuisine légère, déclic d'obturateur à 2,85 s |
| 1B · UI | 3,00 → 7,00 | `MealScannerView` : la photo se fige, les aliments détectés apparaissent, puis la **carte fourchette** `caloriesMin – caloriesMax`. | Transition **iris d'obturateur** (6 images, sans flash blanc). Puis RC : la jauge de la fourchette se remplit de gauche à droite en 0,6 s, les bornes viennent de la capture. | `520 – 610 kcal` (valeurs **de la capture**) + `Une fourchette, pas un chiffre magique` | Petit « tick » quand la jauge s'arrête |

#### Scène 2 : 7,00 → 12,80 s · « 18:00, les courses »

| Plan | Temps | Image | Caméra | Texte à l'écran | Son |
|---|---|---|---|---|---|
| 2A · H3 (39 images) | 7,00 → 8,60 | Cuisine ou placard : la main gauche tient un pot de yaourt, code-barres vers la caméra ; la main droite approche le dos du téléphone. | `[Truck right]` le long de l'étagère, 35 mm. Un bord de boîte de céréales flou passe au premier plan. **Motivation** : le geste de rayon, en mouvement. | `18:00` | Bip de scanner bref |
| 2B · UI | 8,60 → 12,80 | `BarcodeScannerModal` → fiche produit Open Food Facts (kcal, macros, Nutri-Score, NOVA). | Transition **balayage laser** horizontal (RC, 0,4 s), qui révèle la fiche. Puis léger travelling vertical de la fiche (Remotion, 8 % de hauteur). | `Scan code-barres illimité` puis `Gratuit à vie · sans abonnement`. En petit : `Données Open Food Facts` | Aucun nouveau son, la musique porte |

> **Angle anti-MyFitnessPal** : implicite dans « il **reste** gratuit ». Aucun nom de concurrent : règles Play, publicité comparative (L122-1), et MFP possède désormais Cal AI. Une version qui nomme MFP n'est envisageable que pour les réseaux, après validation juridique, avec un fait daté et sourcé à l'écran.

#### Scène 3 : 12,80 → 18,80 s · « 19:00, la séance »

| Plan | Temps | Image | Caméra | Texte à l'écran | Son |
|---|---|---|---|---|---|
| 3A · H3 (39 images) | 12,80 → 14,40 | Salon, tapis de yoga. La même femme fait **un** squat au poids du corps, de profil, mains jointes devant la poitrine. | `[Static shot]` sur trépied, 50 mm, hauteur de hanche. **Motivation** : lire le geste sans distraction. | `19:00` | Respiration légère (H3 ou bruitage) |
| 3B · UI | 14,40 → 18,80 | `ExerciseCoach3D` : le même squat en vue **Profil**, puis un **vrai glisser du doigt enregistré** fait pivoter l'avatar en vue 3/4 puis de face. Les muscles sollicités se colorent au point bas. | **Raccord dans le mouvement** : coupe au point bas du squat, de 3A à 3B. Vérifier que le profil va dans le même sens, et retourner horizontalement le plan H3 si besoin (il ne contient aucun texte). | `Coach 3D · 360°` puis `44 exercices · muscles en couleur` | Souffle de rotation léger, synchronisé avec le glisser |

#### Scène 4 : 18,80 → 25,40 s · « 19:45, la question »

| Plan | Temps | Image | Caméra | Texte à l'écran | Son |
|---|---|---|---|---|---|
| 4A · H3 (56 images) | 18,80 → 21,10 | Cuisine le soir, serviette sur l'épaule après la séance. Elle lève le poignet gauche (**montre noire sans marque**), sourit, puis regarde le téléphone. | `[Push in, Shake]` à la main, 35 mm, recadrage légèrement en retard. La porte de frigo floue passe au premier plan. **Motivation** : moment intime et pris sur le vif. | `19:45` | Petit « ping » de montre |
| 4B · UI | 21,10 → 25,40 | 1) `WearablesSyncSheet` : les pas et la séance importés s'ajoutent (0,9 s). 2) `FwAiCoachView` : la question `Quoi manger après ma séance ?` part, la réponse arrive avec la puce **🌐 Recherche Web temps réel**, 2 puces de sources et le bandeau « Vous échangez avec FW AI… ». | Transition **glissement latéral** de la feuille montre vers le chat (RC, 10 images). Les bulles apparaissent au rythme réel de la capture, sans accélération truquée de la réponse. | `FW AI · Web en direct` puis `Sources citées`. Ligne `Montres : Samsung Health · Garmin · Fitbit · Apple Santé (export)`. En petit : `Réponse générée par IA` | Clic de clavier discret |

> **Apple Santé** : les noms sont écrits en texte simple, sans logo (usage descriptif d'une marque). L'app **importe un export** Apple Santé ou passe par un Raccourci iOS (`wearables-bridge.ts`). Elle n'utilise pas HealthKit : ne jamais écrire « intégré à Apple Santé ».

#### Scène 5 : 25,40 → 32,00 s · « Le lendemain, 7:00 »

La voix dit « Jeûne, bilan sanguin, et une courbe… » : les images suivent **dans cet ordre**.

| Plan | Temps | Image | Caméra | Texte à l'écran | Son |
|---|---|---|---|---|---|
| 5A · UI | 25,40 → 26,50 | `FastingView` : anneau OMAD ou 16:8 en cours, compte à rebours réel | Transition **pile verticale** : l'écran monte depuis le bas (RC, 8 images) | `Jeûne 16:8 → OMAD` | — |
| 5B · UI | 26,50 → 27,60 | Carte de marqueur du bilan (ex. ferritine) avec explication simple et « question à poser à ton médecin » | Même pile verticale : la carte se pose sur la précédente (progression, pas répétition : la pile s'épaissit) | `Bilan expliqué · sans diagnostic` | — |
| 5C · H3 (39 images) | 27,60 → 29,20 | Salle de bain au matin : pieds nus qui montent sur une balance en verre, **écran hors netteté** | `[Static shot]` à 30 cm du sol, 35 mm. **Motivation** : le moment de stress du matin, à hauteur de pieds, sans visage | `7:00` | Léger craquement de la balance |
| 5D · UI | 29,20 → 32,00 | Courbe de poids : un point brut monte, la **courbe EMA reste calme**, le message du Décodeur apparaît (« surtout de l'eau… », texte réel de l'app) | Transition **coupe franche** sur le geste (le pied se pose → le point apparaît). RC : la courbe se trace de gauche à droite en 1,2 s | `Ta vraie tendance` + valeurs réelles de la capture | Note musicale douce et résolue |

#### Scène 6 : 32,00 → 40,00 s · Fin

| Plan | Temps | Master B (réseaux 9:16) | Master A (Play 16:9) |
|---|---|---|---|
| 6A · RC | 32,00 → 34,50 | Logo FolloWeight (`FolloWeightLogo`, SVG) qui se construit. Trois pastilles apparaissent l'une après l'autre : `Scan code-barres gratuit à vie` · `5 questions IA + 3 scans photo / jour` · `Zéro pub` | Logo + les 3 mêmes fonctions **sans le mot « gratuit »** : `Scan code-barres illimité` · `Coach IA qui cite ses sources` · `Coach 3D` |
| 6B · RC | 34,50 → 40,00 | Bloc CTA : **`Essai 7 jours gratuit`**, puis `Google Play · followeight.com`. Mention légale en petit, lisible 2 s au moins : `FW+ : 29,99 €/an après l'essai, ou 4,99 €/mois. Sans engagement, annulable à tout moment.` | `FolloWeight` + `followeight.com` seulement, sans prix ni essai ni badge |
| Voix | 32,15 → 37,75 | R6 | R6-Play |
| Son | 37,75 → 40,00 | Signature sonore courte, puis 0,5 s de silence de fin | Idem |

> La mention légale du prix après l'essai protège la confiance et répond aux règles de clarté des offres d'essai gratuit. Ne pas la retirer du master B.

### 3.4 Prompts MiniMax H3 (anglais, structure en 7 parties, 110-160 mots)

Commun à tous les plans :

- mode **candide / documentaire** ;
- **24 i/s natif**, sans interpolation ;
- même cast enregistré dans H3 Continuity Studio (`memory: "selected"`), sur une plaque de référence validée du personnage ;
- un rendu natif **16:9 et un rendu natif 9:16** par plan, plutôt qu'un recadrage ;
- en 9:16, garder les mains et le visage entre y = 220 et y = 1 500 px (interface des Reels et Shorts).

**H3-1A · 73 images · scène 1 (accroche)**
<!-- check:h3_1A words=110-160 -->
```text
[Push in] Close three-quarter overhead shot at 45 degrees, handheld Sony FX3 with a 35mm prime at f/2.8, candid documentary look. First, the lens passes the blurred rim of a water glass in the foreground, then settles over a real lunch plate on a scratched oak table: grilled salmon, rice, green beans, olive oil glistening. A woman in her late thirties, ordinary build, grey cotton sweater, unretouched real skin on her hands with visible pores and natural knuckle creases. Her RIGHT hand lifts a plain dark phone above the plate, its back facing the lens; her LEFT hand rests beside the plate holding a fork. She leans in with a relaxed half-smile and a calm inhale. Soft 5600K window daylight keys from 45 degrees camera-left, a warm 3000K pendant glows at frame top, a black flag camera-right holds a gentle 4:1 ratio, constant light. Kitchen softly out of focus, steam rising from the rice, 180-degree shutter, fine grain.
```

**H3-2A · 39 images · scène 2**
<!-- check:h3_2A words=110-160 -->
```text
[Truck right] Medium close-up at counter height, handheld Sony FX3 with a 35mm prime at f/2.8, candid documentary look. The blurred edge of a cereal box on a pantry shelf crosses the foreground in the first second. The same woman in her late thirties in a grey cotton sweater, unretouched real skin on her hands with fine micro-texture and short natural nails. Her LEFT hand holds a white yogurt pot with a printed barcode turned toward the camera; her RIGHT hand brings the back of a plain dark phone close to the barcode, steady and deliberate. Her eyes follow the phone with a slight brow lift and a soft exhale through parted lips. Late-afternoon 5600K daylight from a kitchen window 45 degrees camera-left, a warm 2700K under-cabinet strip on the same side, a matte black flag camera-right for a 4:1 ratio, constant light. Shelves recede in soft focus, the pot keeps its weight in her hand, 180-degree shutter, fine grain.
```

**H3-3A · 39 images · scène 3**
<!-- check:h3_3A words=110-160 -->
```text
[Static shot] Full-body side profile at hip height, locked tripod, Sony FX3 with a 50mm prime at f/4, clean candid look. A bright living room, grey yoga mat on oak flooring. The same woman in her late thirties with an ordinary build, dark leggings and a grey t-shirt, unretouched real skin, light sheen on her forehead. She performs one slow bodyweight squat facing camera-right: hips travel back, knees track over toes, heels stay planted, then rises smoothly. Both hands stay clasped together in front of her chest, right hand over left, fingers interlaced. Eyes focused ahead, steady exhale on the way down, inhale on the way up. 5600K daylight from a tall window 45 degrees camera-left, a warm floor lamp glowing in the background on the same side, a black flag camera-right for a 4:1 ratio, constant light. Plants and a sofa softly out of focus, the mat compresses under her feet, 180-degree shutter, fine grain.
```

**H3-4A · 56 images · scène 4**
<!-- check:h3_4A words=110-160 -->
```text
[Push in, Shake] Medium shot at chest height, handheld Sony FX3 with a 35mm prime at f/2.8, candid documentary look with a half-beat late reframing. The blurred edge of an open fridge door crosses the foreground in the first second. The same woman in her late thirties, grey t-shirt, a small white towel over her right shoulder, light sweat on her temples, unretouched real skin with visible pores. Her LEFT wrist rises to chest height showing a plain unbranded matte-black smartwatch; her RIGHT hand holds the back of a plain dark phone near her hip. She glances at the watch, nods, then her eyes drift to the phone after a slow natural blink and a calm exhale. A warm 3000K pendant keys from 45 degrees camera-left, a cool 6000K dusk window glows behind her, a black flag camera-right holds a 4:1 ratio, constant light. Kitchen softly out of focus, the towel keeps its weight, 180-degree shutter, fine grain.
```

**H3-5C · 39 images · scène 5**
<!-- check:h3_5C words=110-160 -->
```text
[Static shot] Low-angle close shot thirty centimetres above the floor, locked tripod, Sony FX3 with a 35mm prime at f/2.8, candid morning look. A white bathroom with pale matte tiles. The bare feet of the same woman in her late thirties step onto a slim glass bathroom scale, left foot first, then right foot, her weight settling evenly; real skin texture with visible creases and slight natural redness at the heels, unretouched. The scale display glows softly and stays beyond the focal plane. The hem of grey cotton pyjama trousers sways and settles with gravity. 5600K early-morning daylight enters through a frosted window 45 degrees camera-left, a warm 2700K mirror lamp glows on the same side at frame top, a folded towel camera-right absorbs bounce for a 4:1 ratio, constant light. Tiles recede into soft focus, faint traces of steam from a recent shower drift upward, 180-degree shutter, fine sensor grain.
```

**Contrôle des plans H3** (sur les vraies images, pas sur le prompt) :

- téléphone jamais vu de face ;
- aucune marque visible ;
- mains : 5 doigts, sans échange de main entre deux images ;
- écran de la balance illisible ;
- même visage et même pull d'un plan à l'autre ;
- aucun zoom optique ajouté par H3.

Si H3 ajoute un zoom ou rend l'écran lisible, contraindre par des images clés ou relancer le plan. Ne jamais corriger en recadrant un plan qui contient un texte inventé.

### 3.5 Voix, son et sous-titres

**Voix (Xiaomi MiMo, conformément à la demande)**

- Modèle `mimo-v2.5-tts-voiceclone`, en **clone pur** : aucune description de style, aucune balise dans le texte parlé, **vitesse native ×1,00**. Ne jamais accélérer ni étirer un WAV pour le faire entrer dans une fenêtre. Si une réplique dépasse sa fenêtre, **on réécrit le texte**.
- 3 à 4 prises par réplique. Contrôle Whisper large-v3 local, puis on garde la prise la plus fidèle (WER ≤ 0,12, nombres français normalisés).
- **Alerte documentée** (`AGENTS.md`, 17/10/2026) : en français, les clones MiMo masculin et féminin ont produit des phrases fausses selon Whisper. Qwen3-TTS local a, lui, été validé par le propriétaire pour la voix française d'autres projets. → Si une réplique échoue après 4 prises MiMo, **s'arrêter et demander au propriétaire** s'il accepte de basculer sur Qwen3-TTS pour cette vidéo. Pas de bascule automatique.
- Le choix de la voix (référence de clone) revient au propriétaire. Une voix chaleureuse et posée correspond au ton de FW AI.

**Musique et bruitages**

- Musique : Stable Audio local, pop électronique légère, 100-108 BPM, sans voix. Elle se baisse de 12 dB sous la voix.
- Bruitages Earshot : un son **différent** par scène (obturateur, bip de scanner, souffle de rotation, ping de montre, craquement de balance, signature de fin). Aucun son n'est réutilisé.
- Mastering : −14 LUFS intégrés, crête vraie ≤ −1 dBTP. À mesurer sur le MP4 livré.

**Sous-titres incrustés** (la vidéo démarre sans le son sur Play et les réseaux)

- Texte exact des répliques, 2 lignes au plus, 42 caractères par ligne au plus.
- 16:9 : bas de l'image, à 90 px du bord.
- 9:16 : centrés entre y = 1 300 et y = 1 460 px.
- Aucun sous-titre ne doit masquer les textes de l'interface capturée.

**Contrôles avant livraison**

- planche contact de chaque transition ;
- absence de plan rejoué ;
- chiffres à l'écran = chiffres de la capture ;
- relecture du texte exact ;
- mesure audio ;
- `tools/director-qa-gate.mjs` ;
- **aucune publication sans accord explicite du propriétaire**.

---

## 4. Annexes : audit des promesses, comptages, sources

### 4.1 Audit des promesses (fiche + vidéo ↔ code au 15/11/2026)

| Promesse | Preuve dans le code | Statut |
|---|---|---|
| Fourchette de calories en photo, assiette ou frigo | `api/analyze-meal` (`caloriesMin`/`caloriesMax`, `smartClarifier.oilLevel`, `portionEatenPct`), `api/analyze-fridge` | ✅ |
| Scan code-barres, Nutri-Score, NOVA, Open Food Facts | `api/barcode/route.ts` (`world.openfoodfacts.org`, `nutriscore_grade`, `nova_group`) | ✅ (attribution ODbL ajoutée dans la fiche) |
| 5 questions / 3 scans par jour | `billing-bridge.ts` (`FREE_DAILY_FW_AI_LIMIT = 5`, `FREE_DAILY_VISION_SCAN_LIMIT = 3`) | ⚠️ décompte seulement local (P0-1) |
| FW AI : Web en temps réel + sources citées | `api/fw-ai` (`web_search_preview`), `extractOpenAiResponsesWebData`, puces sources dans `FwAiCoachView.tsx` | ✅ (coût : §1.4) |
| Mention IA + bouton Signaler | Bandeau « Vous échangez avec FW AI » + bouton `Signaler` dans `FwAiCoachView.tsx` | ✅ côté interface (aucun envoi serveur des signalements vu : à brancher pour la politique Play sur l'IA) |
| Garde-fous urgence et troubles alimentaires | `fw-ai-engine.ts` (`EMERGENCY_PATTERN`, `ED_DANGER_PATTERN`), exécuté avant tout appel externe | ✅ |
| Coach 3D : 360°, ralenti, muscles colorés | `ExerciseCoach3D.tsx` (orbite au doigt, « Glissez pour tourner à 360° », vitesse 0,5×, couleurs primaire et pic) | ✅ |
| 44 exercices + 10 disciplines | `exercises-compendium.ts`, stratégie §1.2 | ✅ |
| Courbe EMA + Décodeur de balance | `WeightTrendPoint.emaWeightKg`, `DashboardView.tsx` | ✅ |
| Jeûne 16:8 / 20:4 / OMAD + notifications de fenêtre | `fasting-engine.ts`, option de notification dans `OnboardingWizard.tsx` | ✅ (à tester sur l'APK) |
| Aucun déficit avant 18 ans ; jeûne déconseillé avant 18 ans ou avec un IMC bas | `metabolic-engine.ts` (`minorSafetyLock`), `FastingView.tsx` (`clinicalWarning`) | ✅ (formulation de la fiche alignée sur le code) |
| Verrou grossesse | Absent du profil et du contexte du chat | ❌ non promis dans la fiche (P1) |
| Import des montres (Samsung, Garmin, Fitbit, Zepp, export Apple Santé) | `WearablesSyncSheet.tsx` (zip/xml Apple, CSV Samsung, JSON Garmin/Fitbit) | ✅ import ; ❌ BLE dans la WebView ; ❌ Health Connect natif |
| Bilan sanguin expliqué, sans diagnostic | `blood-panel-engine.ts`, `BodyLabView.tsx` (saisie ou collage) | ✅ |
| FW+ : multi-bilans, PDF médecin, périodisation, rappel J-2 | Non trouvés | ❌ hors fiche tant qu'ils ne sont pas livrés |
| Essai de 7 jours via Google Play | Simulé localement (`startSevenDayFreeTrial`) | ❌ à brancher avant publication (P0-3) |

### 4.2 Comptages vérifiés

Comptage par script Node (`[...texte].length`, caractères Unicode, espaces et ponctuation compris), lancé sur **ce fichier** après rédaction. Les blocs marqués `check:` ont été extraits et mesurés automatiquement.

| Élément | Limite | Mesuré |
|---|---|---|
| Titre FR | 30 | **30** |
| Titre FR (variante) | 30 | 29 |
| Titre EN | 30 | **28** |
| Titre EN (variante) | 30 | 30 |
| Description courte FR | 80 | **78** |
| Description courte EN | 80 | **79** |
| Description complète FR | 3 500 | **3 199** |
| Description complète EN | 3 500 | **2 863** |
| Captures : titres FR / EN | ≤ 26 conseillé | max **26** |
| Captures : sous-titres FR / EN | ≤ 52 conseillé | max **50** |
| Prompts H3 (mots) | 110-160 | **151 à 160 (5 prompts)** |
| Répliques 1 à 6 | 10-12 c/s | 9,8 à 11,9 c/s (tableau 3.1) |

### 4.3 Sources (consultées le 15/11/2026)

**Marché**

- Rachat de Cal AI par MyFitnessPal (annonce du 2 mars 2026) : [Fitt Insider](https://insider.fitt.co/myfitnesspal-acquires-rival-food-tracker-cal-ai/) · [Athletech News](https://athletechnews.com/myfitnesspal-cal-ai-acquisition) · [Benesch (conseil de MFP)](https://www.beneschlaw.com/news/benesch-advises-myfitnesspal-on-acquisition-of-cal-ai-the-viral-calorie-app/) · [Pulse 2.0](https://pulse2.com/myfitnesspal-acquires-cal-ai-to-expand-ai-powered-nutrition-tracking-portfolio) · [eWeek](https://www.eweek.com/fr/news/myfitnesspal-acquires-cal-ai-teen-founders/)
- MacroFactor, bundle 89,99 $/an et prix Workouts : [macrofactor.com/workouts/price](https://macrofactor.com/workouts/price/) · [Aide MacroFactor : abonnements et bundles](https://help.macrofactorapp.com/en/articles/393-how-macrofactor-subscriptions-and-bundles-work) · [gainframe.app](https://gainframe.app/blog/macrofactor-workouts-review/)
- MyFitnessPal, Foodvisor, YAZIO et autres : sources listées dans `docs/claude-freemium-strategy.md` (section Sources)

**Google Play**

- Politique de métadonnées (titre, icône, nom du développeur) : [Google Play Console Help 9898842](https://support.google.com/googleplay/android-developer/answer/9898842?hl=en) · [Android Developers Blog, avril 2021](https://android-developers.googleblog.com/2021/04/updated-guidance-to-improve-your-app.html) · [Engadget](https://www.engadget.com/google-play-store-rules-misleading-app-listings-124539640.html) · [XDA](https://www.xda-developers.com/google-play-is-cracking-down-on-misleading-app-names-and-icons/)
- Éléments de présentation (captures, vidéo, image de présentation) : [Play Console Help 9866151](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en-GB) · [Play Console Help 1078870](https://support.google.com/googleplay/android-developer/answer/1078870)
- Vidéo de la fiche (YouTube, monétisation désactivée, Shorts non pris en charge) : [Gummicube](https://www.gummicube.com/blog/google-play-store-preview-video-guidelines/) · [AppLaunchFlow 2026](https://www.applaunchflow.com/blog/google-play-promo-video-requirements-2026) · [AppFollow 2026](https://appfollow.io/blog/aso-video-strategies) · [Play Console Help 15501235](https://support.google.com/googleplay/android-developer/answer/15501235)
- Références à d'autres apps et mots-clés : [Android Developers Blog, octobre 2020](https://android-developers.googleblog.com/2020/10/developer-tips-and-guides-common-policy.html) · [Gummicube](https://gummicube.com/blog/google-play-metadata-rules-updated-for-improved-user-experience)

**Coût IA**

- [Tarifs OpenAI API (outil de recherche Web)](https://developers.openai.com/api/docs/pricing) · [Forum OpenAI : facturation de la recherche Web](https://community.openai.com/t/heads-up-web-search-tool-billing-can-be-higher-than-you-expect-here-s-why/1236954). Chiffres à reconfirmer sur la page officielle avant décision.

**Limites des sources** : plusieurs règles Google Play viennent de pages d'aide et de billets de 2021, ainsi que de guides tiers de 2026. Aucune durée minimale ou maximale officielle n'a été trouvée pour la vidéo de fiche (30 s est une recommandation de guides tiers). La version en ligne de la politique Google Play prime : relire la page avant l'envoi.
