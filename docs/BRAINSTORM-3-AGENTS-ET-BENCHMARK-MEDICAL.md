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
