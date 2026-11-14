# Brainstorm 3 Agents (Antigravity + Claude Opus 5.5 + Codex) & Benchmark Médical — VitalPulse

*Date : 14 novembre 2026 — Jobs agent-mesh : Claude Opus 5.5 (`b8d389fe-7d56-4f6b-b8d9-09e24ae37209`), Codex (`18b742e0-dc5d-4d0b-882c-a93df8f1f075`), Synthèse & Architecture : Antigravity.*

---

## 1. Benchmark Concurrentiel & Failles Résolues

| Concurrent | Forces actuelles | Failles réelles mesurées (avis utilisateurs & tests) | Comment **VitalPulse** fait mieux |
|---|---|---|---|
| **Cal AI** | Capture photo rapide, faible friction d'entrée | 1) Annonce un chiffre calorique unique illusoire sans marge ; 2) Aveugle aux huiles, beurres, sauces cachées et profondeur d'assiette ; 3) Erreurs aberrantes sur plats mixtes ; 4) Murs de paiement agressifs | **Fourchette honnête (`kcal ± marge`) + zone de texte libre sous la photo + Clarificateur 1-clic huile/portion** qui recalcule instantanément avec ancrage **ANSES Ciqual**. |
| **MacroFactor** | Meilleur algorithme d'adaptation de dépense énergétique (TDEE observé vs poids lissé) | 1) Pas d'analyse photo native point-and-shoot ni de scanner frigo ; 2) N'intègre pas le suivi natif des pas ni les exercices ; 3) Courbe d'apprentissage élevée, pas de gratuité | **Même rigueur mathématique** (EMA irrégulière des pesées + balance énergétique nette sans double comptage) **+ Vision photo plat & frigo + podomètre + exercices quotidiens guidés**. |
| **SnapCalorie** | Pose parfois des questions pour corriger la profondeur 2D | Friction trop lourde avant de voir le résultat, écosystème et analytique limités | **Résultat immédiat dès la photo + texte libre**, puis **1 seul clarificateur rapide** (huile/sauce/reste) + historique photo comparatif complet. |
| **Yazio** | Grande base alimentaire européenne, UI claire | Scanner IA greffé peu fiable, pop-ups gamifiés intrusifs, paywalls sur les macros/recettes | **Zéro pop-up agressif**, **frigo → recettes étape par étape avec minuteurs**, **micro-nutriments & score NOVA 1–4** transparents et accessibles. |
| **Noom** | Psychologie comportementale | Coaching générique parfois culpabilisant, saisie manuelle fastidieuse | **Interventions adaptatives bienveillantes (JITAI)** : série souple `4j/7`, bouton **« Journée difficile / 2 min »**, micro-séances **VILPA**, et **Décodeur de Balance** anti-abandon. |
| **SuperCook** | Idées recettes à partir d'ingrédients listés | Aucun lien avec l'objectif calorique/protéique restant du jour ni avec les macros/fibres | **Algorithme « Ferme ta journée »** : propose des recettes du frigo adaptées exactement aux kcal, protéines et fibres qui vous manquent aujourd'hui + ajout au journal en 1 clic. |

---

## 2. Synthèse des 12 Décisions Clés Issues du Brainstorm Croisé

