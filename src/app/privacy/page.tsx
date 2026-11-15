import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Politique de confidentialité — FolloWeight",
  description:
    "Protection des données personnelles, stockage local IndexedDB, IA transparente et conformité Google Play Data Safety pour FolloWeight (followeight.com).",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à FolloWeight
          </Link>
          <span className="text-[11px] text-slate-400">
            Mise à jour : 15 novembre 2026
          </span>
        </div>

        <article className="vp-card p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-slate-200">
          <header className="space-y-2 border-b border-slate-800 pb-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Privacy-First · RGPD &amp; Google Play Data Safety
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Politique de confidentialité de FolloWeight
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Application &amp; service Web <strong>FolloWeight</strong> ({" "}
              <code className="text-emerald-300">com.followeight.app</code> ·{" "}
              <code className="text-emerald-300">followeight.com</code>) édités par Maison Mercier.
            </p>
          </header>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">
              1. Données stockées 100 % localement sur votre appareil
            </h2>
            <p>
              Par conception, FolloWeight privilégie une architecture{" "}
              <strong>local-first</strong> via votre base locale{" "}
              <code className="text-emerald-300">IndexedDB (vitalpulse_idb)</code> et{" "}
              <code className="text-emerald-300">localStorage</code> :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>
                Profil anthropométrique (prénom/pseudo, date de naissance, sexe, taille, poids, objectifs),
              </li>
              <li>
                Journal des repas, hydratation, pesées (courbe EMA), mensurations US Navy, séances sportives et minuteur de jeûne/OMAD,
              </li>
              <li>
                <strong>Photos d&apos;évolution corporelle :</strong> enregistrées exclusivement en local sur votre appareil et jamais transmises à des serveurs tiers,
              </li>
              <li>
                Valeurs saisies de bilans sanguins et préférences d&apos;affichage (thème clair/sombre).
              </li>
            </ul>
            <p className="text-xs text-slate-400">
              Aucune régie publicitaire, aucun traceur tiers et aucune revente de données personnelles ne sont intégrés dans FolloWeight.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">
              2. Traitements IA &amp; API externes à votre initiative
            </h2>
            <p>
              Lorsque vous déclenchez volontairement une fonctionnalité d&apos;analyse IA (Coach{" "}
              <strong>FW AI</strong>, <strong>Scanner Plat</strong> ou <strong>Frigo &amp; Recettes</strong>), une requête chiffrée HTTPS est transmise temporairement à l&apos;API OpenAI uniquement pour produire votre réponse. Ces requêtes API ne sont pas utilisées pour entraîner des modèles publics.
            </p>
            <p>
              Le lecteur de code-barres interroge la base publique{" "}
              <strong>OpenFoodFacts</strong> à partir du code-barres scanné. La caméra n&apos;est activée que sur action explicite de votre part (scan code-barres, assiette ou frigo).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">
              3. Abonnements &amp; Paiements (FW+)
            </h2>
            <p>
              Sur l&apos;application Android Google Play, la facturation et le renouvellement de{" "}
              <strong>FolloWeight Plus (FW+)</strong> sont gérés exclusivement par{" "}
              <strong>Google Play Billing</strong> via RevenueCat (identifiant anonyme d&apos;installation). Sur le site{" "}
              <code className="text-emerald-300">followeight.com</code>, les paiements Web sont traités par{" "}
              <strong>Stripe</strong>. FolloWeight ne stocke aucun numéro de carte bancaire.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">
              4. Vos droits RGPD, conservation &amp; suppression
            </h2>
            <p>
              Conformément au RGPD (UE 2016/679), vous disposez d&apos;un droit d&apos;accès, de rectification, de portabilité et d&apos;effacement. Vous pouvez supprimer instantanément 100 % de vos données locales depuis notre page dédiée :{" "}
              <Link
                href="/delete-account"
                className="font-semibold text-emerald-300 underline"
              >
                Supprimer mes données et mon compte
              </Link>
              .
            </p>
            <p className="text-xs text-slate-400">
              Contact DPO / Support confidentialité :{" "}
              <a
                href="mailto:support@followeight.com"
                className="text-emerald-300 underline"
              >
                support@followeight.com
              </a>
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
