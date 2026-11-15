# FolloWeight — Audit Google Play, abonnement hybride et coûts IA

Date : **15 novembre 2026**. Projet : `D:/node animaze/node_app/vitalpulse`. Application : `com.followeight.app`. Web : `https://followeight.com`.

**Décision : lancement commercial à bloquer jusqu'aux corrections P0 ci-dessous.** Cet audit constate le code et les réponses HTTP ; il ne prétend pas avoir reçu un avis de rejet de Google, inspecté la configuration privée Play/RevenueCat/Stripe, ni testé un achat réel. Toutes les modifications décrites sont des travaux à réaliser. Seul ce rapport est écrit par cette mission.

Les neuf fichiers demandés ont été lus intégralement. Des lectures complémentaires ciblées ont vérifié les sources Java, les variables Gradle, le lockfile, les appelants du paywall, le coach, les routes et les tests. Instructions applicables consultées : `../AGENTS.md`, `../CLAUDE.md`, `../AGENT-MESH.md`, `../memory/KERNEL.md`, index mémoire et instructions utilisateur. Guides utilisés : OpenAI Docs et Stripe Best Practices. Aucun pod RunPod utilisé, aucun achat, aucun appel de génération IA payant, aucune publication.

## 1. Les cinq blocages à traiter

| Priorité | Blocage confirmé | Correction et preuve de sortie |
|---|---|---|
| P0 — binaire | `targetSdkVersion = 35` ; permissions santé/Bluetooth sans intégration native trouvée | Cibler API 36, retirer les permissions inutilisées, contrôler le manifeste fusionné de l'AAB final et les fonctions annoncées. |
| P0 — paiement | RevenueCat/Stripe absents ; les boutons accordent des droits locaux ; promotion du Pass Web visible sans distinction de plateforme | Réel achat Play dans Android, Stripe exclusivement dans le parcours Web, droits validés serveur, restauration et expiration testées. |
| P0 — données | `/privacy`, `/terms`, `/delete-account` renvoient **404** ; données santé envoyées au cloud malgré des formulations « locales » | Pages accessibles, divulgation/consentement avant transmission, Data safety fidèle, suppression opérationnelle dès l'introduction des comptes. |
| P0 — santé et IA | « Signaler » ne transmet rien ; avertissement médical incomplet ; promesse Web permanente même lors du repli | Signalement reçu et traité, déclaration Health apps exacte, avertissement complet dans l'app et la fiche, transparence sur le mode de réponse. |
| P0 — sécurité économique | `/api/fw-ai` sans authentification ni quota serveur ; Web proposé à chaque appel ; aucun budget de tokens | Routeur d'intention, autorité serveur, compteurs atomiques, plafonds financiers mensuels. **2/15 recherches par jour ne garantissent pas la marge demandée.** |

### 1.1 Binaire, SDK et permissions : ce qui est réellement prouvé

`android/app/build.gradle:7` et `capacitor.config.ts:6` portent correctement `com.followeight.app`. Le namespace Java `com.maisonmercier.vitalpulse` est distinct mais cohérent avec `MainActivity.java` : **ce n'est pas en soi une cause de rejet**.

`android/variables.gradle:2–4` donne min SDK 23, compile SDK 35, target SDK 35. Depuis le 31 août 2026, Google exige API 36 pour les nouvelles apps et mises à jour mobiles ; l'extension générale allait au 1er novembre 2026. Le target 35 est donc un blocage technique au 15 novembre. Passer compile/target à 36 avec une chaîne de compilation compatible, puis tester les changements Android 16. [Exigence officielle Target API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en).

Inventaire du manifeste, lignes 52–65 :

| Permission / déclaration | Preuve dans le dépôt | Décision proposée pour la première sortie |
|---|---|---|
| `INTERNET` | WebView distante et API | Garder. |
| `CAMERA` | Fonction de scan/photo ; la présence d'un plugin Camera n'est pas nécessaire pour tout parcours Web | Conserver seulement pour le parcours réellement testé, avec permission contextuelle et refus géré ; vérifier sélecteur système et caméra dans le WebView. |
| `POST_NOTIFICATIONS` | Code Web Notification/Service Worker dans `native-bridge.ts`, aucun plugin natif notifications dans les dépendances | Vérifier le parcours natif ; retirer si inutilisée. Ne pas promettre un rappel natif J−2 sur cette seule base. |
| `ACTIVITY_RECOGNITION` | Pas de capteur de pas natif ni de plugin correspondant trouvé | Retirer pour cette sortie ; conserver saisie/import des pas. |
| `android.permission.health.READ_STEPS` et query `com.google.android.apps.healthdata` | Aucun client Health Connect, flux de permission/rationale ou plugin déclaré | Retirer ensemble si Health Connect est reporté. Sinon implémenter et tester le flux complet, puis justifier précisément les accès dans Play Console. |
| `BLUETOOTH`, `BLUETOOTH_ADMIN` (max SDK 30), `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` | `wearables-bridge.ts:70–135` utilise **Web Bluetooth** ; aucun plugin BLE natif trouvé | Retirer du binaire sans BLE natif ; présenter les imports fonctionnels et masquer la connexion directe si la capacité manque. Le `neverForLocation` existant ne rend pas une permission inutilisée légitime. |