### Apports Claude Opus 5.5 (`b8d389fe`)
1. **Fourchette calorique honnête & Clarificateur d'huile/portion** : ne jamais faire croire qu'une photo connaît les grammes d'huile d'olive invisibles ; fusionner assiette déclarée + texte utilisateur + bouton 1-clic huile/portion.
2. **« Ferme ta journée » (Frigo × Manques du Jour)** : classer les recettes du frigo selon les calories/protéines/fibres restantes du jour et les produits frais à écouler, avec **Mode Cuisine Mains Libres (`Wake Lock` + minuteurs)**.
3. **« Décodeur de Balance » (Arme anti-abandon n°1)** : détecter une hausse ponctuelle `>= +0.35 kg` expliquée par un excès de sel (`> 2300 mg`) ou de glucides (`1 g` de glycogène retient `~3 g` d'eau) la veille pour rassurer scientifiquement au lieu de décourager.
4. **Bilan Corporel Multi-Indices + Mode GLP-1 / Recomposition** : croiser `IMC OMS`, `WtHR` (ratio tour de taille/taille, seuil `0,5` NICE), `BRI` (*Body Roundness Index*, JAMA 2024) et `RFM %` (Woolcott 2018), avec détection du profil musclé (`IMC >= 25` mais `WtHR < 0.50`).
5. **Psychologie Anti-Décrochage JITAI** : série souple `4 jours sur 7`, règle « Ne jamais rater deux fois », mode **Journée Difficile (2 min)** et mini-pics **VILPA** (`3 × 1 min`, Stamatakis *Nature Medicine* 2022).
6. **Gouvernance Médicale Transparente** : socle versionné (ANSES, OMS, HAS, EFSA) séparé de la veille PubMed, avec bouton *« Pourquoi ? »* et plancher calorique protecteur.

### Apports Codex (`18b742e0`)
1. **Un cœur métier TypeScript pur partagé, deux adaptateurs (Next.js PWA + Android Capacitor)** : secrets OpenAI et VAPID strictement côté serveur ; photos et journaux persistés localement en **IndexedDB** (jamais limités aux 5 Mo de `localStorage`).
2. **Zéro double comptage énergétique** :
   - Soustraction du métabolisme de repos dans les séances : `E_j = t_j * max(0, (3.5 * m * MET_j) / 200 - RMR / 1440)` (soit `MET - 1` net au-dessus du repos).
   - Déduplication des pas effectués pendant une séance enregistrée (`effectiveNeatSteps = max(0, rawSteps - overlapSteps)`).
   - Thermogenèse alimentaire calculée par macronutriment (`TEF = 25% Protéines + 7.5% Glucides + 1.5% Lipides`).
3. **Séparation stricte Poids Brut vs Tendance EMA Irrégulière** : `alpha_t = 1 - 2^(-deltaDays / 7)` qui gère proprement les jours sans pesée sans jamais inventer de donnée.
4. **Priorité stricte : « La Vision propose, le texte utilisateur prime, Ciqual calcule déterministement »** : les précisions écrites par l'utilisateur sous la photo écrasent les suppositions visuelles, avec traçabilité des unités.
5. **Entités persistantes et révisables (`AnalysisRevision`)** : chaque photo + texte reste consultable dans l'historique, ré-analysable à tout moment sans perdre la révision précédente, et comparable côte à côte.
6. **Notifications & Challenges Bienveillants** : Web Push VAPID + heures silencieuses configurables, progression douce sans jamais imposer de défi punitif après un repas.

---

## 3. Socle Médical & Scientifique de Référence

| Domaine | Source / Référentiel Officiel | Application directe dans VitalPulse |
|---|---|---|
| Composition alimentaire française | **ANSES — Table Ciqual** | Base embarquée locale (>= 120 aliments/plats) pour macros, fibres, sodium, fer, magnésium, calcium, potassium, vitamines C/D, évitant les pannes API. |
| Ultra-transformation | **Inserm / Santé Publique France — Classification NOVA (1 à 4)** | Score NOVA automatique sur chaque plat et moyenne hebdomadaire pour limiter les aliments ultra-transformés (NOVA 4). |
| Anthropométrie & Risque viscéral | **OMS**, **HAS**, **NICE CG189 (2022)**, **JAMA Network Open (2024 — BRI)**, **Woolcott & Bergman (2018 — RFM)** | Bilan croisé `IMC + WtHR (< 0,50) + BRI + RFM %` au lieu d'un IMC brut isolé souvent trompeur. |
| Besoins énergétiques & protéines | **Mifflin-St Jeor (1990)**, **EFSA**, **ANSES / ESPEN** | `BMR`, hydratation `35 mL/kg + 500 mL/30 min`, plancher de sécurité calorique, protéines `1.6 à 1.8 g/kg` en perte de gras. |
| Dépense physique & micro-activité | **Compendium of Physical Activities (2024 Adult Update)**, **Stamatakis et al. (*Nature Medicine*, 2022 — VILPA)**, **Buffey et al. (*Sports Medicine*, 2022)** | 24 exercices quotidiens calibrés par `MET` exact, mini-séances `VILPA 3×1 min`, marche digestive post-prandiale `10 min`. |
| Veille scientifique continue | **NCBI PubMed E-utilities (`esearch` + `esummary`)** | Flux live filtré sur méta-analyses, revues systématiques et essais cliniques récents classés par objectif santé. |


---

## Brainstorm v2.0 (14 novembre 2026) — Mensurations, Bilan Sanguin & Photos Avant/Après

### Contributions croisées des 3 Agents
| Axe | Claude Opus 5.5 (`15644822`) | Codex (`a9526cc7`) | Implémentation Antigravity (`VitalPulse v2.0`) |
| --- | --- | --- | --- |
| **Mensurations & Silhouette** | Formule US Navy + plage RFM, graphe Base 100 pour comparer poids/taille/% graisse sur la même échelle, détecteur de recomposition corporelle | Equations exactes Hodgdon–Beckett en centimètres, garde-fous géométriques (`waist > neck`), matrices chronologiques delta J-1 / départ | `src/lib/body-composition.ts` + onglet `Corps & Bilans -> Mensurations & Graph` (8 sites anatomiques + silhouette SVG/tableau delta + Base 100) |
| **Bilan Sanguin FR/SI** | Interprétation à 3 niveaux (norme labo / cible clinique / optimal), alerte rénale protéique (`DFG < 60` KDIGO), verrouillage grossesse, pont nutrition & sport | Facteurs exacts FR ↔ SI (`glycémie *5.551`, `chol *2.586`, `TG *1.129`, `créatinine *8.84`, `HbA1c NGSP/IFCC`), parseur virgule FR, seuils d'urgence biologique | `src/lib/blood-panel-engine.ts` + `/api/analyze-blood` (OCR OpenAI optionnel + parseur FR déterministe + HOMA-IR, CKD-EPI 2021, FIB-4, non-HDL, TG/HDL) |
| **Photos Avant / Après** | Coffre local sans cloud, Ghost Overlay de cadrage, curseur Split Avant/Après, mode discret anti-regard indiscret | IndexedDB v2 store dédié `body_photos` (migration pure idempotente `migrateVitalPulseState`), suppression EXIF via Canvas + flou visage local | `src/lib/storage-db.ts` (v2) + `processBodyProgressPhoto` (`native-bridge.ts`) + comparateur Split/Timelapse/Ghost/Flou |

### Références cliniques intégrées au module Corps & Bilans
- **Hodgdon & Beckett (1984)** / **Woolcott & Bergman (2018 RFM)** : estimation circonférentielle du % de masse grasse sans impédancemètre médical.
- **OMS / NICE / HAS** : Tour de taille / Taille (`WtHR < 0,50`) et Rapport Taille/Hanches (`WHR < 0,90` H / `< 0,85` F).
- **ADA Standards of Care 2025 & HAS** : Glycémie à jeun, HbA1c, HOMA-IR (`(Glycémie mmol/L × Insuline) / 22,5`).
- **ESC/EAS Dyslipidaemias & EFLM** : LDL, non-HDL, ratio TG/HDL et règle stricte à jeun pour triglycérides / insulinémie.
- **KDIGO 2024 (CKD-EPI 2021 sans facteur ethnique)** : DFG estimé et garde-fou automatique d'apport protéique si `DFG < 60 mL/min/1,73m²`.
- **EASL / EASD / EASO MASLD 2024** : score hépatique `FIB-4` (âge ≥ 35, ASAT, ALAT, plaquettes).

---

## Brainstorm v3.0 — Refonte Lean, Top-10 Concurrence, Jeûne/OMAD & Montres Connectées (14 novembre 2026)

Suite au retour testeur (*« trop d'informations d'un coup, besoin d'une interface plus lean avec icônes animées cliquables, questions d'onboarding, jeûne/OMAD, widgets et connexion montres Samsung/Apple »*), un second audit croisé **Claude + Codex** et une analyse du Top-10 du marché (**YAZIO, MyFitnessPal, Lifesum, Foodvisor, Le Secret du Poids, Lose It!, FatSecret, Cronometer, Bodly, Noom**) ont guidé **VitalPulse v3.0** :

1. **Divulgation progressive (« Lean First ») & Motion Design 60 fps (`framer-motion`)** :
   - Hero épuré : orbe métabolique animée `HeroEnergyOrb` + 3 jauges macros + tuiles Bento personnalisables (`10 max`, `9` dans le cockpit principal) ouvrant des tiroirs accessibles `DetailSheet`.
   - Icônes SVG animées sur-mesure `64×64` (`FlamePulseIcon`, `StepWalkerIcon`, `WaterWaveIcon`, `FastArcIcon`, `MacroRingIcon`, `HeartbeatWatchIcon`, `MealPlateIcon`, `ScaleTrendIcon`) respectant `prefers-reduced-motion` (`<MotionConfig reducedMotion="user">`).
   - Double thème **Obsidian** (sombre par défaut) & **Porcelaine** (clair chaleureux) avec typographies `Bricolage Grotesque`, `Plus Jakarta Sans` et `JetBrains Mono` en chiffres tabulaires.

2. **Onboarding en 5 étapes + Jeûne Intermittent & OMAD (inspiration YAZIO)** :
   - Assistant de premier lancement (`OnboardingWizard`) pré-remplissant profil, IMC en direct, objectif de pas, protocole alimentaire/jeûne, écosystème montre et sélection des widgets visibles (avec option `Passer → Explorer la démo`).
   - Moteur `fasting-engine.ts` couvrant `12:12`, `14:10`, `16:8`, `18:6`, `20:4`, **OMAD (`23:1`)**, `5:2` et personnalisé, avec arc fer à cheval `270°`, mode programmé (*« Préparez-vous à jeûner ! »*), édition de l'heure de début, 6 phases physiologiques de `0h` à `20h+`, et contre-indications cliniques bloquantes (grossesse/allaitement, mineur, antécédents TCA, diabète insulinodépendant, insuffisance pondérale `IMC < 18,5`).

3. **Couverture fonctionnelle Top-10 & Montres Connectées** :
   - **Foodvisor + MyFitnessPal + Lifesum** : scan photo assiette/frigo IA + scanner code-barres `/api/barcode` (OpenFoodFacts + cache local français) + Nutri-Score & NOVA.
   - **Cronometer** : tiroir micronutriments (sodium avec alerte plafond OMS `2 300 mg`, fibres, fer, potassium, vitamine D, calcium, oméga-3).
   - **Le Secret du Poids + Noom** : banque calorique hebdomadaire sur 7 jours (`computeWeeklyCalorieBank`) + mini-leçon comportementale du jour sans culpabilisation.
   - **Bodly** : mensurations 8 sites, bilans sanguins et comparateur photo avant/après à la demande.
   - **Montres & Widget Android** : Web Bluetooth fréquence cardiaque (`0x180D` temps réel sur Android Chrome/Edge), import réel de fichiers exportés **Apple Santé (XML)**, **Samsung Health (CSV)** et **Garmin (JSON)**, bouton de simulation de test explicitement étiqueté, dock mobile flottant à 5 emplacements avec `+` central, et **widget natif écran d'accueil Android** (`VitalPulseWidgetProvider`).