La preuve n'est pas seulement l'absence de Java : `MainActivity.java:5` étend simplement `BridgeActivity`, les sources applicatives contiennent ce fichier et le widget, `package.json` n'a aucun SDK santé/BLE, et `capacitor.build.gradle:11–14` ne référence que App et Haptics. Un SDK tiers pourrait implémenter du natif sans Java applicatif ; d'où le contrôle obligatoire des dépendances et du **manifeste fusionné**, pas seulement du manifeste source. La règle Google vise les fonctionnalités réellement fournies et impose de retirer les permissions inutilisées. [Permissions sensibles](https://support.google.com/googleplay/android-developer/answer/16558241?hl=en), [règles santé](https://support.google.com/googleplay/android-developer/answer/16679511?hl=en).

Autres critères binaires :

- `AndroidManifest.xml:17` utilise `singleTask`. RevenueCat demande `standard` ou `singleTop` pour éviter l'annulation lors d'une validation bancaire hors app. Préférer `singleTop`, puis retester retour bancaire et bouton Retour. [Installation Capacitor RevenueCat](https://www.revenuecat.com/docs/getting-started/installation/capacitor).
- La documentation existante prescrit Billing **v7**, mais sa dernière échéance d'extension était le 1er novembre 2026. Exiger Billing **8 minimum** dans le graphe réellement résolu ; aucun SDK Billing n'est installé actuellement. [Calendrier Billing](https://developer.android.com/google/play/billing/deprecation-faq).
- `versionCode = 1`, `versionName = 1.0`, aucune `signingConfig` release dans ce fichier : vérifier signature d'upload/Play App Signing et unicité du versionCode. Cela ne prouve pas l'absence d'une signature externe ou CI.
- Vérifier les éventuelles bibliothèques `.so` du bundle et leur compatibilité 16 Ko ; rien dans cet audit source ne prouve un échec sur ce point. Ne pas transformer un contrôle restant en rejet constaté.

### 1.2 Paiements : défaut actuel et périmètre des règles

`SubscriptionModal.tsx:92` affiche **tous** les plans. La carte Fondateur vante `followeight.com`, Stripe et l'absence de commission (`billing-bridge.ts:64–74`, modal lignes 177–190). **Aucun lien Stripe cliquable n'a été trouvé dans ce composant** ; le problème démontré est le discours incitatif et la simulation du droit, pas une redirection constatée.

Pour l'architecture hybride demandée, qui vendra aussi dans Android, retirer de toute surface native la carte Fondateur, son prix, les comparaisons de commission et les instructions d'achat externe. La règle générale couvre aussi le texte et les WebViews. Les exceptions régionales/programmes et le cas distinct d'une app exclusivement de consommation existent ; leur inscription/configuration n'a pas été vérifiée ici. Ne pas présenter une interdiction universelle de tout lien Web. Les liens administratifs doivent eux-mêmes éviter de mener à un parcours de paiement alternatif non autorisé. [Payments](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en), [FAQ Payments](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en).

La consommation sur Android d'un droit acheté indépendamment sur le Web reste l'objectif : connexion au même compte, statut FW+ et restauration neutre. Un jeton signé n'autorise jamais à contourner Play Billing pour un achat initié dans l'app.

### 1.3 Confidentialité, CGU et suppression

GET publics réalisés le 15 novembre 2026 vers les trois URLs : **404 pour chacune**, sans changement d'URL finale. Aucun dossier de page correspondant dans `src/app`, ni rewrite dans `next.config.ts`.

- **`/privacy` : blocage certain de préparation.** Publier une page HTML publique sans connexion, liée dans l'app et Play Console : FolloWeight/éditeur/contact, données, finalités, fournisseurs, durée de conservation et suppression. La politique est obligatoire même pour une app sans collecte. [User Data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).
- **`/terms` : contrat commercial à fournir.** Prix/période/renouvellement, limites IA réelles, essai et éligibilité, annulation, portée pédagogique, durée de cinq ans du Pass. Google n'impose pas ce nom d'URL exact : son absence n'est pas à elle seule un code de rejet universel.
- **`/delete-account` : exigence conditionnelle.** Aucun système de comptes authentifiés n'a été trouvé dans les routes examinées. Dès que l'architecture hybride permet la création de comptes dans l'app, prévoir demande de suppression **dans l'app et sur le Web**, ainsi que suppression des données associées. Expliquer les rétentions légales nécessaires et la gestion de l'abonnement ; ne pas confondre suppression de compte et résiliation. Un simple texte sans traitement ne suffit pas. [Suppression de compte](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

Le coach transmet prénom, date de naissance/âge, sexe, poids, objectifs, activité et indicateurs de bilan (`FwAiCoachView.tsx:77–144,195–206`) ; le serveur sérialise le contexte complet vers OpenAI (`route.ts:101–109`). « Photos locales » peut être vrai pour les photos corporelles, mais ne décrit pas tous les flux Vision/coach. Réduire les données au nécessaire (pas de nom/date de naissance pour une simple réponse), demander le consentement adapté avant l'envoi santé, et documenter séparément stockage local, transit cloud, facturation et logs. Ne pas déclarer « aucune collecte » uniquement parce qu'IndexedDB est utilisé.

Proposer `store: false` pour Responses, après vérification des paramètres et exigences de conservation ; cela **ne garantit pas** l'absence de journaux de surveillance fournisseur. La phrase « API éphémères » du document précédent n'est pas prouvée. [Contrôles des données OpenAI](https://developers.openai.com/api/docs/guides/your-data).

### 1.4 Santé et contenu généré par IA

Un avertissement existe déjà (`FwAiCoachView.tsx:292–298`), ainsi que des gardes urgences/TCA/mineurs/grossesse (`fw-ai-engine.ts:79–137`) et une instruction anti-diagnostic (`route.ts:90,97`). Les conserver. Ils ne prouvent ni une conformité clinique complète ni le statut réglementaire du produit.

Corrections nécessaires :

1. Le bouton **« Signaler »** (`FwAiCoachView.tsx:382–392`) ne fait qu'ajouter l'ID à `useState`; rien n'est envoyé ni conservé pour le développeur. Prévoir `POST /api/ai-reports`, motif, extrait minimal autorisé, ID de réponse, confirmation seulement après réception, stockage durable et suivi de modération. Google exige un signalement intégré qui atteigne les développeurs. [AI-Generated Content](https://support.google.com/googleplay/android-developer/answer/13985936).
2. Remplir **Health apps declaration** : au minimum activité/fitness et nutrition/gestion du poids ; qualifier honnêtement l'analyse de bilans selon ses fonctions. Mettre à jour Data safety, audience et accès du reviewer. La présence du coach justifie l'application de la politique IA et des déclarations effectivement demandées par Console ; aucun formulaire autonome universel nommé « AI Generated Content » n'est établi par cet audit. [Déclaration santé](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en).
3. Ajouter dans la fiche et l'app un avertissement complet, adapté si la qualification non médicale est confirmée : **FolloWeight est un outil d'information et de bien-être. Ce n'est pas un dispositif médical. Il ne sert pas à diagnostiquer, traiter, guérir ou prévenir une maladie. Consultez un professionnel de santé pour toute décision médicale.** Un avertissement ne neutralise pas des fonctionnalités qui seraient réellement médicales. [Exigence Google Health](https://support.google.com/googleplay/android-developer/answer/16679511?hl=en).
4. Corriger les affirmations absolues du repli (« jamais de graisse fabriquée en une nuit », `fw-ai-engine.ts:161`) et faire relire les réponses de santé. Le champ grossesse existe dans le type serveur mais n'est pas transmis dans le contexte du coach : vérifier sa source et sa propagation, sans présumer la couverture.
5. Afficher « recherche effectuée » uniquement après un appel outil réussi. L'instruction actuelle de toujours confirmer le Web (`route.ts:89–94`) est fausse en repli Chat Completions/déterministe. Conserver les citations reliées aux affirmations : le nettoyage actuel retire les liens en ligne et limite à quatre sources. [Exigences de citations Web OpenAI](https://developers.openai.com/api/docs/guides/tools-web-search).

Lecture complémentaire après relecture indépendante : `src/app/api/analyze-meal/route.ts:115` assigne au modèle le rôle « médecin nutritionniste ». Ce rôle contredit le positionnement du coach et doit être corrigé dans le futur chantier ; couvrir aussi les réponses génératives repas/frigo par le mécanisme de signalement. Aucun changement n'a été apporté à cette route pendant l'audit.

## 2. Architecture hybride proposée sans perte des données existantes

```text
Android natif -> RevenueCat SDK -> Google Play Billing
                         | événements serveur / lecture de contrôle
Web connecté -> Stripe Checkout -> webhooks vérifiés
                         |
                  registre des droits FW+
                         |
          API session + entitlement + jeton FWPLUS
                         |
             Web et Android : même utilisateur
                         |
             API IA : droit + quotas + budget
```

**Autorité unique de décision : le serveur FolloWeight.** RevenueCat valide la source Play ; Stripe valide la source Web. Le registre agrège les droits par utilisateur. `SubscriptionState` demeure une projection d'affichage compatible avec les cinq tiers existants ; les données santé dans IndexedDB ne sont pas migrées vers le cloud par cette opération.

### 2.1 Contrat RevenueCat exact et version adaptée à Capacitor 7

Constats au registre npm :

| Élément | Valeur vérifiée |
|---|---|
| Déclaration du projet | `@capacitor/core` et `@capacitor/android` : `^7.2.0` |
| Résolution du lockfile | core et android **7.6.10** |
| Version RevenueCat proposée | **`@revenuecat/purchases-capacitor: "11.3.3"`**, exacte |
| Peer de cette version | `@capacitor/core: >=7.0.0` |
| `latest` observé | **14.1.0**, peer **>=8.0.0** : ne pas installer implicitement `latest` |
| Chaîne native de 11.3.3 | hybrid-common **17.55.2** → Purchases Android **9.29.0** → variante standard Billing **8.0.0** |

Sources primaires : [package 11.3.3](https://registry.npmjs.org/@revenuecat%2fpurchases-capacitor/11.3.3), [package 14.1.0](https://registry.npmjs.org/@revenuecat%2fpurchases-capacitor/14.1.0), [Gradle du plugin](https://github.com/RevenueCat/purchases-capacitor/blob/11.3.3/android/build.gradle), [versions hybrid-common](https://github.com/RevenueCat/purchases-hybrid-common/blob/17.55.2/android/gradle/libs.versions.toml), [versions Android](https://github.com/RevenueCat/purchases-android/blob/9.29.0/gradle/libs.versions.toml).

**Compatibilité peer vérifiée, compilation intégrée non exécutée.** Le plugin 11.3.3 déclare AGP 8.13.2 ; le projet utilise AGP 8.7.2 et wrapper Gradle 8.11.1. Prévoir AGP 8.13.2 + Gradle 8.13, compile/target 36, JDK 21 déjà demandé par le build Capacitor. AGP 8.13 supporte API 36.1 et exige Gradle 8.13. Tester réellement avant de figer le lockfile ; ne pas forcer une variante `bc7`. [Compatibilité AGP](https://developer.android.com/build/releases/agp-8-13-0-release-notes).

Commandes du futur chantier, **non exécutées pendant l'audit** :

```powershell
npm install --save-exact @revenuecat/purchases-capacitor@11.3.3
npx cap sync android
```

Ne pas modifier manuellement `android/app/capacitor.build.gradle`, généré. Ne pas ajouter simultanément une autre implémentation Billing manuelle.

Contrat SDK 11.3.3, d'après les [définitions TypeScript publiées](https://github.com/RevenueCat/purchases-capacitor/blob/11.3.3/src/definitions.ts) :

```ts
await Purchases.configure({ apiKey: publicAndroidSdkKey, appUserID: serverUserId });
const offerings = await Purchases.getOfferings(); // pas { offerings }
const selected = offerings.current?.annual;     // ou .monthly
if (!selected) throw new Error("Offre indisponible");
const result = await Purchases.purchasePackage({ aPackage: selected });
const active = result.customerInfo.entitlements.active["fw_plus"];
const { customerInfo } = await Purchases.getCustomerInfo();
const restored = await Purchases.restorePurchases(); // { customerInfo }
await Purchases.logIn({ appUserID: serverUserId });   // après connexion
const listenerId = await Purchases.addCustomerInfoUpdateListener(onCustomerInfo);
await Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: listenerId });
```

Ce code illustre les signatures ; `active` sert à rafraîchir l'interface, **pas à autoriser les dépenses du serveur**. Import dynamique après détection native pour éviter SSR et appels dans le navigateur. Configurer une seule fois, traiter annulation utilisateur, achat en attente, erreur réseau, restauration vide, reconnexion et changement de compte. Le logout doit purger la projection du précédent compte ; l'ID serveur doit être opaque et non une adresse e-mail. [Identité RevenueCat](https://www.revenuecat.com/docs/customers/identifying-customers).

### 2.2 Catalogue : lever l'ambiguïté produit / base plan / entitlement

`docs/codex-billing-architecture.md:11` parle de deux SKUs mais la ligne 57 décrit un seul produit `fw_plus` et deux base plans. Ces deux catalogues sont possibles, **ils ne sont pas identiques**.

Pour respecter les SKUs explicitement demandés, proposition si aucun catalogue commercial n'est déjà actif :

| Rôle | Annuel | Mensuel |
|---|---|---|
| Product ID Play / SKU | `fw_plus_annual` | `fw_plus_monthly` |
| Base plan renouvelable | `annual` | `monthly` |
| Période / prix catalogue indicatif | P1Y / 29,99 € TTC | P1M / 4,99 € TTC |
| Offre | `trial-7d`, si éligible | pas d'essai annoncé par défaut |
| Product identifier RevenueCat | `fw_plus_annual:annual` | `fw_plus_monthly:monthly` |
| Offering / package | offering `default`, package `$rc_annual` | offering `default`, package `$rc_monthly` |
| Entitlement partagé | `fw_plus` | `fw_plus` |
| Projection historique | `pro_annual` ou `pro_trial` | `pro_monthly` |

Importer et vérifier les vrais identifiants remontés par RevenueCat ; sélectionner l'objet package retourné, pas reconstruire un objet à partir d'un nom. L'entitlement n'est pas le SKU et n'est pas achetable. Les base plans portent la période et les offres. [Produits Play](https://www.revenuecat.com/docs/getting-started/entitlements/android-products), [entitlements](https://www.revenuecat.com/docs/getting-started/entitlements).

Si le produit unique `fw_plus` existe déjà avec des abonnés, conserver ses IDs et établir un mapping serveur vers les mêmes tiers au lieu de recréer le catalogue. Aucune migration d'abonné ne doit être déduite du présent audit. Pour deux produits distincts, traiter explicitement le remplacement annuel/mensuel avec `googleProductChangeInfo` afin d'éviter un double abonnement.

Prix, devise, période, essai et éligibilité doivent provenir de l'offre native ; les prix codés en dur restent des textes Web/de référence, pas l'autorité au checkout. L'essai se déclenche par l'offre Play, jamais par `startSevenDayFreeTrial()`. Ne promettre un rappel J−2 qu'après validation d'un vrai mécanisme de notification.

### 2.3 Séparation Web / Android, y compris avec serveur distant

`capacitor.config.ts:3,14–19` charge par défaut **le même site distant** dans le binaire. Un build flag Next public seul ne peut donc pas distinguer les utilisateurs Android natifs et Web de ce site partagé.

- Détecter le conteneur natif avec `Capacitor.isNativePlatform()` et `Capacitor.getPlatform() === "android"`. `native-bridge.ts:28–29` inclut l'user-agent Android : **ne pas utiliser ce seul booléen pour le canal commercial**, car Chrome Android doit conserver le parcours Web.
- Distinguer `android_native` de `purchases_available` : si le plugin est absent dans une ancienne app, montrer « achat indisponible / mettre à jour », jamais Stripe comme repli.
- Tant que l'initialisation du canal n'est pas résolue, rendre un état neutre sans carte Fondateur/checkout. Éviter le flash de contenu Stripe SSR/hydratation. Tester le vrai conteneur et une ancienne version du binaire sur le nouveau site.
- Sur Android : achats natifs, restauration, connexion, statut et gestion Play. Aucune promotion Stripe via menu, FAQ, page légale ou lien indirect. La gestion des droits Web peut rester administrative sans upsell externe.
- Sur navigateur Web : checkout/portal Stripe ; aucun appel Purchases natif. Les en-têtes de plateforme ou l'user-agent sont une aide au routage, pas une preuve d'identité ni une protection anti-abus.
- L'origine HTTPS autorisée doit être contrôlée à la construction ; tester un mode hors ligne utile et une indisponibilité du site. Un shell distant n'est pas automatiquement refusé, mais un écran vide ou des fonctions promises indisponibles peuvent l'être.

### 2.4 Serveur, identité et cycle des droits

Créer un identifiant utilisateur stable et une session authentifiée (Web HttpOnly Secure/SameSite ; flux sécurisé adapté au conteneur Android). L'usage local gratuit reste possible. Introduire la connexion pour achat/restauration/synchronisation sans déplacer les mesures corporelles.

Stockage durable requis, **pas une Map de processus Vercel** : utilisateurs, correspondances clients Stripe/RevenueCat, droits par source, événements déjà traités, version de révocation, compteurs et réservations de coût. Un droit contient au moins source, produit, statut, début, échéance, période d'essai, renouvellement, événement/source de vérification. Un utilisateur peut avoir plusieurs droits ; l'annulation d'une source ne doit pas supprimer un autre droit valide.

| Route proposée | Contrat et responsabilité |
|---|---|
| `POST /api/billing/stripe/checkout` | Session authentifiée Web, `{ plan: "pro_annual" | "pro_monthly" | "founder_lifetime" }`. Prix/quantité/devise choisis par allowlist serveur ; annual/monthly en `mode: subscription`, fondateur en `mode: payment`. Retour `{ url }`. CSRF, idempotence, URLs de retour fixes. Aucun droit accordé à ce stade. |
| `POST /api/billing/stripe/portal` | Session authentifiée Web, retrouve le Customer appartenant au compte côté serveur ; retourne l'URL du portail. Aucun Customer ID arbitraire venant du client. |
| `POST /api/billing/stripe/webhook` | Lit le corps brut, vérifie `Stripe-Signature`, déduplique l'event, persiste/traite durablement, puis synchronise le registre. Pas de secret dans `NEXT_PUBLIC_*`. |
| `POST /api/billing/revenuecat/webhook` | Vérifie un secret Authorization configuré dans RevenueCat, app/projet/environnement, ID d'événement et userId ; actualise les droits Play. Ce n'est pas un webhook Stripe signé avec le même mécanisme. |
| `POST /api/billing/sync` | Session requise. Après achat/restauration, relit RevenueCat côté serveur pour **l'identité de session**, jamais un JSON `CustomerInfo` client faisant foi. Utile quand le webhook tarde. |
| `GET /api/billing/entitlement` | Retourne `{ active, tier, source, entitlement: "fw_plus", expiresAt, trialEndsAt, willRenew, version, quotas }` ; `Cache-Control: no-store`. |
| `POST /api/billing/token` | Émet/renouvelle le jeton FWPLUS court après validation du droit de la session. |
| `POST /api/billing/token/verify` | Vérifie signature, audience, dates, identité et révocation ; retourne la projection validée. Ne crée pas un abonnement. |

Stripe doit couvrir `checkout.session.completed` et `checkout.session.async_payment_succeeded`, avec contrôle de `payment_status`, et `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`. Distinguer un vrai essai autorisé d'un paiement incomplet ; gérer remboursements, litiges et signaux de fraude par réconciliation. Résoudre les événements via les objets Stripe et les correspondances serveur ; un retour `success_url` ou un plan envoyé par le client n'est jamais une preuve. [Cycle des abonnements](https://docs.stripe.com/billing/subscriptions/webhooks), [webhooks](https://docs.stripe.com/webhooks), [fulfillment](https://docs.stripe.com/checkout/fulfillment.md?ui=full-page).

Pour RevenueCat : événements d'achat, renouvellement, expiration, annulation, incident de paiement et transfert ; déduplication et relecture de l'état actuel pour les événements désordonnés. Persister avant l'acquittement ou utiliser une file durable. Une annulation d'auto-renouvellement laisse l'accès jusqu'à l'échéance ; un paiement en attente ne l'accorde pas. Respecter les périodes de grâce validées. [Webhooks RevenueCat](https://www.revenuecat.com/docs/integrations/webhooks).

Le Pass Fondateur utilise le SKU Web `fw_founder_5y`, une échéance serveur à **cinq années calendaires**, et une réservation transactionnelle des 1 000 places si ce nombre est maintenu. Garder `founder_lifetime` comme alias technique pour compatibilité, mais ne jamais créer un droit perpétuel ni renouveler ses cinq ans à chaque synchronisation. Le registre backend peut agréger Stripe et Play sans grant promotionnel RevenueCat. Si RevenueCat doit aussi refléter Stripe, choisir explicitement son intégration serveur et tester sa révocation ; ce n'est pas réalisé par le seul SDK Capacitor.

Secrets séparés par environnement : clé Stripe restreinte aux permissions nécessaires, secret webhook Stripe, secret webhook RevenueCat, clé serveur RevenueCat et clé HMAC ; seule la clé **publique SDK Android RevenueCat** peut être distribuée. Pour Stripe Web, confirmer TVA/enregistrements avant `automatic_tax` ; ne pas recopier le net Play dans le modèle Stripe. [Fiscalité Stripe](https://docs.stripe.com/billing/taxes/collect-taxes).

## 3. Jeton portable HMAC-SHA256 : contrat FWPLUS

Le jeton est une **preuve de droit courte**, pas une preuve de paiement indépendante ni un remplacement de l'authentification. Signature commune Web/Android, validation exclusivement serveur.

```text
payload = base64url(UTF8(JSON.stringify(claims)))
message = ASCII("FWPLUS." + payload)
sig     = base64url(HMAC-SHA256(secret[kid], message))
token   = "FWPLUS." + payload + "." + sig
```

Claims proposés (structure illustrative, aucune clé réelle) :

```json
{
  "v": 1,
  "kid": "2026-11-a",
  "iss": "https://followeight.com",
  "aud": "followeight-billing",
  "sub": "opaque-server-user-id",
  "jti": "random-token-id",
  "entitlement": "fw_plus",
  "tier": "pro_annual",
  "source": "google_play",
  "iat": 1794744000,
  "nbf": 1794744000,
  "exp": 1794744900,
  "entitlementExpiresAt": 1826280000,
  "entitlementVersion": 7
}
```

Émettre pour **15 minutes maximum**, avec `exp <= entitlementExpiresAt`; dates réelles issues du fournisseur. La signature couvre exactement les octets du payload encodé, sans re-sérialisation avant vérification. Valider trois segments, taille bornée, base64url canonique, `v`, `kid` dans une petite allowlist, signature de 32 octets avec comparaison constante (`timingSafeEqual` après contrôle de longueur), issuer, audience, `nbf/iat/exp`, entitlement/tiers/sources autorisés, `sub` égal au compte authentifié et version non révoquée. Tolérance d'horloge faible et explicite, par exemple 60 secondes.

Clé aléatoire d'au moins 32 octets côté serveur ; rotation via `kid`, anciennes clés valides seulement pendant la transition. **Jamais de clé HMAC dans l'APK, JavaScript, localStorage ou configuration publique.** HMAC ne permet pas une vérification client sûre sans divulguer le secret. Le client obtient son statut via le serveur ; hors ligne il peut afficher un état mis en cache, mais ne dépense pas de cloud et ne prolonge aucun droit.

Le payload est lisible, pas chiffré : ne mettre ni santé, ni e-mail, ni identifiant de paiement brut. Ne pas transmettre le token dans une URL, un log ou un QR durable. Web : session HttpOnly, jeton éphémère si nécessaire. Android : stockage système protégé si persistance indispensable ; mémoire pour le droit court. Un nouvel appareil s'authentifie puis récupère le même droit. Si un transfert par code est demandé, utiliser un code de liaison distinct, à usage unique et courte durée, lié à l'identité ; pas un jeton FWPLUS public transférable.

Révocation : à expiration/remboursement/suppression/transfert, actualiser le registre et incrémenter la version. Toute route IA recontrôle cette version et l'état courant ; un ancien jeton signé ne maintient pas l'accès à une dépense. Aucun endpoint ne doit signer librement `{ tier }` soumis par le client.

## 4. Compatibilité avec l'existant et `scripts/verify-e2e.mjs`

Failles précises à remplacer sans réécrire les moteurs santé :

- `billing-bridge.ts:135–150` accepte les tiers mensuel/annuel/fondateur sans vérifier d'échéance ; un essai sans date ou date invalide est aussi actif.
- `startSevenDayFreeTrial` et `activatePlanTier` (`212–245`) fabriquent dates et tiers ; `page.tsx:1376–1385` les appelle directement. Ils doivent rester réservés à une démonstration explicitement isolée, sans droit serveur ni accès payant.
- `normalizeSubscriptionForToday` peut conserver la forme des compteurs UI ; `canSendFwAiMessage` et `canRunVisionScan` restent indicatifs. Le serveur calcule le jour et le quota ; changer l'heure du téléphone ou modifier IndexedDB ne doit pas réinitialiser les quotas cloud.
- Garder les cinq tiers et les trois sources historiques pour lire les données existantes. Ajouter une projection serveur/version d'entitlement sans effacer poids, bilans, photos ou conversations. Tout ancien `local_demo` retombe au gratuit pour le cloud jusqu'à preuve d'achat. Migration pure, idempotente, avec sauvegarde/export local.

Le script E2E fait un POST coach **sans authentification** (`147–190`), puis exige seulement **HTTP 200 et `replyFr` de plus de 20 caractères** (`191–218`). Il ne demande ni `provider = openai-fw-ai`, ni `webSearchUsed = true`, ni achat. Il appelle aussi repas, frigo, bilan sanguin, barcode, medical-feed et clé VAPID ; une exécution peut donc utiliser de vraies APIs si l'environnement le permet.

Contrat compatible proposé :

```ts
// Champs existants conservés, mêmes valeurs provider
{
  replyFr: string,
  quickActions: string[],
  provider: "openai-fw-ai" | "clinical-deterministic",
  safetyGuardTriggered: boolean,
  webSearchUsed?: boolean,
  sources?: FwAiWebSource[],
  // Extensions optionnelles, sans rupture
  mode?: "contextual" | "live_web" | "cached_sources" | "deterministic",
  quota?: { remainingMessages: number; remainingWeb: number },
  webUnavailableReason?: string
}
```

Un appel anonyme valide peut recevoir HTTP 200 avec le repli déterministe, sans coût fournisseur et sans accès FW+. Pour obtenir le cloud gratuit, établir une session gratuite bornée ; pour le cloud payant, session + droit vérifié. Ne pas exiger immédiatement un bearer payant de tous les POST existants. Ne jamais ajouter un bypass de production fondé sur l'user-agent E2E, une question spéciale ou une variable publique.

La limite Web atteinte doit produire une réponse contextuelle ou déterministe utile, avec `webSearchUsed: false`, pas casser le contrat. Les erreurs d'entrée restent 400 ; un véritable débit abusif peut retourner 429. Garder les garde-fous santé avant toute dépense, avec protection de débit générale.

Validation du futur chantier :

1. Exécuter le script historique sur un environnement local/QA déterministe connu, vérifier toutes ses assertions (dont VAPID configuré), sans exposer de secret de test en production. Adapter aussi les autres routes payantes si on y ajoute une authentification.
2. Ajouter des tests distincts sur signature falsifiée/expirée/mauvaise audience/autre utilisateur/révocation, rejeu d'événements, compteurs concurrents, anonymat sans dépense et fin d'abonnement. Un PASS du script historique ne prouve aucune de ces propriétés.
3. Sur Play interne : achat éligible/non éligible à l'essai, pending, annulation, renouvellement, échec de paiement/grâce, remboursement, restauration après réinstallation, remplacement de plan, autre appareil, autre compte et retour bancaire.
4. Web → Android et Android → Web : même droit et mêmes quotas, expiration/révocation propagées, aucune seconde facturation créée par la synchronisation.
5. Vérifier les surfaces natives et Web séparément ; tester absence de plugin dans un ancien APK et panne du site. Pas d'effacement IndexedDB après mise à jour.

## 5. Économie IA : coûts vérifiés et calculs reproductibles

### 5.1 Ce que fait actuellement le serveur

`route.ts:77–81` répond sans IA externe en cas de garde-fou. Sinon, avec une clé disponible, le premier essai met systématiquement `web_search_preview` à disposition (`122`), avec contexte `low`, puis retente Chat Completions si échec (`166–190`). **Mettre l'outil à disposition ne prouve pas qu'il a été invoqué** : il faut compter les appels effectivement exécutés. Une question peut entraîner plusieurs appels ; le booléen du parseur (`fw-ai-engine.ts:300–302`) n'est pas un compteur financier.

Manquent côté route : identité, abonnement vérifié, quota journalier, quota Web, limite de coût, taille de question/contexte/historique et borne de sortie. `history.slice(-6)` limite le nombre, pas la longueur. Les timeouts 22 s + 12 s dépassent `maxDuration = 30` si le premier essai consomme tout son délai ; le repli peut donc arriver trop tard et occasionner deux facturations pour une seule réponse visible.

Le modèle par défaut est `gpt-4o-mini`, mais `OPENAI_COACH_MODEL` ou `OPENAI_VISION_MODEL` peut le remplacer. Le coût réel de production n'est pas connu sans configuration effective et mesures d'usage.

### 5.2 Tarifs et hypothèses, sans faux prix forfaitaire

La tarification officielle consultée donne **25 $ / 1 000 appels `web_search_preview` pour les modèles non raisonnants**, soit **0,025 $ par appel outil**, avec contenu de recherche non facturé ; les tokens de prompt/réponse restent à ajouter. `search_context_size: low` ne supprime pas ce forfait. Le nouvel outil `web_search` est une autre tarification, à ne pas confondre avec le preview. [Tarifs OpenAI](https://developers.openai.com/api/docs/pricing).

Pour `gpt-4o-mini` : entrée **0,15 $/million**, sortie **0,60 $/million**. Un exemple à **2 000 tokens d'entrée + 500 de sortie** vaut exactement `2000×0,15/1e6 + 500×0,60/1e6 = 0,0006 $`. C'est un profil de consommation, pas le prix garanti de chaque message. La page modèle le marque actuellement **Deprecated** ; disponibilité et combinaison `Responses + web_search_preview + JSON schema` doivent être testées avec le compte avant lancement. Aucun remplacement de modèle n'a été effectué ici. [Modèle demandé](https://developers.openai.com/api/docs/models/gpt-4o-mini).

Le repli actuel peut masquer une incompatibilité du modèle/outillage. Ne pas confondre `gpt-4o-mini` avec l'ancien modèle distinct `gpt-4o-mini-search-preview` de Chat Completions, arrêté selon la documentation. Une migration vers `web_search` doit faire l'objet de mesures et de tests propres, sans reprendre les mêmes coûts par défaut. [Guide Web Search](https://developers.openai.com/api/docs/guides/tools-web-search).

### 5.3 Revenu net et scénario 80 recherches par jour

Hypothèse commerciale demandée : prix TTC annuel 29,99 €, TVA **20 %**, Play **15 % du HT** :

```text
HT annuel                  = 29,99 / 1,20             = 24,9916667 €
Après Play annuel          = 24,9916667 × 0,85        = 21,2429167 €
Revenu mensuel comptabilisé = 21,2429167 / 12         =  1,7702431 €
```

À TVA belge **21 %**, le résultat est **1,7556129 €/mois**. La TVA dépend du marché ; ce n'est pas un taux UE unique. Le total 15 % est cohérent avec l'abonnement Play : la grille actuelle distingue notamment 10 % de service + 5 % de facturation Play dans certaines régions. Ne pas l'attribuer uniquement à un programme « Small Business < 1 M$ ». [Frais Google Play](https://support.google.com/googleplay/android-developer/answer/112622?hl=en).

Pour garder des unités correctes, poser **r = euros par dollar effectivement facturé**, frais de change inclus. Les exemples de marge ci-dessous prennent **r = 1**, hypothèse de simulation et non cours du jour. Coût EUR = coût USD × r.

| Usage sur 30 jours | Appels | Coût USD, hors Vision/hébergement |
|---|---:|---:|
| 80 recherches Web/j | 2 400 outils | **60,00 $** d'outils seuls |
| Génération de ces 80 réponses/j à 0,0006 $ | 2 400 messages | **1,44 $** supplémentaires |
| Total du scénario | 2 400 réponses avec 1 recherche chacune | **61,44 $** |
| 15 recherches Web/j FW+ | 450 outils | **11,25 $**, avant génération |
| 2 recherches Web/j gratuit | 60 outils | **1,50 $**, avant génération |
| 80 réponses contextuelles/j sans Web | 2 400 messages | **1,44 $** |

À r = 1, **80 recherches/j perdent 59,67 €/mois** avant autres coûts (`1,770243 − 61,44`). Même les outils seuls coûtent environ **34 fois** le revenu mensuel. Sur 365 jours : **730 $ d'outils**, plus **17,52 $** de génération, contre **21,24 €** de revenu annuel net. Le déficit reste massif à r = 0,9.

**Le quota 15 Web/j n'est pas viable comme droit quotidien garanti à ce prix.** Même sans aucune autre dépense, il faudrait 75 €/mois de revenu net pour 85 % de marge sur 11,25 € d'outils ; soit environ 1 270,59 € TTC/an sous les hypothèses ci-dessus. Et **80 messages contextuels/j eux-mêmes ne laissent qu'environ 18,7 % de marge** à r = 1, avant Vision et infrastructure. La formule « illimité jusqu'à 80/j » ne garantit donc pas la marge, même sans Web.

Les scans Vision doivent être comptés séparément à partir de leurs vrais tokens image/texte et modèles ; l'ancien chiffre de 0,003 $/scan n'a pas été validé comme borne. Le code prévoit 80 scans **en plus** des 80 messages. Le coût des comptes gratuits et des essais doit également être financé.

### 5.4 Routeur `shouldEnableLiveWebSearch(question)`

Règle : **le contexte personnel et les connaissances stables n'ont pas besoin d'Internet en direct**. Déclencher pour une demande explicitement actuelle/vérifiable qui nécessite une source fraîche, après filtres santé et contrôle budgétaire. Une classification seule ne suffit jamais à autoriser une dépense.

Pseudo-code proposé, non ajouté à l'app :

```ts
function shouldEnableLiveWebSearch(question: string): boolean {
  const q = normalizeForIntent(question); // accents, espaces, longueur bornée
  if (isOnlyConnectionQuestion(q)) return false; // « es-tu connecté ? »
  if (isPersonalMetricsQuestion(q)) return false; // bilan du jour, macros, poids
  if (isStableNutritionOrTrainingQuestion(q)) return false;
  return asksForCurrentOfficialSource(q)
      || asksForRecentStudyOrGuideline(q)
      || asksForCurrentRestaurantMenuOrProductChange(q);
}
```

Pour une question mixte (« analyse ma journée et vérifie l'étude publiée hier »), séparer les intentions avant ce routage ; ne pas laisser la présence de « ma journée » annuler le besoin de source. Les helpers sont à spécifier avec un jeu de cas ; ce pseudo-code n'est pas une implémentation déjà testée.

| Question / intention | Route |
|---|---|
| « Combien de protéines me reste-t-il ? » / question du script E2E | Contexte local ou modèle sans outil |
| « Pourquoi mon poids varie ? » / « repas riche en protéines » | Connaissances stables + contexte ; pas de recherche automatique |
| « Calories de ce code-barres » | API OpenFoodFacts/cache existant avant une recherche payante |
| « Dernière recommandation HAS publiée cette semaine » | Web si quotas et budget permettent ; source/date affichées |
| « Menu actuel de cette enseigne en Belgique » | Source officielle/cache assez frais, puis Web si nécessaire |
| Urgence, restriction dangereuse | Garde déterministe prioritaire ; aucune recherche |
| « Es-tu connecté à Internet ? » | Réponse honnête sur la capacité disponible, sans dépense de recherche |

Ordre serveur : validation de forme et limite de débit → garde santé → identité/droit/consentement → cache/routeur → réservation atomique de quota **et de coût** → appel borné → contrôle de sortie/citations → rapprochement coût réel → réponse. Pour la route sans Web, **omettre `tools`**, plutôt que compter sur le prompt pour empêcher son utilisation.

Propositions de bornes initiales : question 2 000 caractères, contexte utile sélectionné, historique résumé, entrée max 2 000 tokens si l'on veut conserver l'exemple de coût, sortie max 500 tokens. Vérifier la taille totale incluant instructions ; sinon recalculer le budget. Budget de latence global, par exemple 18 s de cloud + repli déterministe avant 25 s ; mesurer un objectif p95 de 3 s contextuel / 8 s Web, sans le promettre avant mesure. Aucun second appel payant automatique après un timeout de coût incertain.

### 5.5 Comment obtenir réellement 75–85 % de marge

Conserver **2/j gratuit et 15/j FW+ seulement comme plafonds anti-abus instantanés**, combinés à un **plafond financier mensuel prioritaire**. Ils ne sont pas une allocation garantie de recherches fraîches. L'offre commerciale doit le dire clairement avant achat ; on ne peut simultanément promettre 15 recherches fraîches quotidiennes et garantir cette marge à 29,99 €/an.

Pour un abonné annuel (TVA 20 %) :

```text
Budget total de coûts directs pour 85 % de marge = 1,770243 × 0,15 = 0,265536 €/mois
Budget total de coûts directs pour 75 % de marge = 1,770243 × 0,25 = 0,442561 €/mois

C = r × (0,025 × N_web + coût_tokens_réel + coût_vision_réel)
    + hébergement + RevenueCat + autres coûts directs alloués
    + quote-part gratuit/essais/remboursements

N_web admissible = floor((budget_total − coûts_déjà_engagés − réserve_autres) / (0,025 × r))
```

Exemples **conditionnels**, r = 1, générations totales incluant celles des recherches, autres coûts directs réellement contenus dans 0,05 € :

| Profil / allocation mensuelle | Coût total | Marge calculée |
|---|---:|---:|
| 120 générations contextuelles à 0,0006 $ + 5 outils Web + réserve 0,05 € | **0,247 €** | **86,05 %** |
| 300 générations à 0,0006 $ + 8 outils Web + réserve 0,05 € | **0,430 €** | **75,71 %** |

Ces exemples ne prouvent pas que 0,05 € suffit aux autres services. Si Vision, gratuits, frais ou change consomment davantage, l'allocation IA doit baisser. Une marge comptable garantie demande la mesure de **tous** ces postes ; aucune affirmation « 85 % garanti » ne doit précéder cette instrumentation.

Implémentation proposée :

- Registre atomique partagé par compte, tous appareils/canaux ; jour serveur fixe documenté (UTC), fenêtre mensuelle de droit, pas l'horloge client. Réserver la pire dépense admise avant l'appel. Débit court, concurrence et budget global fournisseur en plus.
- Compter les vrais `web_search_call` et les tokens retournés, pas les seuls messages ni `sources.length`. Borner un appel à un outil lorsqu'une option telle que `max_tool_calls: 1` est validée pour la combinaison API, sinon utiliser une orchestration explicitement bornée. Conserver une réserve pour coûts inconnus après timeout.
- Cache de recherche **publique** par intention normalisée/pays/langue/date avec TTL adapté ; ne jamais mutualiser les métriques ou réponses privées. Une source en cache ne doit pas être présentée comme recherchée à l'instant. Le taux de cache réduit un coût moyen, il ne garantit pas un pire cas.
- Quand le budget Web est épuisé : réponse contextuelle utile avec « recherche en direct indisponible pour le moment ». Quand le budget cloud est épuisé : moteur déterministe local/serveur. Pas de recherche payante discrète en repli.
- Gratuit : 2/j maximum, plus enveloppe d'acquisition globale stricte et protection contre créations multiples de comptes. À revenu nul, sa marge individuelle n'est pas positive. Essai et Pass Fondateur nécessitent leurs propres allocations basées sur leur revenu net reconnu ; le Pass cinq ans rapporte moins mensuellement que l'annuel.
- Journaliser métadonnées minimales : route, nombre d'outils, tokens, coût estimé/réconcilié, latence, motif de repli, identifiant pseudonyme. Alerter avant 75 % et 90 % du budget, arrêt des appels à 100 %. Ne pas journaliser le contexte santé ou le jeton.

## 6. Ordre d'exécution et critères de lancement

| Lot | Travail limité | Critère de sortie |
|---|---|---|
| A | API 36/Gradle, permissions minimales, fonctionnalités annoncées | AAB signé inspecté, manifeste fusionné cohérent, parcours Android réels utilisables. |
| B | Privacy/terms/suppression, consentement et signalement, déclaration santé | URLs 200 lisibles, réception d'un vrai rapport de test, suppression testée, fiche et Data safety alignées. |
| C | Comptes, registre de droits, Stripe/RevenueCat, FWPLUS | Achat/restore/expiration/refund/transfert validés en environnements de test, aucun droit attribué par le client. |
| D | Routeur IA, limites serveur et budgets | Pas de dépense pour un POST anonyme ; budgets atomiques impossibles à dépasser par parallélisme ; coûts rapprochés. |
| E | Non-régression et soumission | Script E2E compatible + nouveaux tests sécurité/paiement + tests Android ; dossier reviewer exact et absence de texte Stripe natif. |

Ne pas appliquer automatiquement « 12 testeurs / 14 jours » à tous les comptes : contrôler les exigences effectivement attachées au compte Play et au type de publication. La mission n'a pas consulté ce compte et n'a aucune preuve que ces étapes sont déjà satisfaites.

## 7. Vérification réalisée et limites

- Lectures des neuf fichiers demandés, imports/appelants utiles, variables Gradle et lockfile ; URLs officielles et métadonnées npm/GitHub consultées en lecture seule.
- GET `/privacy`, `/terms`, `/delete-account` : **404, 404, 404** le 15 novembre 2026.
- `node --check scripts/verify-e2e.mjs` : **PASS**.
- `node node_modules/vitest/vitest.mjs run tests/fw-ai-web-connected.test.ts tests/qc-health-control.test.ts` : **2 fichiers, 9 tests PASS**, à 12:55 heure de Bruxelles. Cela vérifie les gardes/parsing existants, pas la facturation future ni une efficacité médicale.
- Calculs économiques reproduits avec Node, sans fournisseur IA ; valeurs exposées dans la section 5.
- **Pas de lancement complet de `verify-e2e.mjs`** : il peut appeler des routes payantes. Pas de build Gradle, achat, création de produits, modification Console, accès aux secrets, déploiement ou publication pendant cet audit. Compatibilité native finale et état des comptes restent à vérifier lors du chantier.
- État Git initial : `?? docs/play-store-launch/`, avec `README.md` préexistant. Ce rapport n'efface ni ne remplace ce travail.
- Contrôle final SHA-256 : **10/10 fichiers protégés inchangés**, neuf fichiers demandés et script E2E compris. `git diff --check` : **PASS** ; aucun changement de fichier suivi détecté. Le rapport est le nouveau livrable documentaire.
- Relecture bornée Antigravity via agent-mesh : job **`646823f3-a0de-46ac-8597-f83dcf924a4d`**, terminé le **15 novembre 2026 à 11:58:47 UTC**, résultat récupéré. Reçu local : `D:/node animaze/node_app/data/agent-mesh/jobs/646823f3-a0de-46ac-8597-f83dcf924a4d/response.txt`. Le lecteur confirme zéro modification et zéro RunPod utilisé. Ses constats sur permissions, signalement, discours Stripe et calculs ont été recoupés ; ses formulations de « rejet certain » et généralisations géographiques ne sont pas reprises comme un avis officiel de Console.

### Empreintes de référence des fichiers protégés

SHA-256 relevés avant rédaction ; à utiliser pour vérifier que la mission est restée documentaire :

| Fichier | SHA-256 |
|---|---|
| `android/app/src/main/AndroidManifest.xml` | `2332bc6199db1a13e6bef6a96d01386501941fec5417c1d56b9d3ba16f35570a` |
| `android/app/build.gradle` | `e7995c66fdd85470e27585578ff84ab50441ee1a2fcc50f5a58c0eb7d770a2fb` |
| `capacitor.config.ts` | `a2e80f6d1f008acdb50cc7a21576e3782171ed5736b702a631a7b3f52254539e` |
| `package.json` | `5b3619198a0efcc1c37219290b602d4804dbaabfba0a72d43a2d15d34322cf93` |
| `src/lib/billing-bridge.ts` | `707730e53bb68f9d7ab18e9c61e802e7bcdc42a53f05473ded059e4d7ef00cd6` |
| `src/components/SubscriptionModal.tsx` | `bcb79c6a20c68ca46ab0669f889d50cc0bf812668d8c3a503a650e3ef927cd11` |
| `src/app/api/fw-ai/route.ts` | `2a4d59c88fe15db522eb03e8a4864f487df8d19f851d368a09d959c3176602f0` |
| `src/lib/fw-ai-engine.ts` | `d44cee9f11cd1a3b7831ef45276d291717740c01f8f1f182f816e8c0677af0ab` |
| `docs/codex-billing-architecture.md` | `c5605c898599f7b5dbc519733893ce03f7ef1dce398e137704e32c653c7d840b` |
| `scripts/verify-e2e.mjs` | `05eef5cd0d477c98f233d2e804d3bee05e342e47d05045641e0340fe3fcc61e2` |
